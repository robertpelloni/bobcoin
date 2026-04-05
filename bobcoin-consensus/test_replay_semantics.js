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

function testProposalFinalizesOnLaterLedgerTime() {
    const lattice = new Lattice();
    const proposer = deriveKeypair('node semantic parity finalize proposer');
    const voter = deriveKeypair('node semantic parity finalize voter');

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
        balance: lattice.getBalance(proposer.publicKey, 1000) - 10,
        link: 'DAO_PROPOSAL',
        height: 2,
        staked_balance: 0,
        spora: validSpora(sendToVoter.hash),
        payload: {
            title: 'Proposal finalizes on later ledger time',
            endTime: new Date(2000).toISOString(),
        },
    }, 1000, proposer.privateKey);
    lattice.processBlock(proposal);

    const vote = createSignedBlock({
        type: 'vote',
        account: voter.publicKey,
        previous: openVoter.hash,
        balance: lattice.getBalance(voter.publicKey, 1500),
        link: proposal.hash,
        height: 1,
        staked_balance: 0,
        spora: validSpora(openVoter.hash),
        payload: { vote: 'FOR' },
    }, 1500, voter.privateKey);
    lattice.processBlock(vote);

    const finalizer = createSignedBlock({
        type: 'data_anchor',
        account: proposer.publicKey,
        previous: proposal.hash,
        balance: lattice.getBalance(proposer.publicKey, 3000) - 1,
        link: 'DATA_ANCHOR',
        height: 3,
        staked_balance: 0,
        spora: validSpora(proposal.hash),
        payload: {
            magnet: 'magnet:?xt=urn:btih:node-proposal-finalizer',
            name: 'proposal-finalizer.bin',
            size: 1,
        },
    }, 3000, proposer.privateKey);
    lattice.processBlock(finalizer);

    assert.equal(lattice.proposals[proposal.hash].status, 'Passed', 'later ledger-time block should finalize proposal status');
}

function testMixedGovernanceAndSwapLedgerSemantics() {
    const lattice = new Lattice();
    const proposer = deriveKeypair('node semantic parity mixed proposer');
    const voter = deriveKeypair('node semantic parity mixed voter');
    const secret = 'node-mixed-governance-swap-secret';
    const secretHash = hash(secret);

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
        balance: lattice.getBalance(proposer.publicKey, 1000) - 10,
        link: 'DAO_PROPOSAL',
        height: 2,
        staked_balance: 0,
        spora: validSpora(sendToVoter.hash),
        payload: {
            title: 'Mixed governance and swap ledger',
            endTime: new Date(2500).toISOString(),
        },
    }, 1000, proposer.privateKey);
    lattice.processBlock(proposal);

    const vote = createSignedBlock({
        type: 'vote',
        account: voter.publicKey,
        previous: openVoter.hash,
        balance: lattice.getBalance(voter.publicKey, 1500),
        link: proposal.hash,
        height: 1,
        staked_balance: 0,
        spora: validSpora(openVoter.hash),
        payload: { vote: 'FOR' },
    }, 1500, voter.privateKey);
    lattice.processBlock(vote);

    const swapLock = createSignedBlock({
        type: 'swap_lock',
        account: proposer.publicKey,
        previous: proposal.hash,
        balance: lattice.getBalance(proposer.publicKey, 1600) - 75,
        link: 'HTLC_LOCK',
        height: 3,
        staked_balance: 0,
        spora: validSpora(proposal.hash),
        payload: {
            secretHash,
            recipient: proposer.publicKey,
        },
    }, 1600, proposer.privateKey);
    lattice.processBlock(swapLock);

    const swapClaim = createSignedBlock({
        type: 'swap_claim',
        account: proposer.publicKey,
        previous: swapLock.hash,
        balance: lattice.getBalance(proposer.publicKey, 1700) + lattice.swaps[secretHash].amount,
        link: 'HTLC_CLAIM',
        height: 4,
        staked_balance: 0,
        spora: validSpora(swapLock.hash),
        payload: {
            secret,
            secretHash,
        },
    }, 1700, proposer.privateKey);
    lattice.processBlock(swapClaim);

    const finalizer = createSignedBlock({
        type: 'data_anchor',
        account: proposer.publicKey,
        previous: swapClaim.hash,
        balance: lattice.getBalance(proposer.publicKey, 3000) - 1,
        link: 'DATA_ANCHOR',
        height: 5,
        staked_balance: 0,
        spora: validSpora(swapClaim.hash),
        payload: {
            magnet: 'magnet:?xt=urn:btih:node-mixed-finalizer',
            name: 'mixed-finalizer.bin',
            size: 1,
        },
    }, 3000, proposer.privateKey);
    lattice.processBlock(finalizer);

    assert.equal(lattice.proposals[proposal.hash].status, 'Passed', 'mixed ledger should finalize proposal as Passed');
    assert.equal(lattice.swaps[secretHash].status, 'CLAIMED', 'mixed ledger should preserve claimed swap state');
}

