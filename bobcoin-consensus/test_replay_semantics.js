import assert from 'node:assert/strict';
import crypto from 'crypto';

import { Block } from './Block.js';
import { Lattice } from './Lattice.js';
import { deriveKeypair, hash } from './cryptoUtils.js';

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

function testHistoricalVoteUsesBlockTimestamp() {
    const lattice = new Lattice();
    const proposer = deriveKeypair('node semantic parity proposer');
    const voter = deriveKeypair('node semantic parity voter');

    const genesis = createSignedBlock({
        type: 'open',
        account: proposer.publicKey,
        previous: null,
        balance: 1000,
        link: 'SYSTEM_GENESIS',
        height: 0,
        staked_balance: 0,
    }, 1, proposer.privateKey);
    lattice.processBlock(genesis);

    const sendToVoter = createSignedBlock({
        type: 'send',
        account: proposer.publicKey,
        previous: genesis.hash,
        balance: 800,
        link: voter.publicKey,
        height: 1,
        staked_balance: 0,
        spora: validSpora(genesis.hash),
    }, 2, proposer.privateKey);
    lattice.processBlock(sendToVoter);

    const openVoter = createSignedBlock({
        type: 'open',
        account: voter.publicKey,
        previous: null,
        balance: 200,
        link: sendToVoter.hash,
        height: 0,
        staked_balance: 0,
        spora: validSporaForOpenAccount(voter.publicKey),
    }, 3, voter.privateKey);
    lattice.processBlock(openVoter);

    const proposal = createSignedBlock({
        type: 'proposal',
        account: proposer.publicKey,
        previous: sendToVoter.hash,
        balance: 790,
        link: 'DAO_PROPOSAL',
        height: 2,
        staked_balance: 0,
        spora: validSpora(sendToVoter.hash),
        payload: {
            title: 'Historical vote uses ledger time',
            endTime: new Date(5000).toISOString(),
        },
    }, 4, proposer.privateKey);
    lattice.processBlock(proposal);

    const vote = createSignedBlock({
        type: 'vote',
        account: voter.publicKey,
        previous: openVoter.hash,
        balance: 200,
        link: proposal.hash,
        height: 1,
        staked_balance: 0,
        spora: validSpora(openVoter.hash),
        payload: { vote: 'FOR' },
    }, 5, voter.privateKey);
    lattice.processBlock(vote);

    assert.ok(lattice.votes[proposal.hash][voter.publicKey], 'historical vote should be recorded by block timestamp');
}

function testHistoricalSwapClaimUsesBlockTimestamp() {
    const lattice = new Lattice();
    const trader = deriveKeypair('node semantic parity swap trader');
    const secret = 'node-historical-swap-secret';
    const secretHash = hash(secret);

    const genesis = createSignedBlock({
        type: 'open',
        account: trader.publicKey,
        previous: null,
        balance: 1000,
        link: 'SYSTEM_GENESIS',
        height: 0,
        staked_balance: 0,
    }, 1, trader.privateKey);
    lattice.processBlock(genesis);

    const lockBlock = createSignedBlock({
        type: 'swap_lock',
        account: trader.publicKey,
        previous: genesis.hash,
        balance: 925,
        link: 'HTLC_LOCK',
        height: 1,
        staked_balance: 0,
        spora: validSpora(genesis.hash),
        payload: {
            secretHash,
            recipient: trader.publicKey,
            expiry: 5,
        },
    }, 2, trader.privateKey);
    lattice.processBlock(lockBlock);

    const claimBlock = createSignedBlock({
        type: 'swap_claim',
        account: trader.publicKey,
        previous: lockBlock.hash,
        balance: 1000,
        link: 'HTLC_CLAIM',
        height: 2,
        staked_balance: 0,
        spora: validSpora(lockBlock.hash),
        payload: {
            secret,
            secretHash,
        },
    }, 4, trader.privateKey);
    lattice.processBlock(claimBlock);

    assert.equal(lattice.swaps[secretHash].status, 'CLAIMED', 'historical swap claim should succeed by block timestamp');
}

function testDefaultSwapExpiryUsesLedgerTime() {
    const lattice = new Lattice();
    const trader = deriveKeypair('node semantic parity default expiry');
    const secretHash = hash('node-default-expiry-secret');

    const genesis = createSignedBlock({
        type: 'open',
        account: trader.publicKey,
        previous: null,
        balance: 1000,
        link: 'SYSTEM_GENESIS',
        height: 0,
        staked_balance: 0,
    }, 100, trader.privateKey);
    lattice.processBlock(genesis);

    const lockBlock = createSignedBlock({
        type: 'swap_lock',
        account: trader.publicKey,
        previous: genesis.hash,
        balance: 925,
        link: 'HTLC_LOCK',
        height: 1,
        staked_balance: 0,
        spora: validSpora(genesis.hash),
        payload: {
            secretHash,
            recipient: trader.publicKey,
        },
    }, 2000, trader.privateKey);
    lattice.processBlock(lockBlock);

    assert.equal(
        lattice.swaps[secretHash].expiry,
        2000 + 3600000,
        'default HTLC expiry should derive from block timestamp',
    );
}

function run() {
    testHistoricalVoteUsesBlockTimestamp();
    testHistoricalSwapClaimUsesBlockTimestamp();
    testDefaultSwapExpiryUsesLedgerTime();
    console.log('Node replay semantics tests passed.');
}

run();
