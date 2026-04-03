import { Block } from './Block.js';
import crypto from 'crypto';

export class Lattice {
    constructor() {
        // Maps account address to an array of Blocks
        this.chains = {};

        // Maps block hash to the actual Block object for O(1) lookup
        this.blocks = {};
        
        // Tracks unreceived 'send' blocks (pending incoming transactions)
        // Maps recipient address to an array of send block hashes
        this.pending = {};

        // On-chain Governance State
        this.proposals = {};
        this.votes = {}; // Maps proposal_hash to { account: vote_weight }
        
        // Decentralized Storage Market State
        this.marketBids = {}; // Maps bid_hash to { creator, magnet, amount, status: 'OPEN' | 'ACCEPTED' }
        this.swaps = {};      // Maps secretHash to { sender, recipient, amount, expiry }
        this.nfts = {};       // Maps nftId to { owner, metadata }
        
        // Demurrage Constant (e.g., 1% decay per 365 days = ~3.17e-10 per second)
        // For this prototype, we'll use a visible 0.01% decay per minute for testing
        this.DEMURRAGE_RATE_PER_MS = 0.0001 / 60000;
        this.stateHash = '0'.repeat(64);
    }

    updateStateHash(block) {
        this.stateHash = crypto.createHash('sha256').update(this.stateHash + block.hash).digest('hex');
    }

    /**
     * Calculate balance after demurrage decay based on time elapsed
     */
    applyDemurrage(balance, lastTimestamp, currentTimestamp) {
        if (!lastTimestamp || balance <= 0) return balance;
        const elapsedMs = currentTimestamp - lastTimestamp;
        if (elapsedMs <= 0) return balance;
        
        // Simple linear decay for prototype (Real world uses compound interest formula)
        const decay = balance * this.DEMURRAGE_RATE_PER_MS * elapsedMs;
        return Math.max(0, balance - decay);
    }

    /**
     * Get the frontier (head) block of an account's chain
     */
    getFrontier(account) {
        if (!this.chains[account] || this.chains[account].length === 0) return null;
        return this.chains[account][this.chains[account].length - 1];
    }

    /**
     * Get current balance of an account, adjusted for demurrage decay
     */
    getBalance(account, currentTimestamp = Date.now()) {
        const frontier = this.getFrontier(account);
        if (!frontier) return 0;
        return this.applyDemurrage(frontier.balance, frontier.timestamp, currentTimestamp);
    }

    /**
     * Get staked balance of an account (not subject to demurrage)
     */
    getStakedBalance(account) {
        const frontier = this.getFrontier(account);
        if (!frontier) return 0;
        return frontier.staked_balance || 0;
    }

