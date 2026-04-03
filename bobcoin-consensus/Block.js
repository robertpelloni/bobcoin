import { hash, sign, verify } from './cryptoUtils.js';

export class Block {
    constructor({ type, account, previous, balance, link, spora = null, payload = null, height = 0, staked_balance = 0 }) {
        this.type = type;         // 'open', 'send', 'receive', 'proposal', 'vote'
        this.account = account;   // Public key of the chain owner
        this.previous = previous; // Hash of the previous block (null if 'open')
        this.balance = balance;   // Resulting liquid balance after this block
        this.staked_balance = staked_balance; // Resulting staked balance
        this.height = height;     // Sequential height of the block
        this.link = link;         // 'send' -> destination, 'receive' -> send hash, 'vote' -> proposal hash
        this.spora = spora;       // SPoRA proof object: { infoHash, challenge, chunkHash }
        this.payload = payload;   // Custom JSON payload for governance/smart contracts
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
            this.staked_balance.toString() +
            this.height.toString() +
            this.link +
            (this.spora ? JSON.stringify(this.spora) : '') +
            (this.payload ? JSON.stringify(this.payload) : '')
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
