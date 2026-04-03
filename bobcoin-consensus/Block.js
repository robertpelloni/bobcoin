import { hash, sign, verify } from './cryptoUtils.js';

export class Block {
    constructor({ type, account, previous, balance, link }) {
        this.type = type;         // 'open', 'send', 'receive'
        this.account = account;   // Public key of the chain owner
        this.previous = previous; // Hash of the previous block (null if 'open')
        this.balance = balance;   // Resulting balance after this block
        this.link = link;         // 'send' -> destination account, 'receive' -> send block hash
        this.timestamp = Date.now();
        
        this.hash = this.calculateHash();
        this.signature = null;
        this.work = null;         // Anti-spam PoW
    }

    calculateHash() {
        return hash(
            this.type +
            this.account +
            (this.previous || '') +
            this.balance.toString() +
            this.link
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
