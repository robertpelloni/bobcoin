import { hashData, signBlock, verifySignature } from './cryptoUtils.js';

export class Block {
    constructor({
        type,
        account,
        previous,
        balance,
        link,
        spora = null,
        payload = null,
        height = 0,
        staked_balance = 0,
        zk_proof = '',
        timestamp = Date.now(),
    }) {
        this.type = type;
        this.account = account;
        this.previous = previous;
        this.balance = balance;
        this.staked_balance = staked_balance;
        this.height = height;
        this.link = link;
        this.spora = spora;
        this.zk_proof = zk_proof;
        this.payload = payload;
        this.timestamp = timestamp;

        this.hash = null;
        this.signature = null;
    }

    async calculateHash() {
        const data =
            this.type +
            this.account +
            (this.previous || '') +
            this.balance.toString() +
            this.staked_balance.toString() +
            this.height.toString() +
            this.link +
            (this.spora ? JSON.stringify(this.spora) : '') +
            (this.payload ? JSON.stringify(this.payload) : '');

        this.hash = await hashData(data);
        return this.hash;
    }

    async signBlock(privateKeyBase58) {
        if (!this.hash) await this.calculateHash();
        this.signature = await signBlock(this.hash, privateKeyBase58);
        return this.signature;
    }

    async sign(privateKeyBase58) {
        return this.signBlock(privateKeyBase58);
    }

    async verifySignature() {
        if (!this.signature || !this.hash) return false;
        return verifySignature(this.hash, this.signature, this.account);
    }
}
