import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Block } from './Block.js';
import { Lattice } from './Lattice.js';
import { deriveKeypair, hash } from './cryptoUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scenarioCatalog = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../testing/parity-scenarios.json'), 'utf8'),
);
const fragmentCatalog = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../testing/parity-fixture-fragments.json'), 'utf8'),
);

function validSpora(previousHash) {
    const challenge = parseInt(previousHash.slice(0, 8), 16);
    const infoHash = 'anchor-seed';
    return {
        infoHash,
        challenge,
        chunkHash: crypto.createHash('sha256').update(infoHash + challenge).digest('hex'),
    };
}

function validSporaForOpenAccount(account) {
    const challengeBase = hash(account);
    const challenge = parseInt(challengeBase.slice(0, 8), 16);
    const infoHash = 'anchor-seed';
    return {
        infoHash,
        challenge,
        chunkHash: crypto.createHash('sha256').update(infoHash + challenge).digest('hex'),
    };
}

function createSignedBlock(data, timestamp, privateKey) {
    const block = new Block(data);
    block.timestamp = timestamp;
    block.hash = block.calculateHash();
    block.signBlock(privateKey);
    return block;
}

class ScenarioContext {
    constructor(seed) {
        this.lattice = new Lattice();
        this.proposer = deriveKeypair(seed + '-proposer');
        this.voter = deriveKeypair(seed + '-voter');
        this.collector = deriveKeypair(seed + '-collector');
        this.baseTime = 1000000;
        this.proposalHash = null;
        this.secret = 'fixture-secret';
        this.secretHash = hash(this.secret);
    }
}