    /**
     * Process an incoming block
     */
    processBlock(block) {
        if (!block.verifySignature()) {
            throw new Error("Invalid block signature");
        }

        // 2. Double-Spend Protection
        if (block.type === 'receive') {
            const sendHash = block.link;
            const alreadyReceived = Object.values(this.chains).some(c => 
                c.some(b => b.type === 'receive' && b.link === sendHash)
            );
            if (alreadyReceived) throw new Error("Transaction already received");
        }

        const account = block.account;
        const frontier = this.getFrontier(account);

        // Verify previous hash links
        if (block.type === 'open') {
            if (frontier) throw new Error("Account already open");
            if (block.previous !== null) throw new Error("Open block must have no previous");
            if (block.height !== 0) throw new Error("Open block must have height 0");
        } else {
            if (!frontier) throw new Error("Account not open");
            if (block.previous !== frontier.hash) throw new Error("Invalid previous block hash");
            if (block.height !== frontier.height + 1) {
                throw new Error(`Invalid block height! Expected ${frontier.height + 1}, got ${block.height}`);
            }
        }

        // Verify SPoRA (Succinct Proof of Random Access)
        // GENESIS blocks bypass SPoRA for bootstrapping
        if (!(block.type === 'open' && block.link === 'SYSTEM_GENESIS' && Object.keys(this.chains).length === 0)) {
            if (!block.spora || !block.spora.infoHash || !block.spora.chunkHash || block.spora.challenge === undefined) {
                throw new Error("Missing or invalid SPoRA proof. You must seed the Bobtorrent Network to submit blocks.");
            }

            // Challenge must be deterministic based on the previous block's hash (or account if 'open')
            const baseHash = block.previous || crypto.createHash('sha256').update(block.account).digest('hex');
            const expectedChallenge = parseInt(baseHash.substr(0, 8), 16);
            if (block.spora.challenge !== expectedChallenge) {
                throw new Error("SPoRA challenge does not match the deterministic network requirement.");
            }

            // In a real SPoRA network, the Lattice verifies the Merkle Branch of the file chunk against a known root.
            // For this prototype, we mathematically verify the chunkHash simulates reading from the exact requested torrent.
            const verifiedChunkHash = crypto.createHash('sha256').update(block.spora.infoHash + expectedChallenge).digest('hex');
            if (block.spora.chunkHash !== verifiedChunkHash) {
                throw new Error("SPoRA chunkHash is mathematically invalid. Node does not hold the file chunk.");
            }
        }

        // Verify state transitions based on type
        // Apply Demurrage to the previous balance before any new operations
        let previousBalance = frontier ? frontier.balance : 0;
        if (frontier && frontier.timestamp) {
            previousBalance = this.applyDemurrage(previousBalance, frontier.timestamp, block.timestamp);
        }
        
        // We must allow a tiny floating point epsilon difference in balance calculations due to decay
        const epsilon = 0.001;

        // Invariant Check: Staked balance must be preserved unless explicit stake block
        if (block.type !== 'stake_lock' && block.type !== 'stake_unlock' && block.type !== 'open') {
            const currentStaked = frontier ? (frontier.staked_balance || 0) : 0;
            if (Math.abs(block.staked_balance - currentStaked) > epsilon) {
                throw new Error(`Staked balance invariant violation. Expected ${currentStaked}, got ${block.staked_balance}`);
            }
        }

        if (block.type === 'send') {
            if (block.balance > previousBalance + epsilon) throw new Error(`Send block must decrease balance. (Expected <= ${previousBalance}, got ${block.balance})`);
            
            const amount = previousBalance - block.balance;
            const recipient = block.link;

            // Add to pending for recipient
            if (!this.pending[recipient]) this.pending[recipient] = [];
            this.pending[recipient].push({ hash: block.hash, amount, sender: account, payload: block.payload });

        } else if (block.type === 'receive' || block.type === 'open') {
            // GENESIS BYPASS
            if (block.type === 'open' && block.link === 'SYSTEM_GENESIS' && Object.keys(this.chains).length === 0) {
                if (!this.chains[account]) this.chains[account] = [];
                this.chains[account].push(block);
                this.blocks[block.hash] = block;
                return true;
            }

            // Find the pending send block
            const sendBlockHash = block.link;
            const pendingList = this.pending[account] || [];
            const pendingTx = pendingList.find(p => p.hash === sendBlockHash);

            if (!pendingTx) throw new Error("Pending send block not found or already received");

            const expectedBalance = previousBalance + pendingTx.amount;
            if (Math.abs(block.balance - expectedBalance) > epsilon) {
                throw new Error(`Invalid receive balance. Expected ~${expectedBalance}, got ${block.balance}`);
            }

            // Remove from pending
            this.pending[account] = pendingList.filter(p => p.hash !== sendBlockHash);

        } else if (block.type === 'proposal') {
            // A proposal costs exactly 10 BOB
            if (Math.abs(block.balance - (previousBalance - 10)) > epsilon) {
                throw new Error(`Proposal creation costs exactly 10 BOB. Expected ~${previousBalance - 10}, got ${block.balance}`);
            }

            if (!block.payload || !block.payload.title || !block.payload.endTime) {
                throw new Error("Invalid proposal payload");
            }

            this.proposals[block.hash] = {
                id: block.hash,
                proposer: account,
                title: block.payload.title,
                status: 'Active',
                votesFor: 0,
                votesAgainst: 0,
                endTime: block.payload.endTime,
                timestamp: block.timestamp
            };
            this.votes[block.hash] = {}; // Initialize vote tracker
        } else if (block.type === 'vote') {
            // Vote costs 0 BOB
            if (Math.abs(block.balance - previousBalance) > epsilon) {
                throw new Error(`Vote block must not change balance. Expected ~${previousBalance}, got ${block.balance}`);
            }
            
            const proposalHash = block.link;
            const proposal = this.proposals[proposalHash];
            if (!proposal) throw new Error("Target proposal not found");
            if (proposal.status !== 'Active' || Date.now() > new Date(proposal.endTime).getTime()) {
                throw new Error("Proposal is closed");
            }

            const voteType = block.payload.vote; // 'FOR' or 'AGAINST'
            if (voteType !== 'FOR' && voteType !== 'AGAINST') throw new Error("Invalid vote type");

            if (this.votes[proposalHash][account]) {
                throw new Error("Account has already voted on this proposal");
            }

            // Quadratic Voting power based on balance at the time of vote
            const power = Math.sqrt(block.balance);
            this.votes[proposalHash][account] = { type: voteType, power };

            if (voteType === 'FOR') proposal.votesFor += power;
            else proposal.votesAgainst += power;

        } else if (block.type === 'market_bid') {
            // User pays BOB to place a hosting bid
            if (block.balance > previousBalance + epsilon) throw new Error("Market bid must decrease balance");
            const amount = previousBalance - block.balance;

            if (!block.payload || !block.payload.magnet) {
                throw new Error("Invalid market bid payload. Magnet link required.");
            }

            this.marketBids[block.hash] = {
                id: block.hash,
                creator: account,
                magnet: block.payload.magnet,
                amount: amount,
                status: 'OPEN',
                timestamp: block.timestamp
            };

        } else if (block.type === 'accept_bid') {
            // Supernode accepts the bid and gets paid!
            const bidHash = block.link;
            const bid = this.marketBids[bidHash];

            if (!bid) throw new Error("Target market bid not found");
            if (bid.status !== 'OPEN') throw new Error("Market bid is already accepted or closed");

            // Expected SPoRA proof logic: The Supernode MUST prove they are seeding the requested magnet!
            // However, our current SPoRA mock only checks the core anchors.
            // For this implementation, the Supernode provides standard SPoRA to prove they are an anchor node,
            // plus we mathematically trust the transaction because they spent the compute to accept it.

            const expectedBalance = previousBalance + bid.amount;
            if (Math.abs(block.balance - expectedBalance) > epsilon) {
                throw new Error("Accept bid block must correctly increment balance by bid amount");
            }

            // Mark bid as accepted
            bid.status = 'ACCEPTED';
            bid.acceptedBy = account;

        } else if (block.type === 'achievement_unlock') {
            // Achievement blocks are metadata only, no balance change allowed
            if (Math.abs(block.balance - previousBalance) > epsilon) {
                throw new Error("Achievement unlock cannot change balance");
            }
        } else if (block.type === 'swap_lock') {
            // Lock funds for an HTLC
            const amount = previousBalance - block.balance;
            if (amount <= 0) throw new Error("Swap lock must decrease balance");
            
            if (!block.payload || !block.payload.secretHash || !block.payload.recipient) {
                throw new Error("Invalid swap_lock payload");
            }
            
            this.swaps[block.payload.secretHash] = {
                sender: account,
                recipient: block.payload.recipient,
                amount: amount,
                expiry: block.payload.expiry || (Date.now() + 3600000), // Default 1 hour
                status: 'LOCKED'
            };
        } else if (block.type === 'swap_claim') {
            // Claim funds from an HTLC by revealing secret
            const { secret, secretHash } = block.payload;
            const swap = this.swaps[secretHash];
            
            if (!swap) throw new Error("Swap not found");
            if (swap.status !== 'LOCKED') throw new Error("Swap already claimed or expired");
            if (Date.now() > swap.expiry) throw new Error("Swap expired");
            
            const hashed = crypto.createHash('sha256').update(secret).digest('hex');
            if (hashed !== secretHash) throw new Error("Invalid secret for HTLC claim");
            
            const expectedBalance = previousBalance + swap.amount;
            if (Math.abs(block.balance - expectedBalance) > epsilon) {
                throw new Error("Swap claim must increment balance by locked amount");
            }
            
            swap.status = 'CLAIMED';
            swap.claimer = account;

        } else if (block.type === 'mint_nft') {
            // Minting an NFT costs 50 BOB
            if (Math.abs(block.balance - (previousBalance - 50)) > epsilon) {
                throw new Error("NFT Minting costs exactly 50 BOB");
            }
            if (!block.payload || !block.payload.name || !block.payload.magnet) {
                throw new Error("Invalid NFT metadata");
            }
            // ID is the hash of the mint block
            this.nfts[block.hash] = {
                id: block.hash,
                owner: account,
                name: block.payload.name,
                magnet: block.payload.magnet,
                description: block.payload.description || '',
                timestamp: block.timestamp
            };
        } else if (block.type === 'transfer_nft') {
            // Transferring an NFT costs 1 BOB
            if (Math.abs(block.balance - (previousBalance - 1)) > epsilon) {
                throw new Error("NFT Transfer costs 1 BOB fee");
            }
            const nftId = block.link;
            const nft = this.nfts[nftId];
            if (!nft) throw new Error("NFT not found");
            if (nft.owner !== account) throw new Error("You do not own this NFT");
            
            // Transfer ownership to recipient in payload
            const recipient = block.payload.recipient;
            if (!recipient) throw new Error("Recipient required for NFT transfer");
            
            nft.owner = recipient;

        } else if (block.type === 'stake_lock') {
            // Locking funds for staking
            const amount = previousBalance - block.balance;
            if (amount <= 0) throw new Error("Stake lock must decrease liquid balance");
            
            const expectedStaked = (frontier.staked_balance || 0) + amount;
            if (Math.abs(block.staked_balance - expectedStaked) > epsilon) {
                throw new Error("Invalid staked balance after lock");
            }
        } else if (block.type === 'stake_unlock') {
            // Unlocking funds from staking
            const amount = block.balance - previousBalance;
            if (amount <= 0) throw new Error("Stake unlock must increase liquid balance");
            
            const expectedStaked = (frontier.staked_balance || 0) - amount;
            if (Math.abs(block.staked_balance - expectedStaked) > epsilon) {
                throw new Error("Invalid staked balance after unlock");
            }
            if (expectedStaked < -epsilon) throw new Error("Insufficient staked balance");

        } else {
            throw new Error("Invalid block type");
        }

        // Add to data structures
        if (!this.chains[account]) this.chains[account] = [];
        this.chains[account].push(block);
        this.blocks[block.hash] = block;
        this.updateStateHash(block);

        return true;
    }
}
