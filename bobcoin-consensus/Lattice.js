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
    }

    /**
     * Get the frontier (head) block of an account's chain
     */
    getFrontier(account) {
        if (!this.chains[account] || this.chains[account].length === 0) return null;
        return this.chains[account][this.chains[account].length - 1];
    }

    /**
     * Get current balance of an account
     */
    getBalance(account) {
        const frontier = this.getFrontier(account);
        return frontier ? frontier.balance : 0;
    }

    /**
     * Process an incoming block
     */
    processBlock(block) {
        if (!block.verifySignature()) {
            throw new Error("Invalid block signature");
        }

        const account = block.account;
        const frontier = this.getFrontier(account);

        // Verify previous hash links
        if (block.type === 'open') {
            if (frontier) throw new Error("Account already open");
            if (block.previous !== null) throw new Error("Open block must have no previous");
        } else {
            if (!frontier) throw new Error("Account not open");
            if (block.previous !== frontier.hash) throw new Error("Invalid previous block hash");
        }

        // Verify SPoRA (Succinct Proof of Random Access)
        // GENESIS blocks bypass SPoRA for bootstrapping
        if (!(block.type === 'open' && block.link === 'SYSTEM_GENESIS' && Object.keys(this.chains).length === 0)) {
            if (!block.spora || !block.spora.infoHash || !block.spora.chunkHash || block.spora.challenge === undefined) {
                throw new Error("Missing or invalid SPoRA proof. You must seed the Bobtorrent Network to submit blocks.");
            }

            // Challenge must be deterministic based on the previous block's hash (or account if 'open')
            const baseHash = block.previous || block.account;
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
        if (block.type === 'send') {
            const previousBalance = frontier ? frontier.balance : 0;
            if (block.balance >= previousBalance) throw new Error("Send block must decrease balance");
            
            const amount = previousBalance - block.balance;
            const recipient = block.link;

            // Add to pending for recipient
            if (!this.pending[recipient]) this.pending[recipient] = [];
            this.pending[recipient].push({ hash: block.hash, amount, sender: account });

        } else if (block.type === 'receive' || block.type === 'open') {
            // GENESIS BYPASS
            if (block.type === 'open' && block.link === 'SYSTEM_GENESIS' && Object.keys(this.chains).length === 0) {
                // Allow the very first block of the network to be an open block linking to SYSTEM_GENESIS
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

            const previousBalance = frontier ? frontier.balance : 0;
            const expectedBalance = previousBalance + pendingTx.amount;
            
            if (block.balance !== expectedBalance) throw new Error("Invalid receive balance");

            // Remove from pending
            this.pending[account] = pendingList.filter(p => p.hash !== sendBlockHash);
        } else {
            throw new Error("Invalid block type");
        }

        // Add to data structures
        if (!this.chains[account]) this.chains[account] = [];
        this.chains[account].push(block);
        this.blocks[block.hash] = block;

        return true;
    }
}
