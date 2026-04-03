import { hashData, signBlock, verifySignature } from './cryptoUtils.js';

export class Block {
    constructor({ type, account, previous, balance, link, spora = null }) {
        this.type = type;         // 'open', 'send', 'receive'
        this.account = account;   // Public key of the chain owner
        this.previous = previous; // Hash of the previous block (null if 'open')
        this.balance = balance;   // Resulting balance after this block
        this.link = link;         // 'send' -> destination account, 'receive' -> send block hash
        this.spora = spora;       // SPoRA proof object: { infoHash, challenge, chunkHash }
        this.timestamp = Date.now();
        
        this.hash = null;
        this.signature = null;
    }

    async calculateHash() {
        const payload = this.type + this.account + (this.previous || '') + this.balance.toString() + this.link + (this.spora ? JSON.stringify(this.spora) : '');
        this.hash = await hashData(payload);
        return this.hash;
    }

    async signBlock(privateKeyBase58) {
        if (!this.hash) await this.calculateHash();
        this.signature = await signBlock(this.hash, privateKeyBase58);
    }

    async verifySignature() {
        if (!this.signature || !this.hash) return false;
        return verifySignature(this.hash, this.signature, this.account);
    }
}
