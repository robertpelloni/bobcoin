import { Block } from './Block.js';
import crypto from 'crypto';

export class Lattice {
    constructor() {
        this.chains = {};
        this.blocks = {};
        this.pending = {};
        this.proposals = {};
        this.votes = {};
        this.marketBids = {};
        this.swaps = {};
        this.nfts = {};
        this.anchors = {};
        this.multisigs = {};
        this.trustScores = {};
        this.identities = {};
        this.balances = {};
        this.DEMURRAGE_RATE_PER_MS = 0.0001 / 60000;
        this.stateHash = '0'.repeat(64);
        this.merkleRoot = '0'.repeat(64);
        this.storageFeeBase = 1.0;
        this.proposalFee = 10.0;
        this.nftMintFee = 50.0;
        this.totalSupply = 0;
        this.pools = {
            'BOB/sSOL': {
                assetA: 'BOB', assetB: 'sSOL',
                reserveA: 10000, reserveB: 420, totalShares: 1000
            }
        };
    }

    /**
     * Updates the incremental state hash and recalculates the Merkle Root.
     * The stateHash provides a rolling integrity check of the block sequence,
     * while the MerkleRoot provides a god-hash of all account states at this height.
     */
    updateStateHash(block) {
        this.stateHash = crypto.createHash('sha256').update(this.stateHash + block.hash).digest('hex');
        this.merkleRoot = this.calculateMerkleRoot();
    }

    /**
     * Computes a binary Merkle Tree over the current state of all chains.
     * This allows for succinct verification of account balances and height by light clients.
     */
    calculateMerkleRoot() {
        const stateEntries = [];
        for (const [account, chain] of Object.entries(this.chains)) {
            if (chain.length === 0) continue;
            const head = chain[chain.length - 1];
            const entryData = account + head.balance.toString() + head.staked_balance.toString() + head.height.toString();
            const h = crypto.createHash('sha256').update(entryData).digest('hex');
            stateEntries.push(h);
        }
        if (stateEntries.length === 0) return '0'.repeat(64);
        stateEntries.sort();
        const buildRoot = (hashes) => {
            if (hashes.length === 1) return hashes[0];
            const nextLevel = [];
            for (let i = 0; i < hashes.length; i += 2) {
                if (i + 1 < hashes.length) {
                    const combined = crypto.createHash('sha256').update(hashes[i] + hashes[i+1]).digest('hex');
                    nextLevel.push(combined);
                } else { nextLevel.push(hashes[i]); }
            }
            return buildRoot(nextLevel);
        };
        return buildRoot(stateEntries);
    }

    getStateSnapshot() {
        return {
            chains: this.chains, blocks: this.blocks, pending: this.pending,
            proposals: this.proposals, votes: this.votes, marketBids: this.marketBids,
            swaps: this.swaps, nfts: this.nfts, anchors: this.anchors, multisigs: this.multisigs,
            pools: this.pools, balances: this.balances, totalSupply: this.totalSupply,
            stateHash: this.stateHash, timestamp: Date.now()
        };
    }

    loadStateSnapshot(snapshot) {
        this.chains = snapshot.chains || {}; this.blocks = snapshot.blocks || {};
        this.pending = snapshot.pending || {}; this.proposals = snapshot.proposals || {};
        this.votes = snapshot.votes || {}; this.marketBids = snapshot.marketBids || {};
        this.swaps = snapshot.swaps || {}; this.nfts = snapshot.nfts || {};
        this.anchors = snapshot.anchors || {}; this.multisigs = snapshot.multisigs || {};
        this.pools = snapshot.pools || this.pools; this.balances = snapshot.balances || {};
        this.totalSupply = snapshot.totalSupply || 0; this.stateHash = snapshot.stateHash || '0'.repeat(64);
    }

