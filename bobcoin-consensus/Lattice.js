import { Block } from './Block.js';

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