function testDemurrageSensitiveMixedLedgerSemantics() {
    const lattice = new Lattice();
    const proposer = deriveKeypair('node semantic parity demurrage proposer');
    const voter = deriveKeypair('node semantic parity demurrage voter');
    const secret = 'node-demurrage-mixed-secret';
    const secretHash = hash(secret);

    const genesis = createSignedBlock({
        type: 'open',
        account: proposer.publicKey,
        previous: null,
        balance: 1000,
        link: 'SYSTEM_GENESIS',
        height: 0,
        staked_balance: 0,
    }, 1000, proposer.privateKey);
    lattice.processBlock(genesis);

    const sendTs = 61000;
    const sendToVoter = createSignedBlock({
        type: 'send',
        account: proposer.publicKey,
        previous: genesis.hash,
        balance: lattice.getBalance(proposer.publicKey, sendTs) - 200,
        link: voter.publicKey,
        height: 1,
        staked_balance: 0,
        spora: validSpora(genesis.hash),
    }, sendTs, proposer.privateKey);
    lattice.processBlock(sendToVoter);

    const openTs = 61100;
    const openVoter = createSignedBlock({
        type: 'open',
        account: voter.publicKey,
        previous: null,
        balance: 200,
        link: sendToVoter.hash,
        height: 0,
        staked_balance: 0,
        spora: validSporaForOpenAccount(voter.publicKey),
    }, openTs, voter.privateKey);
    lattice.processBlock(openVoter);

    const proposalTs = 121000;
    const proposal = createSignedBlock({
        type: 'proposal',
        account: proposer.publicKey,
        previous: sendToVoter.hash,
        balance: lattice.getBalance(proposer.publicKey, proposalTs) - 10,
        link: 'DAO_PROPOSAL',
        height: 2,
        staked_balance: 0,
        spora: validSpora(sendToVoter.hash),
        payload: {
            title: 'Demurrage sensitive mixed ledger',
            endTime: new Date(proposalTs + 3000).toISOString(),
        },
    }, proposalTs, proposer.privateKey);
    lattice.processBlock(proposal);

    const voteTs = 121500;
    const vote = createSignedBlock({
        type: 'vote',
        account: voter.publicKey,
        previous: openVoter.hash,
        balance: lattice.getBalance(voter.publicKey, voteTs),
        link: proposal.hash,
        height: 1,
        staked_balance: 0,
        spora: validSpora(openVoter.hash),
        payload: { vote: 'FOR' },
    }, voteTs, voter.privateKey);
    lattice.processBlock(vote);

    const swapLockTs = 122000;
    const swapLock = createSignedBlock({
        type: 'swap_lock',
        account: proposer.publicKey,
        previous: proposal.hash,
        balance: lattice.getBalance(proposer.publicKey, swapLockTs) - 75,
        link: 'HTLC_LOCK',
        height: 3,
        staked_balance: 0,
        spora: validSpora(proposal.hash),
        payload: {
            secretHash,
            recipient: proposer.publicKey,
        },
    }, swapLockTs, proposer.privateKey);
    lattice.processBlock(swapLock);

    const swapClaimTs = 122500;
    const swapClaim = createSignedBlock({
        type: 'swap_claim',
        account: proposer.publicKey,
        previous: swapLock.hash,
        balance: lattice.getBalance(proposer.publicKey, swapClaimTs) + lattice.swaps[secretHash].amount,
        link: 'HTLC_CLAIM',
        height: 4,
        staked_balance: 0,
        spora: validSpora(swapLock.hash),
        payload: {
            secret,
            secretHash,
        },
    }, swapClaimTs, proposer.privateKey);
    lattice.processBlock(swapClaim);

    const finalizerTs = proposalTs + 5000;
    const finalizer = createSignedBlock({
        type: 'data_anchor',
        account: proposer.publicKey,
        previous: swapClaim.hash,
        balance: lattice.getBalance(proposer.publicKey, finalizerTs) - 1,
        link: 'DATA_ANCHOR',
        height: 5,
        staked_balance: 0,
        spora: validSpora(swapClaim.hash),
        payload: {
            magnet: 'magnet:?xt=urn:btih:node-demurrage-mixed',
            name: 'node-demurrage-mixed.bin',
            size: 1,
        },
    }, finalizerTs, proposer.privateKey);
    lattice.processBlock(finalizer);

    const proposerFrontier = lattice.getFrontier(proposer.publicKey);
    assert.equal(lattice.proposals[proposal.hash].status, 'Passed', 'demurrage-sensitive mixed ledger should finalize proposal as Passed');
    assert.equal(lattice.swaps[secretHash].status, 'CLAIMED', 'demurrage-sensitive mixed ledger should preserve claimed swap state');
    assert.ok(Math.abs(proposerFrontier.balance - finalizer.balance) < 0.001, 'frontier balance should match final demurrage-adjusted manifest balance');
}

function run() {
    testHistoricalVoteUsesBlockTimestamp();
    testHistoricalSwapClaimUsesBlockTimestamp();
    testDefaultSwapExpiryUsesLedgerTime();
    testProposalFinalizesOnLaterLedgerTime();
    testMixedGovernanceAndSwapLedgerSemantics();
    testDemurrageSensitiveMixedLedgerSemantics();
    console.log('Node replay semantics tests passed.');
}

run();