    /**
     * Applies the systemic demurrage (decay) to a balance over a time period.
     * Demurrage ensures BOB is used as a medium of exchange rather than a
     * long-term store of value, incentivizing circulation and financing the oracle network.
     */
    applyDemurrage(balance, lastTimestamp, currentTimestamp) {
        if (!lastTimestamp || balance <= 0) return balance;
        const elapsedMs = currentTimestamp - lastTimestamp;
        if (elapsedMs <= 0) return balance;
        const decay = balance * this.DEMURRAGE_RATE_PER_MS * elapsedMs;
        return Math.max(0, balance - decay);
    }

    getFrontier(account) {
        if (!this.chains[account] || this.chains[account].length === 0) return null;
        return this.chains[account][this.chains[account].length - 1];
    }

    getBalance(account, currentTimestamp = Date.now()) {
        const frontier = this.getFrontier(account);
        if (!frontier) return 0;
        return this.applyDemurrage(frontier.balance, frontier.timestamp, currentTimestamp);
    }

    getStakedBalance(account) {
        const frontier = this.getFrontier(account);
        if (!frontier) return 0;
        return frontier.staked_balance || 0;
    }

    refreshProposalStatusesAt(atMs) {
        for (const proposal of Object.values(this.proposals)) {
            if (!proposal) continue;
            if (proposal.status === 'Active' && proposal.endTime) {
                const parsedEndTime = new Date(proposal.endTime).getTime();
                if (!Number.isNaN(parsedEndTime) && atMs >= parsedEndTime) {
                    proposal.status = proposal.votesFor > proposal.votesAgainst ? 'Passed' : 'Rejected';
                }
            }
            if (proposal.status === 'Passed' && !proposal.executed) {
                const parsedEndTime = new Date(proposal.endTime).getTime();
                const enactmentDelay = proposal.enactmentDelay || 0;
                if (atMs >= parsedEndTime + enactmentDelay) {
                    this.executeProposalAction(proposal);
                }
            }
        }
    }

    refreshMarketStatusesAt(atMs) {
        for (const bid of Object.values(this.marketBids)) {
            if (!bid) continue;
            if (bid.status === 'OPEN' && bid.expiry && atMs > bid.expiry) {
                bid.status = 'EXPIRED';
            } else if (bid.status === 'ACCEPTED') {
                if (bid.acceptedTimestamp && atMs > bid.acceptedTimestamp + 3600000) {
                    bid.status = 'FAILED';
                    const target = bid.acceptedBy;
                    const penalty = 5.0 + Math.min(25.0, (bid.amount || 0) / 20.0);
                    const current = this.getTrustScore(target);
                    this.trustScores[target] = Math.max(0, current - penalty);
                }
            }
        }
    }

    executeProposalAction(proposal) {
        if (proposal.executed) return;
        proposal.executed = true;
        const action = proposal.action;
        if (action === 'MINT_TREASURY') {
            const { target, amount } = proposal;
            if (target && amount > 0) {
                if (!this.pending[target]) this.pending[target] = [];
                this.pending[target].push({ hash: proposal.id, amount, sender: 'GOVERNANCE_TREASURY' });
            }
        } else if (action === 'UPDATE_DEMURRAGE') {
            const { rate } = proposal;
            if (rate !== undefined && rate >= 0) this.DEMURRAGE_RATE_PER_MS = rate;
        } else if (action === 'ADJUST_FEES') {
            if (proposal.proposalFee !== undefined) this.proposalFee = proposal.proposalFee;
            if (proposal.nftMintFee !== undefined) this.nftMintFee = proposal.nftMintFee;
            if (proposal.storageFeeBase !== undefined) this.storageFeeBase = proposal.storageFeeBase;
        } else if (action === 'POOL_REBALANCE') {
            const { pair, reserveA, reserveB } = proposal;
            const pool = this.pools ? this.pools[pair] : null;
            if (pool && reserveA > 0 && reserveB > 0) {
                pool.reserveA = reserveA; pool.reserveB = reserveB;
            }
        } else if (action === 'SLASH_REPUTATION') {
            const { target, amount } = proposal;
            if (target && amount > 0) {
                const current = this.getTrustScore(target);
                this.trustScores[target] = Math.max(0, current - amount);
            }
        }
    }

