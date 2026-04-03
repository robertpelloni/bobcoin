import { hash, sign, verify } from './cryptoUtils.js';

export class Block {
    constructor({ type, account, previous, balance, link, spora = null }) {
        this.type = type;         // 'open', 'send', 'receive'
        this.account = account;   // Public key of the chain owner
        this.previous = previous; // Hash of the previous block (null if 'open')
        this.balance = balance;   // Resulting balance after this block
        this.link = link;         // 'send' -> destination account, 'receive' -> send block hash
        this.spora = spora;       // SPoRA proof object: { infoHash, challenge, chunkHash }
        this.timestamp = Date.now();
        
        this.hash = this.calculateHash();
        this.signature = null;
    }

    calculateHash() {
        return hash(
            this.type +
            this.account +
            (this.previous || '') +
            this.balance.toString() +
            this.link +
            (this.spora ? JSON.stringify(this.spora) : '')
        );
    }

    signBlock(privateKey) {
        this.signature = sign(this.hash, privateKey);
    }

    verifySignature() {
        if (!this.signature) return false;
        return verify(this.hash, this.signature, this.account);
    }
}