const generators = {
    'proposer-genesis': (ctx) => {
        const block = createSignedBlock({
            type: 'open',
            account: ctx.proposer.publicKey,
            previous: null,
            balance: 1000,
            link: 'SYSTEM_GENESIS',
            height: 0,
            staked_balance: 0,
        }, ctx.baseTime - 120000, ctx.proposer.privateKey);
        ctx.lattice.processBlock(block);
    },

    'proposer-sends-to-voter': (ctx) => {
        const ts = ctx.baseTime - 90000;
        const prev = ctx.lattice.getFrontier(ctx.proposer.publicKey);
        const send = createSignedBlock({
            type: 'send',
            account: ctx.proposer.publicKey,
            previous: prev.hash,
            balance: ctx.lattice.getBalance(ctx.proposer.publicKey, ts) - 200,
            link: ctx.voter.publicKey,
            height: prev.height + 1,
            staked_balance: prev.staked_balance,
            spora: validSpora(prev.hash),
        }, ts, ctx.proposer.privateKey);
        ctx.lattice.processBlock(send);

        const open = createSignedBlock({
            type: 'open',
            account: ctx.voter.publicKey,
            previous: null,
            balance: 200,
            link: send.hash,
            height: 0,
            staked_balance: 0,
            spora: validSporaForOpenAccount(ctx.voter.publicKey),
        }, ts + 1000, ctx.voter.privateKey);
        ctx.lattice.processBlock(open);
    },

    'proposer-sends-to-collector': (ctx) => {
        const ts = ctx.baseTime - 60000;
        const prev = ctx.lattice.getFrontier(ctx.proposer.publicKey);
        const send = createSignedBlock({
            type: 'send',
            account: ctx.proposer.publicKey,
            previous: prev.hash,
            balance: ctx.lattice.getBalance(ctx.proposer.publicKey, ts) - 150,
            link: ctx.collector.publicKey,
            height: prev.height + 1,
            staked_balance: prev.staked_balance,
            spora: validSpora(prev.hash),
        }, ts, ctx.proposer.privateKey);
        ctx.lattice.processBlock(send);

        const open = createSignedBlock({
            type: 'open',
            account: ctx.collector.publicKey,
            previous: null,
            balance: 150,
            link: send.hash,
            height: 0,
            staked_balance: 0,
            spora: validSporaForOpenAccount(ctx.collector.publicKey),
        }, ts + 1000, ctx.collector.privateKey);
        ctx.lattice.processBlock(open);
    },

    'same-timestamp-governance-core': (ctx) => {
        const ts = ctx.baseTime;
        const prevP = ctx.lattice.getFrontier(ctx.proposer.publicKey);
        const prop = createSignedBlock({
            type: 'proposal',
            account: ctx.proposer.publicKey,
            previous: prevP.hash,
            balance: ctx.lattice.getBalance(ctx.proposer.publicKey, ts) - 10,
            link: 'DAO_PROPOSAL',
            height: prevP.height + 1,
            staked_balance: prevP.staked_balance,
            spora: validSpora(prevP.hash),
            payload: {
                title: 'Fixture Proposal',
                endTime: new Date(ts + 2000).toISOString(),
            },
        }, ts, ctx.proposer.privateKey);
        ctx.lattice.processBlock(prop);
        ctx.proposalHash = prop.hash;

        const prevV = ctx.lattice.getFrontier(ctx.voter.publicKey);
        const vote = createSignedBlock({
            type: 'vote',
            account: ctx.voter.publicKey,
            previous: prevV.hash,
            balance: ctx.lattice.getBalance(ctx.voter.publicKey, ts),
            link: prop.hash,
            height: prevV.height + 1,
            staked_balance: prevV.staked_balance,
            spora: validSpora(prevV.hash),
            payload: { vote: 'FOR' },
        }, ts, ctx.voter.privateKey);
        ctx.lattice.processBlock(vote);
    },

    'same-timestamp-htlc-core': (ctx) => {
        const ts = ctx.baseTime;
        const prev = ctx.lattice.getFrontier(ctx.proposer.publicKey);
        const lock = createSignedBlock({
            type: 'swap_lock',
            account: ctx.proposer.publicKey,
            previous: prev.hash,
            balance: ctx.lattice.getBalance(ctx.proposer.publicKey, ts) - 50,
            link: 'HTLC_LOCK',
            height: prev.height + 1,
            staked_balance: prev.staked_balance,
            spora: validSpora(prev.hash),
            payload: {
                secretHash: ctx.secretHash,
                recipient: ctx.proposer.publicKey,
            },
        }, ts, ctx.proposer.privateKey);
        ctx.lattice.processBlock(lock);

        const claimTs = ts + 500;
        const claim = createSignedBlock({
            type: 'swap_claim',
            account: ctx.proposer.publicKey,
            previous: lock.hash,
            balance: ctx.lattice.getBalance(ctx.proposer.publicKey, claimTs) + 50,
            link: 'HTLC_CLAIM',
            height: lock.height + 1,
            staked_balance: lock.staked_balance,
            spora: validSpora(lock.hash),
            payload: {
                secret: ctx.secret,
                secretHash: ctx.secretHash,
            },
        }, claimTs, ctx.proposer.privateKey);
        ctx.lattice.processBlock(claim);
    },

    'same-timestamp-nft-core': (ctx) => {
        const ts = ctx.baseTime;
        const prev = ctx.lattice.getFrontier(ctx.proposer.publicKey);
        const mint = createSignedBlock({
            type: 'mint_nft',
            account: ctx.proposer.publicKey,
            previous: prev.hash,
            balance: ctx.lattice.getBalance(ctx.proposer.publicKey, ts) - 50,
            link: 'NFT_MINT',
            height: prev.height + 1,
            staked_balance: prev.staked_balance,
            spora: validSpora(prev.hash),
            payload: { name: 'Fixture NFT', magnet: 'm' },
        }, ts, ctx.proposer.privateKey);
        ctx.lattice.processBlock(mint);

        const transfer = createSignedBlock({
            type: 'transfer_nft',
            account: ctx.proposer.publicKey,
            previous: mint.hash,
            balance: ctx.lattice.getBalance(ctx.proposer.publicKey, ts) - 1,
            link: mint.hash,
            height: mint.height + 1,
            staked_balance: mint.staked_balance,
            spora: validSpora(mint.hash),
            payload: { recipient: ctx.collector.publicKey },
        }, ts, ctx.proposer.privateKey);
        ctx.lattice.processBlock(transfer);
    },

    'collector-market-bid-core': (ctx) => {
        const ts = ctx.baseTime;
        const prevC = ctx.lattice.getFrontier(ctx.collector.publicKey);
        const bid = createSignedBlock({
            type: 'market_bid',
            account: ctx.collector.publicKey,
            previous: prevC.hash,
            balance: ctx.lattice.getBalance(ctx.collector.publicKey, ts) - 20,
            link: 'STORAGE_MARKET',
            height: prevC.height + 1,
            staked_balance: prevC.staked_balance,
            spora: validSpora(prevC.hash),
            payload: { magnet: 'm' },
        }, ts, ctx.collector.privateKey);
        ctx.lattice.processBlock(bid);

        const acceptTs = ts + 1500;
        const prevP = ctx.lattice.getFrontier(ctx.proposer.publicKey);
        const accept = createSignedBlock({
            type: 'accept_bid',
            account: ctx.proposer.publicKey,
            previous: prevP.hash,
            balance: ctx.lattice.getBalance(ctx.proposer.publicKey, acceptTs) + 20,
            link: bid.hash,
            height: prevP.height + 1,
            staked_balance: prevP.staked_balance,
            spora: validSpora(prevP.hash),
        }, acceptTs, ctx.proposer.privateKey);
        ctx.lattice.processBlock(accept);
    },

    'collector-vote-extension': (ctx) => {
        const ts = ctx.baseTime;
        const prev = ctx.lattice.getFrontier(ctx.collector.publicKey);
        const vote = createSignedBlock({
            type: 'vote',
            account: ctx.collector.publicKey,
            previous: prev.hash,
            balance: ctx.lattice.getBalance(ctx.collector.publicKey, ts),
            link: ctx.proposalHash,
            height: prev.height + 1,
            staked_balance: prev.staked_balance,
            spora: validSpora(prev.hash),
            payload: { vote: 'FOR' },
        }, ts, ctx.collector.privateKey);
        ctx.lattice.processBlock(vote);
    },

    'manifest-anchor-core': (ctx) => {
        const ts = ctx.baseTime;
        const prev = ctx.lattice.getFrontier(ctx.proposer.publicKey);
        const manifest = createSignedBlock({
            type: 'publish_manifest',
            account: ctx.proposer.publicKey,
            previous: prev.hash,
            balance: ctx.lattice.getBalance(ctx.proposer.publicKey, ts),
            link: 'MANIFEST',
            height: prev.height + 1,
            staked_balance: prev.staked_balance,
            spora: validSpora(prev.hash),
            payload: { manifestId: 'id', locator: 'loc', manifestUrl: 'url' },
        }, ts, ctx.proposer.privateKey);
        ctx.lattice.processBlock(manifest);

        const finalTs = ts + 3000;
        const finalPrev = ctx.lattice.getFrontier(ctx.proposer.publicKey);
        const finalizer = createSignedBlock({
            type: 'data_anchor',
            account: ctx.proposer.publicKey,
            previous: finalPrev.hash,
            balance: ctx.lattice.getBalance(ctx.proposer.publicKey, finalTs) - 1,
            link: 'FINALIZER',
            height: finalPrev.height + 1,
            staked_balance: finalPrev.staked_balance,
            spora: validSpora(finalPrev.hash),
            payload: { magnet: 'm', name: 'n' },
        }, finalTs, ctx.proposer.privateKey);
        ctx.lattice.processBlock(finalizer);
    },

    'governance-fee-adjustment': (ctx) => {
        const ts = ctx.baseTime;
        const prev1 = ctx.lattice.getFrontier(ctx.proposer.publicKey);
        const prop = createSignedBlock({
            type: 'proposal',
            account: ctx.proposer.publicKey,
            previous: prev1.hash,
            balance: ctx.lattice.getBalance(ctx.proposer.publicKey, ts) - ctx.lattice.proposalFee,
            link: 'DAO_PROPOSAL',
            height: prev1.height + 1,
            staked_balance: prev1.staked_balance,
            spora: validSpora(prev1.hash),
            payload: {
                title: 'Fee and Quorum adjustment',
                endTime: new Date(ts + 1000).toISOString(),
                action: 'ADJUST_FEES',
                nftMintFee: 150.0,
            },
        }, ts, ctx.proposer.privateKey);
        ctx.lattice.processBlock(prop);

        const prev2 = ctx.lattice.getFrontier(ctx.proposer.publicKey);
        const vote = createSignedBlock({
            type: 'vote',
            account: ctx.proposer.publicKey,
            previous: prev2.hash,
            balance: ctx.lattice.getBalance(ctx.proposer.publicKey, ts),
            link: prop.hash,
            height: prev2.height + 1,
            staked_balance: prev2.staked_balance,
            spora: validSpora(prev2.hash),
            payload: { vote: 'FOR' },
        }, ts, ctx.proposer.privateKey);
        ctx.lattice.processBlock(vote);

        const finalTs = ts + 5000;
        const prev3 = ctx.lattice.getFrontier(ctx.proposer.publicKey);
        const finalizer = createSignedBlock({
            type: 'achievement_unlock',
            account: ctx.proposer.publicKey,
            previous: prev3.hash,
            balance: ctx.lattice.getBalance(ctx.proposer.publicKey, finalTs),
            link: 'FINALIZED',
            height: prev3.height + 1,
            staked_balance: prev3.staked_balance,
            spora: validSpora(prev3.hash),
        }, finalTs, ctx.proposer.privateKey);
        ctx.lattice.processBlock(finalizer);

        if (ctx.lattice.nftMintFee !== 150.0) {
            throw new Error(`expected NftMintFee 150.0 after execution, got ${ctx.lattice.nftMintFee}`);
        }

        const prev4 = ctx.lattice.getFrontier(ctx.proposer.publicKey);
        const mint = createSignedBlock({
            type: 'mint_nft',
            account: ctx.proposer.publicKey,
            previous: prev4.hash,
            balance: ctx.lattice.getBalance(ctx.proposer.publicKey, finalTs) - 150.0,
            link: 'NFT_MINT',
            height: prev4.height + 1,
            staked_balance: prev4.staked_balance,
            spora: validSpora(prev4.hash),
            payload: { name: 'New Fee NFT', magnet: 'm' },
        }, finalTs, ctx.proposer.privateKey);
        ctx.lattice.processBlock(mint);
    },

    'demurrage-balance-pressure': (ctx) => {
        // Marker fragment
    },

    'stake-lock-core': (ctx) => {
        const ts = ctx.baseTime;
        const prev = ctx.lattice.getFrontier(ctx.proposer.publicKey);
        const lock = createSignedBlock({
            type: 'stake_lock',
            account: ctx.proposer.publicKey,
            previous: prev.hash,
            balance: ctx.lattice.getBalance(ctx.proposer.publicKey, ts) - 100,
            link: 'STAKE_LOCK',
            height: prev.height + 1,
            staked_balance: prev.staked_balance + 100,
            spora: validSpora(prev.hash),
        }, ts, ctx.proposer.privateKey);
        ctx.lattice.processBlock(lock);
    },

    'multisig-lifecycle-core': (ctx) => {
        const ts = ctx.baseTime;
        const participants = [ctx.proposer.publicKey, ctx.voter.publicKey];
        const prevP = ctx.lattice.getFrontier(ctx.proposer.publicKey);
        const create = createSignedBlock({
            type: 'multisig_create',
            account: ctx.proposer.publicKey,
            previous: prevP.hash,
            balance: ctx.lattice.getBalance(ctx.proposer.publicKey, ts) - 100,
            link: 'MULTISIG_CREATE',
            height: prevP.height + 1,
            staked_balance: prevP.staked_balance,
            spora: validSpora(prevP.hash),
            payload: { participants, threshold: 2 }
        }, ts, ctx.proposer.privateKey);
        ctx.lattice.processBlock(create);

        const vaultAddr = crypto.createHash('sha256').update(JSON.stringify(participants)).digest('hex').substring(0, 44);

        // Fund the vault
        const prevP2 = ctx.lattice.getFrontier(ctx.proposer.publicKey);
        const fund = createSignedBlock({
            type: 'send',
            account: ctx.proposer.publicKey,
            previous: prevP2.hash,
            balance: ctx.lattice.getBalance(ctx.proposer.publicKey, ts) - 50,
            link: vaultAddr,
            height: prevP2.height + 1,
            staked_balance: prevP2.staked_balance,
            spora: validSpora(prevP2.hash)
        }, ts, ctx.proposer.privateKey);
        ctx.lattice.processBlock(fund);

        // Propose
        const prevP3 = ctx.lattice.getFrontier(ctx.proposer.publicKey);
        const prop = createSignedBlock({
            type: 'multisig_propose',
            account: ctx.proposer.publicKey,
            previous: prevP3.hash,
            balance: ctx.lattice.getBalance(ctx.proposer.publicKey, ts),
            link: 'MULTISIG_PROPOSE',
            height: prevP3.height + 1,
            staked_balance: prevP3.staked_balance,
            spora: validSpora(prevP3.hash),
            payload: { vault: vaultAddr, recipient: ctx.collector.publicKey, amount: 40 }
        }, ts, ctx.proposer.privateKey);
        ctx.lattice.processBlock(prop);

        // Approve (voter)
        const prevV = ctx.lattice.getFrontier(ctx.voter.publicKey);
        const approve = createSignedBlock({
            type: 'multisig_approve',
            account: ctx.voter.publicKey,
            previous: prevV.hash,
            balance: ctx.lattice.getBalance(ctx.voter.publicKey, ts),
            link: 'MULTISIG_APPROVE',
            height: prevV.height + 1,
            staked_balance: prevV.staked_balance,
            spora: validSpora(prevV.hash),
            payload: { vault: vaultAddr, proposalID: prop.hash }
        }, ts, ctx.voter.privateKey);
        ctx.lattice.processBlock(approve);
    },

    'amm-swap-core': (ctx) => {
        const ts = ctx.baseTime;
        const prevP = ctx.lattice.getFrontier(ctx.proposer.publicKey);
        const swap = createSignedBlock({
            type: 'amm_swap',
            account: ctx.proposer.publicKey,
            previous: prevP.hash,
            balance: ctx.lattice.getBalance(ctx.proposer.publicKey, ts) - 100,
            link: 'AMM_SWAP',
            height: prevP.height + 1,
            staked_balance: prevP.staked_balance,
            spora: validSpora(prevP.hash),
            payload: { pair: 'BOB/sSOL', amountIn: 100 }
        }, ts, ctx.proposer.privateKey);
        ctx.lattice.processBlock(swap);
    }
};

function testFixtureDrivenScenarios() {
    console.log('Running Node Fixture-Driven Scenarios...');
    for (const sc of scenarioCatalog.scenarios) {
        process.stdout.write(`  Scenario: ${sc.id} ... `);
        const ctx = new ScenarioContext(sc.id);
        for (const fragId of sc.fragments) {
            const gen = generators[fragId];
            if (!gen) throw new Error(`Unknown fragment: ${fragId}`);
            gen(ctx);
        }
        console.log('OK');
    }
}

testFixtureDrivenScenarios();