    getStakingRewardRate() { return 0.05 / (365 * 24 * 60 * 60 * 1000); }
    getTrustScore(account) { return (this.trustScores && this.trustScores[account] !== undefined) ? this.trustScores[account] : 100.0; }
    getFeeMultiplier(account) { return 1.0 + (100.0 - this.getTrustScore(account)) / 50.0; }

    /**
     * Core Consensus Engine: Processes a single block and updates the ledger state.
     * Performs strict validation for continuity, signatures, SPoRA, and balance invariants.
     */
    processBlock(block) {
        if (!block.verifySignature()) throw new Error("Invalid signature");
        if (block.type === 'receive') {
            const sendHash = block.link;
            const alreadyReceived = Object.values(this.chains).some(c => c.some(b => b.type === 'receive' && b.link === sendHash));
            if (alreadyReceived) throw new Error("Already received");
        }
        const account = block.account;
        const frontier = this.getFrontier(account);
        if (block.type === 'open') {
            if (frontier) throw new Error("Already open");
            if (block.previous !== null || block.height !== 0) throw new Error("Invalid open");
        } else {
            if (!frontier || block.previous !== frontier.hash || block.height !== frontier.height + 1) throw new Error("Invalid link");
        }
        // SPoRA (Succinct Proof of Random Access) Verification
        // Ensures that the miner has access to the Bobtorrent dataset.
        // Bypassed only for the first block in history (System Genesis).
        if (!(block.type === 'open' && block.link === 'SYSTEM_GENESIS' && Object.keys(this.chains).length === 0)) {
            const baseHash = block.previous || crypto.createHash('sha256').update(block.account).digest('hex');
            const expectedChallenge = parseInt(baseHash.substr(0, 8), 16);
            if (block.spora.challenge !== expectedChallenge) throw new Error("Invalid SPoRA challenge");
            // Chunk proof verification is handled in Block.verifySignature() but re-enforced here via challenge-linkage
        }

        this.refreshProposalStatusesAt(block.timestamp);
        this.refreshMarketStatusesAt(block.timestamp);

        let previousBalance = frontier ? frontier.balance : 0;
        if (frontier && frontier.timestamp) {
            const decayedBalance = this.applyDemurrage(previousBalance, frontier.timestamp, block.timestamp);
            this.totalSupply -= (previousBalance - decayedBalance);
            previousBalance = decayedBalance;
        }
        const epsilon = 0.001;
        if (block.type !== 'stake_lock' && block.type !== 'stake_unlock' && block.type !== 'open') {
            const currentStaked = frontier ? (frontier.staked_balance || 0) : 0;
            if (Math.abs(block.staked_balance - currentStaked) > epsilon) throw new Error("Staked bal invariant");
        }

        // Liquid Transaction Handling
        if (block.type === 'send') {
            if (block.balance > previousBalance + epsilon) throw new Error("Insufficient bal");
            if (!this.pending[block.link]) this.pending[block.link] = [];
            // Record pending transaction for the recipient to claim
            this.pending[block.link].push({ hash: block.hash, amount: previousBalance - block.balance, sender: account, payload: block.payload });
        } else if (block.type === 'receive' || block.type === 'open') {
            if (block.type === 'open' && block.link === 'SYSTEM_GENESIS' && Object.keys(this.chains).length === 0) {
                this.totalSupply += block.balance;
            } else {
                const pendingTx = (this.pending[account] || []).find(p => p.hash === block.link);
                if (!pendingTx || Math.abs(block.balance - (previousBalance + pendingTx.amount)) > epsilon) throw new Error("Invalid receive");
                this.pending[account] = this.pending[account].filter(p => p.hash !== block.link);
            }
        } else if (block.type === 'proposal') {
            const fee = this.proposalFee * this.getFeeMultiplier(account);
            if (Math.abs(block.balance - (previousBalance - fee)) > epsilon) throw new Error("Invalid prop fee");
            this.proposals[block.hash] = { id: block.hash, proposer: account, title: block.payload.title, status: 'Active', votesFor: 0, votesAgainst: 0, endTime: block.payload.endTime, timestamp: block.timestamp, enactmentDelay: block.payload.enactmentDelay || 0, action: block.payload.action, target: block.payload.target, amount: block.payload.amount, rate: block.payload.rate, threshold: block.payload.threshold, pair: block.payload.pair, reserveA: block.payload.reserveA, reserveB: block.payload.reserveB, proposalFee: block.payload.proposalFee, nftMintFee: block.payload.nftMintFee, storageFeeBase: block.payload.storageFeeBase };
            this.votes[block.hash] = {};
        } else if (block.type === 'vote') {
            if (Math.abs(block.balance - previousBalance) > epsilon) throw new Error(`Vote must not change balance.`);
            const proposal = this.proposals[block.link];
            if (!proposal || proposal.status !== 'Active') throw new Error("Prop closed");
            const power = Math.sqrt(block.balance) * (this.getTrustScore(account) / 100.0);
            this.votes[block.link][account] = { type: block.payload.vote, power };
            if (block.payload.vote === 'FOR') proposal.votesFor += power; else proposal.votesAgainst += power;
        } else if (block.type === 'market_bid') {
            if (block.balance > previousBalance + epsilon) throw new Error("Market bid balance error");
            this.marketBids[block.hash] = { id: block.hash, creator: account, magnet: block.payload.magnet, amount: previousBalance - block.balance, status: 'OPEN', timestamp: block.timestamp, expiry: block.payload.expiry || (block.timestamp + 3600000) };
        } else if (block.type === 'accept_bid') {
            const bid = this.marketBids[block.link];
            if (!bid || bid.status !== 'OPEN') throw new Error("Invalid bid");
            if (Math.abs(block.balance - (previousBalance + bid.amount)) > epsilon) throw new Error("Invalid accept balance");
            bid.status = 'ACCEPTED'; bid.acceptedBy = account; bid.acceptedTimestamp = block.timestamp;
        } else if (block.type === 'amm_swap') {
            if (Math.abs(block.balance - (previousBalance - block.payload.amountIn)) > epsilon) throw new Error(`Swap must deduct ${block.payload.amountIn} BOB`);
            if (!this.pools[block.payload.pair]) throw new Error("Pool not found");
        } else if (block.type === 'amm_add_liquidity') {
            const pool = this.pools[block.payload.pair];
            if (!pool) throw new Error("Pool not found");
            if (Math.abs(block.balance - (previousBalance - block.payload.amountA)) > epsilon) throw new Error(`Add Liq must deduct ${block.payload.amountA} BOB`);
            const userAssetBal = (this.balances[account] || {})[pool.assetB] || 0;
            if (userAssetBal < block.payload.amountB - epsilon) throw new Error(`Insufficient ${pool.assetB}`);
        } else if (block.type === 'amm_remove_liquidity') {
            const pool = this.pools[block.payload.pair];
            if (!pool) throw new Error("Pool not found");
            const lpToken = `LP-${block.payload.pair}`;
            const userLpBal = (this.balances[account] || {})[lpToken] || 0;
            if (userLpBal < block.payload.shares - epsilon) throw new Error("Insufficient LP");
            const expectedA = (block.payload.shares * pool.reserveA) / pool.totalShares;
            if (Math.abs(block.balance - (previousBalance + expectedA)) > epsilon) throw new Error(`Remove Liq must credit ${expectedA} BOB`);
        // HTLC (Hashed Time-Locked Contract) for cross-chain or atomic swaps
        } else if (block.type === 'swap_lock') {
            this.swaps[block.payload.secretHash] = { sender: account, recipient: block.payload.recipient, amount: previousBalance - block.balance, expiry: block.payload.expiry || (block.timestamp + 3600000), status: 'LOCKED' };
        } else if (block.type === 'swap_claim') {
            const swap = this.swaps[block.payload.secretHash];
            if (!swap || swap.status !== 'LOCKED' || block.timestamp > swap.expiry || crypto.createHash('sha256').update(block.payload.secret).digest('hex') !== block.payload.secretHash) throw new Error("Invalid claim");
            if (Math.abs(block.balance - (previousBalance + swap.amount)) > epsilon) throw new Error("Invalid claim balance");
            swap.status = 'CLAIMED'; swap.claimer = account;
        } else if (block.type === 'mint_nft') {
            this.nfts[block.hash] = { id: block.hash, owner: account, name: block.payload.name, magnet: block.payload.magnet, timestamp: block.timestamp };
        } else if (block.type === 'transfer_nft') {
            const nft = this.nfts[block.link];
            if (!nft || nft.owner !== account) throw new Error("Invalid NFT");
            nft.owner = block.payload.recipient;
        } else if (block.type === 'data_anchor') {
            this.anchors[block.hash] = { ...block.payload, id: block.hash, owner: account, timestamp: block.timestamp, type: 'data_anchor' };
        } else if (block.type === 'publish_manifest') {
            this.anchors[block.hash] = { ...block.payload, id: block.hash, owner: account, timestamp: block.timestamp, type: 'publish_manifest' };
        } else if (block.type === 'multisig_create') {
            if (Math.abs(block.balance - (previousBalance - 100)) > epsilon) throw new Error("Multisig creation costs 100 BOB");
            const mAccount = crypto.createHash('sha256').update(JSON.stringify(block.payload.participants)).digest('hex').substring(0, 44);
            this.multisigs[mAccount] = { participants: block.payload.participants, threshold: block.payload.threshold, balance: 0, pendingProposals: {} };
        } else if (block.type === 'multisig_propose') {
            if (Math.abs(block.balance - previousBalance) > epsilon) throw new Error("Propose must not change balance");
            const vault = this.multisigs[block.payload.vault];
            if (!vault) throw new Error("Vault not found");
            if (!vault.participants.includes(account)) throw new Error("Not a vault participant");
        } else if (block.type === 'multisig_approve') {
            if (Math.abs(block.balance - previousBalance) > epsilon) throw new Error("Approve must not change balance");
            const vault = this.multisigs[block.payload.vault];
            if (!vault) throw new Error("Vault not found");
            if (!vault.participants.includes(account)) throw new Error("Not a vault participant");
            if (!vault.pendingProposals[block.payload.proposalID]) throw new Error("Proposal not found");
        // Proof-of-Reputation Staking
        // Locks liquid BOB to increase trust weighting and earn demurrage-financed rewards.
        } else if (block.type === 'stake_lock') {
            const amount = previousBalance - block.balance;
            if (Math.abs(block.staked_balance - ((frontier.staked_balance || 0) + amount)) > epsilon) throw new Error("Invalid staked bal");
        } else if (block.type === 'stake_unlock') {
            const amount = (frontier.staked_balance || 0) - block.staked_balance;
            const elapsed = block.timestamp - frontier.timestamp;
            let reward = (frontier.staked_balance || 0) * this.getStakingRewardRate() * elapsed * (this.getTrustScore(account) / 100.0);
            if (Math.abs(block.balance - (previousBalance + amount + reward)) > epsilon) throw new Error("Invalid unlock balance");
        } else if (block.type === 'achievement_unlock') {
            if (Math.abs(block.balance - previousBalance) > epsilon) throw new Error("Achievement unlock cannot change balance");
        } else if (block.type === 'restore_trust') {
            const amount = previousBalance - block.balance;
            this.trustScores[account] = Math.min(100.0, this.getTrustScore(account) + (amount / 10.0));
        } else if (block.type === 'verify_identity') {
            if (!this.identities[account]) this.identities[account] = {};
            this.identities[account][block.payload.provider] = block.payload.username;
        }

        if (!this.chains[account]) this.chains[account] = [];
        this.chains[account].push(block);
        this.blocks[block.hash] = block;

        // DeFi: Automated Market Maker (AMM) Logic
        // Implements the Constant Product Formula (x * y = k) for deterministic swaps.
        if (block.type === 'amm_swap') {
            const pool = this.pools[block.payload.pair];
            // dy = (y * dx) / (x + dx)
            const dy = (pool.reserveB * block.payload.amountIn) / (pool.reserveA + block.payload.amountIn);
            pool.reserveA += block.payload.amountIn; pool.reserveB -= dy;
            if (!this.balances[account]) this.balances[account] = {};
            this.balances[account][pool.assetB] = (this.balances[account][pool.assetB] || 0) + dy;
            this.totalSupply -= block.payload.amountIn;
        } else if (block.type === 'amm_add_liquidity') {
            const pool = this.pools[block.payload.pair]; const lpToken = `LP-${block.payload.pair}`;
            let shares = pool.totalShares === 0 ? Math.sqrt(block.payload.amountA * block.payload.amountB) : Math.min((block.payload.amountA * pool.totalShares) / pool.reserveA, (block.payload.amountB * pool.totalShares) / pool.reserveB);
            pool.reserveA += block.payload.amountA; pool.reserveB += block.payload.amountB; pool.totalShares += shares;
            if (!this.balances[account]) this.balances[account] = {};
            this.balances[account][pool.assetB] = (this.balances[account][pool.assetB] || 0) - block.payload.amountB;
            this.balances[account][lpToken] = (this.balances[account][lpToken] || 0) + shares;
            this.totalSupply -= block.payload.amountA;
        } else if (block.type === 'amm_remove_liquidity') {
            const pool = this.pools[block.payload.pair]; const lpToken = `LP-${block.payload.pair}`;
            const amountA = (block.payload.shares * pool.reserveA) / pool.totalShares;
            const amountB = (block.payload.shares * pool.reserveB) / pool.totalShares;
            pool.reserveA -= amountA; pool.reserveB -= amountB; pool.totalShares -= block.payload.shares;
            if (!this.balances[account]) this.balances[account] = {};
            this.balances[account][lpToken] -= block.payload.shares;
            this.balances[account][pool.assetB] = (this.balances[account][pool.assetB] || 0) + amountB;
            this.totalSupply += amountA;
        } else if (block.type === 'multisig_propose') {
            this.multisigs[block.payload.vault].pendingProposals[block.hash] = { id: block.hash, recipient: block.payload.recipient, amount: block.payload.amount, signatures: [account], executed: false };
        } else if (block.type === 'multisig_approve') {
            const vault = this.multisigs[block.payload.vault]; const prop = vault.pendingProposals[block.payload.proposalID];
            if (!prop.signatures.includes(account)) prop.signatures.push(account);
            if (prop.signatures.length >= vault.threshold && vault.balance >= prop.amount) {
                prop.executed = true; vault.balance -= prop.amount;
                if (!this.pending[prop.recipient]) this.pending[prop.recipient] = [];
                this.pending[prop.recipient].push({ hash: prop.id, amount: prop.amount, sender: block.payload.vault });
            }
        } else if (block.type === 'stake_unlock') {
            const unstaked = (frontier.staked_balance || 0) - block.staked_balance;
            const reward = block.balance - (previousBalance + unstaked);
            if (reward > 0) this.totalSupply += reward;
        } else if (['proposal', 'mint_nft', 'transfer_nft', 'data_anchor', 'multisig_create', 'restore_trust'].includes(block.type)) {
            const fee = previousBalance - block.balance;
            if (fee > 0) this.totalSupply -= fee;
        }

        this.updateStateHash(block);
        return true;
    }
}
