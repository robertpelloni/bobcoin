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
const fixtureFragmentCatalog = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../testing/parity-fixture-fragments.json'), 'utf8'),
);

function getScenario(id) {
    return scenarioCatalog.scenarios.find((scenario) => scenario.id === id);
}

function getFragment(id) {
    return fixtureFragmentCatalog.fragments.find((fragment) => fragment.id === id);
}

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

function testScenarioCatalogTracksMirroredReplayCoverage() {
    const requiredScenarioIds = [
        'same_timestamp_governance_swap',
        'same_timestamp_governance_swap_nft',
        'same_timestamp_governance_swap_nft_manifest',
        'multi_account_same_timestamp_mixed',
        'demurrage_multi_account_same_timestamp_mixed',
        'multi_account_same_timestamp_dual_collector_actions',
        'demurrage_multi_account_same_timestamp_dual_collector_actions',
    ];

    const requiredFragmentIds = [
        'proposer-genesis',
        'proposer-sends-to-voter',
        'proposer-sends-to-collector',
        'same-timestamp-governance-core',
        'same-timestamp-htlc-core',
        'same-timestamp-nft-core',
        'collector-market-bid-core',
        'collector-vote-extension',
        'manifest-anchor-core',
        'demurrage-balance-pressure',
    ];

    assert.ok(scenarioCatalog.version >= 5, 'scenario catalog should be upgraded for explicit test-reference validation');
    assert.ok(fixtureFragmentCatalog.version >= 2, 'fixture fragment catalog should have a version that includes vote-extension fragments');

    for (const fragmentId of requiredFragmentIds) {
        const fragment = getFragment(fragmentId);
        assert.ok(fragment, `fixture fragment catalog should include ${fragmentId}`);
    }

    for (const scenarioId of requiredScenarioIds) {
        const scenario = getScenario(scenarioId);
        assert.ok(scenario, `scenario catalog should include ${scenarioId}`);
        assert.equal(scenario.nodeReplayCovered, true, `${scenarioId} should be marked as covered by Node replay tests`);
        assert.equal(scenario.category, 'mirrored-replay', `${scenarioId} should remain in mirrored replay catalog`);
        assert.ok(Array.isArray(scenario.fragments) && scenario.fragments.length > 0, `${scenarioId} should reference shared fixture fragments`);
        assert.ok(scenario.nodeTest, `${scenarioId} should declare its Node test reference`);
        assert.ok(mirroredScenarioTests[scenario.nodeTest], `${scenarioId} should reference a known Node mirrored scenario test`);
        for (const fragmentId of scenario.fragments) {
            assert.ok(getFragment(fragmentId), `${scenarioId} should only reference known fixture fragments`);
        }
    }
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

function testSameTimestampMixedGovernanceAndSwapSemantics() {
    const lattice = new Lattice();
    const proposer = deriveKeypair('node semantic parity same timestamp proposer');
    const voter = deriveKeypair('node semantic parity same timestamp voter');
    const secret = 'node-same-timestamp-mixed-secret';
    const secretHash = hash(secret);
    const base = 100000;

    const genesis = createSignedBlock({
        type: 'open',
        account: proposer.publicKey,
        previous: null,
        balance: 1000,
        link: 'SYSTEM_GENESIS',
        height: 0,
        staked_balance: 0,
    }, base - 3000, proposer.privateKey);
    lattice.processBlock(genesis);

    const sendToVoter = createSignedBlock({
        type: 'send',
        account: proposer.publicKey,
        previous: genesis.hash,
        balance: lattice.getBalance(proposer.publicKey, base - 2000) - 200,
        link: voter.publicKey,
        height: 1,
        staked_balance: 0,
        spora: validSpora(genesis.hash),
    }, base - 2000, proposer.privateKey);
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
    }, base - 1000, voter.privateKey);
    lattice.processBlock(openVoter);

    const proposal = createSignedBlock({
        type: 'proposal',
        account: proposer.publicKey,
        previous: sendToVoter.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 10,
        link: 'DAO_PROPOSAL',
        height: 2,
        staked_balance: 0,
        spora: validSpora(sendToVoter.hash),
        payload: {
            title: 'Same timestamp mixed governance and swap ledger',
            endTime: new Date(base + 1000).toISOString(),
        },
    }, base, proposer.privateKey);
    lattice.processBlock(proposal);

    const vote = createSignedBlock({
        type: 'vote',
        account: voter.publicKey,
        previous: openVoter.hash,
        balance: lattice.getBalance(voter.publicKey, base),
        link: proposal.hash,
        height: 1,
        staked_balance: 0,
        spora: validSpora(openVoter.hash),
        payload: { vote: 'FOR' },
    }, base, voter.privateKey);
    lattice.processBlock(vote);

    const swapLock = createSignedBlock({
        type: 'swap_lock',
        account: proposer.publicKey,
        previous: proposal.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 75,
        link: 'HTLC_LOCK',
        height: 3,
        staked_balance: 0,
        spora: validSpora(proposal.hash),
        payload: {
            secretHash,
            recipient: proposer.publicKey,
        },
    }, base, proposer.privateKey);
    lattice.processBlock(swapLock);

    const swapClaim = createSignedBlock({
        type: 'swap_claim',
        account: proposer.publicKey,
        previous: swapLock.hash,
        balance: lattice.getBalance(proposer.publicKey, base + 500) + lattice.swaps[secretHash].amount,
        link: 'HTLC_CLAIM',
        height: 4,
        staked_balance: 0,
        spora: validSpora(swapLock.hash),
        payload: {
            secret,
            secretHash,
        },
    }, base + 500, proposer.privateKey);
    lattice.processBlock(swapClaim);

    const finalizer = createSignedBlock({
        type: 'data_anchor',
        account: proposer.publicKey,
        previous: swapClaim.hash,
        balance: lattice.getBalance(proposer.publicKey, base + 2000) - 1,
        link: 'DATA_ANCHOR',
        height: 5,
        staked_balance: 0,
        spora: validSpora(swapClaim.hash),
        payload: {
            magnet: 'magnet:?xt=urn:btih:node-same-timestamp-mixed',
            name: 'node-same-timestamp-mixed.bin',
            size: 1,
        },
    }, base + 2000, proposer.privateKey);
    lattice.processBlock(finalizer);

    assert.equal(lattice.proposals[proposal.hash].status, 'Passed', 'same-timestamp mixed ledger should finalize proposal as Passed');
    assert.equal(lattice.swaps[secretHash].status, 'CLAIMED', 'same-timestamp mixed ledger should preserve claimed swap state');
}

function testSameTimestampGovernanceSwapAndNftSemantics() {
    const lattice = new Lattice();
    const proposer = deriveKeypair('node semantic parity same timestamp nft proposer');
    const voter = deriveKeypair('node semantic parity same timestamp nft voter');
    const secret = 'node-same-timestamp-nft-swap-secret';
    const secretHash = hash(secret);
    const base = 200000;

    const genesis = createSignedBlock({
        type: 'open',
        account: proposer.publicKey,
        previous: null,
        balance: 1000,
        link: 'SYSTEM_GENESIS',
        height: 0,
        staked_balance: 0,
    }, base - 3000, proposer.privateKey);
    lattice.processBlock(genesis);

    const sendToVoter = createSignedBlock({
        type: 'send',
        account: proposer.publicKey,
        previous: genesis.hash,
        balance: lattice.getBalance(proposer.publicKey, base - 2000) - 200,
        link: voter.publicKey,
        height: 1,
        staked_balance: 0,
        spora: validSpora(genesis.hash),
    }, base - 2000, proposer.privateKey);
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
    }, base - 1000, voter.privateKey);
    lattice.processBlock(openVoter);

    const proposal = createSignedBlock({
        type: 'proposal',
        account: proposer.publicKey,
        previous: sendToVoter.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 10,
        link: 'DAO_PROPOSAL',
        height: 2,
        staked_balance: 0,
        spora: validSpora(sendToVoter.hash),
        payload: {
            title: 'Same timestamp governance, swap, and NFT ledger',
            endTime: new Date(base + 1000).toISOString(),
        },
    }, base, proposer.privateKey);
    lattice.processBlock(proposal);

    const vote = createSignedBlock({
        type: 'vote',
        account: voter.publicKey,
        previous: openVoter.hash,
        balance: lattice.getBalance(voter.publicKey, base),
        link: proposal.hash,
        height: 1,
        staked_balance: 0,
        spora: validSpora(openVoter.hash),
        payload: { vote: 'FOR' },
    }, base, voter.privateKey);
    lattice.processBlock(vote);

    const mintNft = createSignedBlock({
        type: 'mint_nft',
        account: proposer.publicKey,
        previous: proposal.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 50,
        link: 'NFT_MINT',
        height: 3,
        staked_balance: 0,
        spora: validSpora(proposal.hash),
        payload: {
            name: 'Node Same Timestamp Artifact',
            magnet: 'magnet:?xt=urn:btih:node-same-timestamp-nft',
            description: 'same timestamp mixed-feature NFT',
        },
    }, base, proposer.privateKey);
    lattice.processBlock(mintNft);

    const transferNft = createSignedBlock({
        type: 'transfer_nft',
        account: proposer.publicKey,
        previous: mintNft.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 1,
        link: mintNft.hash,
        height: 4,
        staked_balance: 0,
        spora: validSpora(mintNft.hash),
        payload: {
            recipient: voter.publicKey,
        },
    }, base, proposer.privateKey);
    lattice.processBlock(transferNft);

    const swapLock = createSignedBlock({
        type: 'swap_lock',
        account: proposer.publicKey,
        previous: transferNft.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 75,
        link: 'HTLC_LOCK',
        height: 5,
        staked_balance: 0,
        spora: validSpora(transferNft.hash),
        payload: {
            secretHash,
            recipient: proposer.publicKey,
        },
    }, base, proposer.privateKey);
    lattice.processBlock(swapLock);

    const swapClaim = createSignedBlock({
        type: 'swap_claim',
        account: proposer.publicKey,
        previous: swapLock.hash,
        balance: lattice.getBalance(proposer.publicKey, base + 500) + lattice.swaps[secretHash].amount,
        link: 'HTLC_CLAIM',
        height: 6,
        staked_balance: 0,
        spora: validSpora(swapLock.hash),
        payload: {
            secret,
            secretHash,
        },
    }, base + 500, proposer.privateKey);
    lattice.processBlock(swapClaim);

    const finalizer = createSignedBlock({
        type: 'data_anchor',
        account: proposer.publicKey,
        previous: swapClaim.hash,
        balance: lattice.getBalance(proposer.publicKey, base + 2000) - 1,
        link: 'DATA_ANCHOR',
        height: 7,
        staked_balance: 0,
        spora: validSpora(swapClaim.hash),
        payload: {
            magnet: 'magnet:?xt=urn:btih:node-same-timestamp-nft-finalizer',
            name: 'node-same-timestamp-nft-finalizer.bin',
            size: 1,
        },
    }, base + 2000, proposer.privateKey);
    lattice.processBlock(finalizer);

    assert.equal(lattice.proposals[proposal.hash].status, 'Passed', 'same-timestamp mixed NFT ledger should finalize proposal as Passed');
    assert.equal(lattice.swaps[secretHash].status, 'CLAIMED', 'same-timestamp mixed NFT ledger should preserve claimed swap state');
    assert.equal(lattice.nfts[mintNft.hash].owner, voter.publicKey, 'same-timestamp mixed NFT ledger should transfer NFT ownership');
}

function testSameTimestampGovernanceSwapNftAndManifestSemantics() {
    const lattice = new Lattice();
    const proposer = deriveKeypair('node semantic parity same timestamp manifest proposer');
    const voter = deriveKeypair('node semantic parity same timestamp manifest voter');
    const secret = 'node-same-timestamp-manifest-secret';
    const secretHash = hash(secret);
    const base = 300000;

    const genesis = createSignedBlock({
        type: 'open',
        account: proposer.publicKey,
        previous: null,
        balance: 1000,
        link: 'SYSTEM_GENESIS',
        height: 0,
        staked_balance: 0,
    }, base - 3000, proposer.privateKey);
    lattice.processBlock(genesis);

    const sendToVoter = createSignedBlock({
        type: 'send',
        account: proposer.publicKey,
        previous: genesis.hash,
        balance: lattice.getBalance(proposer.publicKey, base - 2000) - 200,
        link: voter.publicKey,
        height: 1,
        staked_balance: 0,
        spora: validSpora(genesis.hash),
    }, base - 2000, proposer.privateKey);
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
    }, base - 1000, voter.privateKey);
    lattice.processBlock(openVoter);

    const proposal = createSignedBlock({
        type: 'proposal',
        account: proposer.publicKey,
        previous: sendToVoter.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 10,
        link: 'DAO_PROPOSAL',
        height: 2,
        staked_balance: 0,
        spora: validSpora(sendToVoter.hash),
        payload: {
            title: 'Same timestamp governance, swap, NFT, and manifest ledger',
            endTime: new Date(base + 1000).toISOString(),
        },
    }, base, proposer.privateKey);
    lattice.processBlock(proposal);

    const vote = createSignedBlock({
        type: 'vote',
        account: voter.publicKey,
        previous: openVoter.hash,
        balance: lattice.getBalance(voter.publicKey, base),
        link: proposal.hash,
        height: 1,
        staked_balance: 0,
        spora: validSpora(openVoter.hash),
        payload: { vote: 'FOR' },
    }, base, voter.privateKey);
    lattice.processBlock(vote);

    const mintNft = createSignedBlock({
        type: 'mint_nft',
        account: proposer.publicKey,
        previous: proposal.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 50,
        link: 'NFT_MINT',
        height: 3,
        staked_balance: 0,
        spora: validSpora(proposal.hash),
        payload: {
            name: 'Node Same Timestamp Manifest Artifact',
            magnet: 'magnet:?xt=urn:btih:node-same-timestamp-manifest-nft',
            description: 'same timestamp mixed-feature manifest NFT',
        },
    }, base, proposer.privateKey);
    lattice.processBlock(mintNft);

    const transferNft = createSignedBlock({
        type: 'transfer_nft',
        account: proposer.publicKey,
        previous: mintNft.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 1,
        link: mintNft.hash,
        height: 4,
        staked_balance: 0,
        spora: validSpora(mintNft.hash),
        payload: {
            recipient: voter.publicKey,
        },
    }, base, proposer.privateKey);
    lattice.processBlock(transferNft);

    const swapLock = createSignedBlock({
        type: 'swap_lock',
        account: proposer.publicKey,
        previous: transferNft.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 75,
        link: 'HTLC_LOCK',
        height: 5,
        staked_balance: 0,
        spora: validSpora(transferNft.hash),
        payload: {
            secretHash,
            recipient: proposer.publicKey,
        },
    }, base, proposer.privateKey);
    lattice.processBlock(swapLock);

    const swapClaim = createSignedBlock({
        type: 'swap_claim',
        account: proposer.publicKey,
        previous: swapLock.hash,
        balance: lattice.getBalance(proposer.publicKey, base + 500) + lattice.swaps[secretHash].amount,
        link: 'HTLC_CLAIM',
        height: 6,
        staked_balance: 0,
        spora: validSpora(swapLock.hash),
        payload: {
            secret,
            secretHash,
        },
    }, base + 500, proposer.privateKey);
    lattice.processBlock(swapClaim);

    const manifest = createSignedBlock({
        type: 'publish_manifest',
        account: proposer.publicKey,
        previous: swapClaim.hash,
        balance: lattice.getBalance(proposer.publicKey, base + 1500),
        link: 'MANIFEST_PUBLISH',
        height: 7,
        staked_balance: 0,
        spora: validSpora(swapClaim.hash),
        payload: {
            manifestId: 'node-same-timestamp-manifest',
            locator: 'bobtorrent://manifest/node-same-timestamp-manifest',
            manifestUrl: 'http://localhost:8000/manifests/node-same-timestamp-manifest',
            name: 'node-same-timestamp-manifest.json',
        },
    }, base + 1500, proposer.privateKey);
    lattice.processBlock(manifest);

    const finalizer = createSignedBlock({
        type: 'data_anchor',
        account: proposer.publicKey,
        previous: manifest.hash,
        balance: lattice.getBalance(proposer.publicKey, base + 2000) - 1,
        link: 'DATA_ANCHOR',
        height: 8,
        staked_balance: 0,
        spora: validSpora(manifest.hash),
        payload: {
            magnet: 'magnet:?xt=urn:btih:node-same-timestamp-manifest-finalizer',
            name: 'node-same-timestamp-manifest-finalizer.bin',
            size: 1,
        },
    }, base + 2000, proposer.privateKey);
    lattice.processBlock(finalizer);

    assert.equal(lattice.proposals[proposal.hash].status, 'Passed', 'same-timestamp manifest ledger should finalize proposal as Passed');
    assert.equal(lattice.swaps[secretHash].status, 'CLAIMED', 'same-timestamp manifest ledger should preserve claimed swap state');
    assert.equal(lattice.nfts[mintNft.hash].owner, voter.publicKey, 'same-timestamp manifest ledger should transfer NFT ownership');
    assert.equal(lattice.anchors[manifest.hash].type, 'publish_manifest', 'same-timestamp manifest ledger should persist publish_manifest anchor type');
    assert.equal(lattice.anchors[finalizer.hash].type, 'data_anchor', 'same-timestamp manifest ledger should persist data_anchor anchor type');
}

function testMultiAccountSameTimestampMixedLedgerSemantics() {
    const lattice = new Lattice();
    const proposer = deriveKeypair('node semantic parity multi account proposer');
    const voter = deriveKeypair('node semantic parity multi account voter');
    const collector = deriveKeypair('node semantic parity multi account collector');
    const secret = 'node-multi-account-same-timestamp-secret';
    const secretHash = hash(secret);
    const base = 400000;

    const genesis = createSignedBlock({
        type: 'open',
        account: proposer.publicKey,
        previous: null,
        balance: 1000,
        link: 'SYSTEM_GENESIS',
        height: 0,
        staked_balance: 0,
    }, base - 5000, proposer.privateKey);
    lattice.processBlock(genesis);

    const sendToVoter = createSignedBlock({
        type: 'send',
        account: proposer.publicKey,
        previous: genesis.hash,
        balance: lattice.getBalance(proposer.publicKey, base - 4000) - 200,
        link: voter.publicKey,
        height: 1,
        staked_balance: 0,
        spora: validSpora(genesis.hash),
    }, base - 4000, proposer.privateKey);
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
    }, base - 3500, voter.privateKey);
    lattice.processBlock(openVoter);

    const sendToCollector = createSignedBlock({
        type: 'send',
        account: proposer.publicKey,
        previous: sendToVoter.hash,
        balance: lattice.getBalance(proposer.publicKey, base - 3000) - 150,
        link: collector.publicKey,
        height: 2,
        staked_balance: 0,
        spora: validSpora(sendToVoter.hash),
    }, base - 3000, proposer.privateKey);
    lattice.processBlock(sendToCollector);

    const openCollector = createSignedBlock({
        type: 'open',
        account: collector.publicKey,
        previous: null,
        balance: 150,
        link: sendToCollector.hash,
        height: 0,
        staked_balance: 0,
        spora: validSporaForOpenAccount(collector.publicKey),
    }, base - 2500, collector.privateKey);
    lattice.processBlock(openCollector);

    const proposal = createSignedBlock({
        type: 'proposal',
        account: proposer.publicKey,
        previous: sendToCollector.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 10,
        link: 'DAO_PROPOSAL',
        height: 3,
        staked_balance: 0,
        spora: validSpora(sendToCollector.hash),
        payload: {
            title: 'Multi-account same-timestamp mixed ledger',
            endTime: new Date(base + 1000).toISOString(),
        },
    }, base, proposer.privateKey);
    lattice.processBlock(proposal);

    const vote = createSignedBlock({
        type: 'vote',
        account: voter.publicKey,
        previous: openVoter.hash,
        balance: lattice.getBalance(voter.publicKey, base),
        link: proposal.hash,
        height: 1,
        staked_balance: 0,
        spora: validSpora(openVoter.hash),
        payload: { vote: 'FOR' },
    }, base, voter.privateKey);
    lattice.processBlock(vote);

    const marketBid = createSignedBlock({
        type: 'market_bid',
        account: collector.publicKey,
        previous: openCollector.hash,
        balance: lattice.getBalance(collector.publicKey, base) - 25,
        link: 'STORAGE_MARKET',
        height: 1,
        staked_balance: 0,
        spora: validSpora(openCollector.hash),
        payload: { magnet: 'magnet:?xt=urn:btih:node-multi-account-bid' },
    }, base, collector.privateKey);
    lattice.processBlock(marketBid);

    const mintNft = createSignedBlock({
        type: 'mint_nft',
        account: proposer.publicKey,
        previous: proposal.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 50,
        link: 'NFT_MINT',
        height: 4,
        staked_balance: 0,
        spora: validSpora(proposal.hash),
        payload: {
            name: 'Node Multi Account Artifact',
            magnet: 'magnet:?xt=urn:btih:node-multi-account-nft',
            description: 'multi-account same timestamp NFT',
        },
    }, base, proposer.privateKey);
    lattice.processBlock(mintNft);

    const transferNft = createSignedBlock({
        type: 'transfer_nft',
        account: proposer.publicKey,
        previous: mintNft.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 1,
        link: mintNft.hash,
        height: 5,
        staked_balance: 0,
        spora: validSpora(mintNft.hash),
        payload: {
            recipient: collector.publicKey,
        },
    }, base, proposer.privateKey);
    lattice.processBlock(transferNft);

    const swapLock = createSignedBlock({
        type: 'swap_lock',
        account: proposer.publicKey,
        previous: transferNft.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 75,
        link: 'HTLC_LOCK',
        height: 6,
        staked_balance: 0,
        spora: validSpora(transferNft.hash),
        payload: {
            secretHash,
            recipient: proposer.publicKey,
        },
    }, base, proposer.privateKey);
    lattice.processBlock(swapLock);

    const manifest = createSignedBlock({
        type: 'publish_manifest',
        account: proposer.publicKey,
        previous: swapLock.hash,
        balance: lattice.getBalance(proposer.publicKey, base),
        link: 'MANIFEST_PUBLISH',
        height: 7,
        staked_balance: 0,
        spora: validSpora(swapLock.hash),
        payload: {
            manifestId: 'node-multi-account-manifest',
            locator: 'bobtorrent://manifest/node-multi-account',
            manifestUrl: 'http://localhost:8000/manifests/node-multi-account',
            name: 'node-multi-account-manifest.json',
        },
    }, base, proposer.privateKey);
    lattice.processBlock(manifest);

    const swapClaim = createSignedBlock({
        type: 'swap_claim',
        account: proposer.publicKey,
        previous: manifest.hash,
        balance: lattice.getBalance(proposer.publicKey, base + 500) + lattice.swaps[secretHash].amount,
        link: 'HTLC_CLAIM',
        height: 8,
        staked_balance: 0,
        spora: validSpora(manifest.hash),
        payload: {
            secret,
            secretHash,
        },
    }, base + 500, proposer.privateKey);
    lattice.processBlock(swapClaim);

    const acceptBid = createSignedBlock({
        type: 'accept_bid',
        account: proposer.publicKey,
        previous: swapClaim.hash,
        balance: lattice.getBalance(proposer.publicKey, base + 1500) + lattice.marketBids[marketBid.hash].amount,
        link: marketBid.hash,
        height: 9,
        staked_balance: 0,
        spora: validSpora(swapClaim.hash),
    }, base + 1500, proposer.privateKey);
    lattice.processBlock(acceptBid);

    const finalizer = createSignedBlock({
        type: 'data_anchor',
        account: proposer.publicKey,
        previous: acceptBid.hash,
        balance: lattice.getBalance(proposer.publicKey, base + 2000) - 1,
        link: 'DATA_ANCHOR',
        height: 10,
        staked_balance: 0,
        spora: validSpora(acceptBid.hash),
        payload: {
            magnet: 'magnet:?xt=urn:btih:node-multi-account-finalizer',
            name: 'node-multi-account-finalizer.bin',
            size: 1,
        },
    }, base + 2000, proposer.privateKey);
    lattice.processBlock(finalizer);

    assert.equal(lattice.proposals[proposal.hash].status, 'Passed', 'multi-account same-timestamp ledger should finalize proposal as Passed');
    assert.equal(lattice.swaps[secretHash].status, 'CLAIMED', 'multi-account same-timestamp ledger should preserve claimed swap state');
    assert.equal(lattice.nfts[mintNft.hash].owner, collector.publicKey, 'multi-account same-timestamp ledger should transfer NFT ownership to collector');
    assert.equal(lattice.marketBids[marketBid.hash].status, 'ACCEPTED', 'multi-account same-timestamp ledger should preserve accepted bid state');
    assert.equal(lattice.marketBids[marketBid.hash].acceptedBy, proposer.publicKey, 'multi-account same-timestamp ledger should record bid acceptor');
    assert.equal(lattice.anchors[manifest.hash].type, 'publish_manifest', 'multi-account same-timestamp ledger should persist publish_manifest anchor type');
    assert.equal(lattice.anchors[finalizer.hash].type, 'data_anchor', 'multi-account same-timestamp ledger should persist data_anchor anchor type');
}

function testMultiAccountSameTimestampDualCollectorActionsSemantics() {
    const lattice = new Lattice();
    const proposer = deriveKeypair('node semantic parity dual collector proposer');
    const voter = deriveKeypair('node semantic parity dual collector voter');
    const collector = deriveKeypair('node semantic parity dual collector collector');
    const secret = 'node-dual-collector-same-timestamp-secret';
    const secretHash = hash(secret);
    const base = 450000;

    const genesis = createSignedBlock({
        type: 'open',
        account: proposer.publicKey,
        previous: null,
        balance: 1000,
        link: 'SYSTEM_GENESIS',
        height: 0,
        staked_balance: 0,
    }, base - 5000, proposer.privateKey);
    lattice.processBlock(genesis);

    const sendToVoter = createSignedBlock({
        type: 'send',
        account: proposer.publicKey,
        previous: genesis.hash,
        balance: lattice.getBalance(proposer.publicKey, base - 4000) - 200,
        link: voter.publicKey,
        height: 1,
        staked_balance: 0,
        spora: validSpora(genesis.hash),
    }, base - 4000, proposer.privateKey);
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
    }, base - 3500, voter.privateKey);
    lattice.processBlock(openVoter);

    const sendToCollector = createSignedBlock({
        type: 'send',
        account: proposer.publicKey,
        previous: sendToVoter.hash,
        balance: lattice.getBalance(proposer.publicKey, base - 3000) - 150,
        link: collector.publicKey,
        height: 2,
        staked_balance: 0,
        spora: validSpora(sendToVoter.hash),
    }, base - 3000, proposer.privateKey);
    lattice.processBlock(sendToCollector);

    const openCollector = createSignedBlock({
        type: 'open',
        account: collector.publicKey,
        previous: null,
        balance: 150,
        link: sendToCollector.hash,
        height: 0,
        staked_balance: 0,
        spora: validSporaForOpenAccount(collector.publicKey),
    }, base - 2500, collector.privateKey);
    lattice.processBlock(openCollector);

    const proposal = createSignedBlock({
        type: 'proposal',
        account: proposer.publicKey,
        previous: sendToCollector.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 10,
        link: 'DAO_PROPOSAL',
        height: 3,
        staked_balance: 0,
        spora: validSpora(sendToCollector.hash),
        payload: {
            title: 'Multi-account same-timestamp dual collector actions ledger',
            endTime: new Date(base + 1000).toISOString(),
        },
    }, base, proposer.privateKey);
    lattice.processBlock(proposal);

    const voterVote = createSignedBlock({
        type: 'vote',
        account: voter.publicKey,
        previous: openVoter.hash,
        balance: lattice.getBalance(voter.publicKey, base),
        link: proposal.hash,
        height: 1,
        staked_balance: 0,
        spora: validSpora(openVoter.hash),
        payload: { vote: 'FOR' },
    }, base, voter.privateKey);
    lattice.processBlock(voterVote);

    const collectorVote = createSignedBlock({
        type: 'vote',
        account: collector.publicKey,
        previous: openCollector.hash,
        balance: lattice.getBalance(collector.publicKey, base),
        link: proposal.hash,
        height: 1,
        staked_balance: 0,
        spora: validSpora(openCollector.hash),
        payload: { vote: 'FOR' },
    }, base, collector.privateKey);
    lattice.processBlock(collectorVote);

    const marketBid = createSignedBlock({
        type: 'market_bid',
        account: collector.publicKey,
        previous: collectorVote.hash,
        balance: lattice.getBalance(collector.publicKey, base) - 25,
        link: 'STORAGE_MARKET',
        height: 2,
        staked_balance: 0,
        spora: validSpora(collectorVote.hash),
        payload: { magnet: 'magnet:?xt=urn:btih:node-dual-collector-bid' },
    }, base, collector.privateKey);
    lattice.processBlock(marketBid);

    const mintNft = createSignedBlock({
        type: 'mint_nft',
        account: proposer.publicKey,
        previous: proposal.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 50,
        link: 'NFT_MINT',
        height: 4,
        staked_balance: 0,
        spora: validSpora(proposal.hash),
        payload: {
            name: 'Node Dual Collector Artifact',
            magnet: 'magnet:?xt=urn:btih:node-dual-collector-nft',
            description: 'dual collector same timestamp NFT',
        },
    }, base, proposer.privateKey);
    lattice.processBlock(mintNft);

    const transferNft = createSignedBlock({
        type: 'transfer_nft',
        account: proposer.publicKey,
        previous: mintNft.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 1,
        link: mintNft.hash,
        height: 5,
        staked_balance: 0,
        spora: validSpora(mintNft.hash),
        payload: {
            recipient: collector.publicKey,
        },
    }, base, proposer.privateKey);
    lattice.processBlock(transferNft);

    const swapLock = createSignedBlock({
        type: 'swap_lock',
        account: proposer.publicKey,
        previous: transferNft.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 75,
        link: 'HTLC_LOCK',
        height: 6,
        staked_balance: 0,
        spora: validSpora(transferNft.hash),
        payload: {
            secretHash,
            recipient: proposer.publicKey,
        },
    }, base, proposer.privateKey);
    lattice.processBlock(swapLock);

    const manifest = createSignedBlock({
        type: 'publish_manifest',
        account: proposer.publicKey,
        previous: swapLock.hash,
        balance: lattice.getBalance(proposer.publicKey, base),
        link: 'MANIFEST_PUBLISH',
        height: 7,
        staked_balance: 0,
        spora: validSpora(swapLock.hash),
        payload: {
            manifestId: 'node-dual-collector-manifest',
            locator: 'bobtorrent://manifest/node-dual-collector',
            manifestUrl: 'http://localhost:8000/manifests/node-dual-collector',
            name: 'node-dual-collector-manifest.json',
        },
    }, base, proposer.privateKey);
    lattice.processBlock(manifest);

    const swapClaim = createSignedBlock({
        type: 'swap_claim',
        account: proposer.publicKey,
        previous: manifest.hash,
        balance: lattice.getBalance(proposer.publicKey, base + 500) + lattice.swaps[secretHash].amount,
        link: 'HTLC_CLAIM',
        height: 8,
        staked_balance: 0,
        spora: validSpora(manifest.hash),
        payload: {
            secret,
            secretHash,
        },
    }, base + 500, proposer.privateKey);
    lattice.processBlock(swapClaim);

    const acceptBid = createSignedBlock({
        type: 'accept_bid',
        account: proposer.publicKey,
        previous: swapClaim.hash,
        balance: lattice.getBalance(proposer.publicKey, base + 1500) + lattice.marketBids[marketBid.hash].amount,
        link: marketBid.hash,
        height: 9,
        staked_balance: 0,
        spora: validSpora(swapClaim.hash),
    }, base + 1500, proposer.privateKey);
    lattice.processBlock(acceptBid);

    const finalizer = createSignedBlock({
        type: 'data_anchor',
        account: proposer.publicKey,
        previous: acceptBid.hash,
        balance: lattice.getBalance(proposer.publicKey, base + 2000) - 1,
        link: 'DATA_ANCHOR',
        height: 10,
        staked_balance: 0,
        spora: validSpora(acceptBid.hash),
        payload: {
            magnet: 'magnet:?xt=urn:btih:node-dual-collector-finalizer',
            name: 'node-dual-collector-finalizer.bin',
            size: 1,
        },
    }, base + 2000, proposer.privateKey);
    lattice.processBlock(finalizer);

    assert.equal(lattice.proposals[proposal.hash].status, 'Passed', 'dual collector action ledger should finalize proposal as Passed');
    assert.ok(lattice.votes[proposal.hash][voter.publicKey], 'dual collector action ledger should preserve voter vote');
    assert.ok(lattice.votes[proposal.hash][collector.publicKey], 'dual collector action ledger should preserve collector vote');
    assert.equal(lattice.swaps[secretHash].status, 'CLAIMED', 'dual collector action ledger should preserve claimed swap state');
    assert.equal(lattice.nfts[mintNft.hash].owner, collector.publicKey, 'dual collector action ledger should transfer NFT ownership to collector');
    assert.equal(lattice.marketBids[marketBid.hash].status, 'ACCEPTED', 'dual collector action ledger should preserve accepted bid state');
    assert.equal(lattice.anchors[manifest.hash].type, 'publish_manifest', 'dual collector action ledger should persist publish_manifest anchor type');
    assert.equal(lattice.anchors[finalizer.hash].type, 'data_anchor', 'dual collector action ledger should persist data_anchor anchor type');
}

function testDemurrageSensitiveMultiAccountSameTimestampDualCollectorActionsSemantics() {
    const lattice = new Lattice();
    const proposer = deriveKeypair('node semantic parity demurrage dual collector proposer');
    const voter = deriveKeypair('node semantic parity demurrage dual collector voter');
    const collector = deriveKeypair('node semantic parity demurrage dual collector collector');
    const secret = 'node-demurrage-dual-collector-secret';
    const secretHash = hash(secret);
    const base = 550000;

    const genesis = createSignedBlock({
        type: 'open',
        account: proposer.publicKey,
        previous: null,
        balance: 1000,
        link: 'SYSTEM_GENESIS',
        height: 0,
        staked_balance: 0,
    }, base - 120000, proposer.privateKey);
    lattice.processBlock(genesis);

    const sendToVoter = createSignedBlock({
        type: 'send',
        account: proposer.publicKey,
        previous: genesis.hash,
        balance: lattice.getBalance(proposer.publicKey, base - 90000) - 200,
        link: voter.publicKey,
        height: 1,
        staked_balance: 0,
        spora: validSpora(genesis.hash),
    }, base - 90000, proposer.privateKey);
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
    }, base - 89000, voter.privateKey);
    lattice.processBlock(openVoter);

    const sendToCollector = createSignedBlock({
        type: 'send',
        account: proposer.publicKey,
        previous: sendToVoter.hash,
        balance: lattice.getBalance(proposer.publicKey, base - 60000) - 150,
        link: collector.publicKey,
        height: 2,
        staked_balance: 0,
        spora: validSpora(sendToVoter.hash),
    }, base - 60000, proposer.privateKey);
    lattice.processBlock(sendToCollector);

    const openCollector = createSignedBlock({
        type: 'open',
        account: collector.publicKey,
        previous: null,
        balance: 150,
        link: sendToCollector.hash,
        height: 0,
        staked_balance: 0,
        spora: validSporaForOpenAccount(collector.publicKey),
    }, base - 59000, collector.privateKey);
    lattice.processBlock(openCollector);

    const proposal = createSignedBlock({
        type: 'proposal',
        account: proposer.publicKey,
        previous: sendToCollector.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 10,
        link: 'DAO_PROPOSAL',
        height: 3,
        staked_balance: 0,
        spora: validSpora(sendToCollector.hash),
        payload: {
            title: 'Demurrage-sensitive dual collector same-timestamp ledger',
            endTime: new Date(base + 1000).toISOString(),
        },
    }, base, proposer.privateKey);
    lattice.processBlock(proposal);

    const voterVote = createSignedBlock({
        type: 'vote',
        account: voter.publicKey,
        previous: openVoter.hash,
        balance: lattice.getBalance(voter.publicKey, base),
        link: proposal.hash,
        height: 1,
        staked_balance: 0,
        spora: validSpora(openVoter.hash),
        payload: { vote: 'FOR' },
    }, base, voter.privateKey);
    lattice.processBlock(voterVote);

    const collectorVote = createSignedBlock({
        type: 'vote',
        account: collector.publicKey,
        previous: openCollector.hash,
        balance: lattice.getBalance(collector.publicKey, base),
        link: proposal.hash,
        height: 1,
        staked_balance: 0,
        spora: validSpora(openCollector.hash),
        payload: { vote: 'FOR' },
    }, base, collector.privateKey);
    lattice.processBlock(collectorVote);

    const marketBid = createSignedBlock({
        type: 'market_bid',
        account: collector.publicKey,
        previous: collectorVote.hash,
        balance: lattice.getBalance(collector.publicKey, base) - 25,
        link: 'STORAGE_MARKET',
        height: 2,
        staked_balance: 0,
        spora: validSpora(collectorVote.hash),
        payload: { magnet: 'magnet:?xt=urn:btih:node-demurrage-dual-collector-bid' },
    }, base, collector.privateKey);
    lattice.processBlock(marketBid);

    const mintNft = createSignedBlock({
        type: 'mint_nft',
        account: proposer.publicKey,
        previous: proposal.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 50,
        link: 'NFT_MINT',
        height: 4,
        staked_balance: 0,
        spora: validSpora(proposal.hash),
        payload: {
            name: 'Node Demurrage Dual Collector Artifact',
            magnet: 'magnet:?xt=urn:btih:node-demurrage-dual-collector-nft',
            description: 'demurrage-sensitive dual collector NFT',
        },
    }, base, proposer.privateKey);
    lattice.processBlock(mintNft);

    const transferNft = createSignedBlock({
        type: 'transfer_nft',
        account: proposer.publicKey,
        previous: mintNft.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 1,
        link: mintNft.hash,
        height: 5,
        staked_balance: 0,
        spora: validSpora(mintNft.hash),
        payload: {
            recipient: collector.publicKey,
        },
    }, base, proposer.privateKey);
    lattice.processBlock(transferNft);

    const swapLock = createSignedBlock({
        type: 'swap_lock',
        account: proposer.publicKey,
        previous: transferNft.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 75,
        link: 'HTLC_LOCK',
        height: 6,
        staked_balance: 0,
        spora: validSpora(transferNft.hash),
        payload: {
            secretHash,
            recipient: proposer.publicKey,
        },
    }, base, proposer.privateKey);
    lattice.processBlock(swapLock);

    const manifest = createSignedBlock({
        type: 'publish_manifest',
        account: proposer.publicKey,
        previous: swapLock.hash,
        balance: lattice.getBalance(proposer.publicKey, base),
        link: 'MANIFEST_PUBLISH',
        height: 7,
        staked_balance: 0,
        spora: validSpora(swapLock.hash),
        payload: {
            manifestId: 'node-demurrage-dual-collector-manifest',
            locator: 'bobtorrent://manifest/node-demurrage-dual-collector',
            manifestUrl: 'http://localhost:8000/manifests/node-demurrage-dual-collector',
            name: 'node-demurrage-dual-collector-manifest.json',
        },
    }, base, proposer.privateKey);
    lattice.processBlock(manifest);

    const swapClaim = createSignedBlock({
        type: 'swap_claim',
        account: proposer.publicKey,
        previous: manifest.hash,
        balance: lattice.getBalance(proposer.publicKey, base + 500) + lattice.swaps[secretHash].amount,
        link: 'HTLC_CLAIM',
        height: 8,
        staked_balance: 0,
        spora: validSpora(manifest.hash),
        payload: {
            secret,
            secretHash,
        },
    }, base + 500, proposer.privateKey);
    lattice.processBlock(swapClaim);

    const acceptBid = createSignedBlock({
        type: 'accept_bid',
        account: proposer.publicKey,
        previous: swapClaim.hash,
        balance: lattice.getBalance(proposer.publicKey, base + 1500) + lattice.marketBids[marketBid.hash].amount,
        link: marketBid.hash,
        height: 9,
        staked_balance: 0,
        spora: validSpora(swapClaim.hash),
    }, base + 1500, proposer.privateKey);
    lattice.processBlock(acceptBid);

    const finalizer = createSignedBlock({
        type: 'data_anchor',
        account: proposer.publicKey,
        previous: acceptBid.hash,
        balance: lattice.getBalance(proposer.publicKey, base + 3000) - 1,
        link: 'DATA_ANCHOR',
        height: 10,
        staked_balance: 0,
        spora: validSpora(acceptBid.hash),
        payload: {
            magnet: 'magnet:?xt=urn:btih:node-demurrage-dual-collector-finalizer',
            name: 'node-demurrage-dual-collector-finalizer.bin',
            size: 1,
        },
    }, base + 3000, proposer.privateKey);
    lattice.processBlock(finalizer);

    assert.equal(lattice.proposals[proposal.hash].status, 'Passed', 'demurrage-sensitive dual collector ledger should finalize proposal as Passed');
    assert.ok(lattice.votes[proposal.hash][voter.publicKey], 'demurrage-sensitive dual collector ledger should preserve voter vote');
    assert.ok(lattice.votes[proposal.hash][collector.publicKey], 'demurrage-sensitive dual collector ledger should preserve collector vote');
    assert.equal(lattice.swaps[secretHash].status, 'CLAIMED', 'demurrage-sensitive dual collector ledger should preserve claimed swap state');
    assert.equal(lattice.nfts[mintNft.hash].owner, collector.publicKey, 'demurrage-sensitive dual collector ledger should transfer NFT ownership to collector');
    assert.equal(lattice.marketBids[marketBid.hash].status, 'ACCEPTED', 'demurrage-sensitive dual collector ledger should preserve accepted bid state');
    assert.equal(lattice.anchors[manifest.hash].type, 'publish_manifest', 'demurrage-sensitive dual collector ledger should persist publish_manifest anchor type');
    assert.equal(lattice.anchors[finalizer.hash].type, 'data_anchor', 'demurrage-sensitive dual collector ledger should persist data_anchor anchor type');
}

function testDemurrageSensitiveMultiAccountSameTimestampMixedLedgerSemantics() {
    const lattice = new Lattice();
    const proposer = deriveKeypair('node semantic parity demurrage multi proposer');
    const voter = deriveKeypair('node semantic parity demurrage multi voter');
    const collector = deriveKeypair('node semantic parity demurrage multi collector');
    const secret = 'node-demurrage-multi-account-secret';
    const secretHash = hash(secret);
    const base = 500000;

    const genesis = createSignedBlock({
        type: 'open',
        account: proposer.publicKey,
        previous: null,
        balance: 1000,
        link: 'SYSTEM_GENESIS',
        height: 0,
        staked_balance: 0,
    }, base - 120000, proposer.privateKey);
    lattice.processBlock(genesis);

    const sendToVoter = createSignedBlock({
        type: 'send',
        account: proposer.publicKey,
        previous: genesis.hash,
        balance: lattice.getBalance(proposer.publicKey, base - 90000) - 200,
        link: voter.publicKey,
        height: 1,
        staked_balance: 0,
        spora: validSpora(genesis.hash),
    }, base - 90000, proposer.privateKey);
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
    }, base - 89000, voter.privateKey);
    lattice.processBlock(openVoter);

    const sendToCollector = createSignedBlock({
        type: 'send',
        account: proposer.publicKey,
        previous: sendToVoter.hash,
        balance: lattice.getBalance(proposer.publicKey, base - 60000) - 150,
        link: collector.publicKey,
        height: 2,
        staked_balance: 0,
        spora: validSpora(sendToVoter.hash),
    }, base - 60000, proposer.privateKey);
    lattice.processBlock(sendToCollector);

    const openCollector = createSignedBlock({
        type: 'open',
        account: collector.publicKey,
        previous: null,
        balance: 150,
        link: sendToCollector.hash,
        height: 0,
        staked_balance: 0,
        spora: validSporaForOpenAccount(collector.publicKey),
    }, base - 59000, collector.privateKey);
    lattice.processBlock(openCollector);

    const proposal = createSignedBlock({
        type: 'proposal',
        account: proposer.publicKey,
        previous: sendToCollector.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 10,
        link: 'DAO_PROPOSAL',
        height: 3,
        staked_balance: 0,
        spora: validSpora(sendToCollector.hash),
        payload: {
            title: 'Demurrage-sensitive multi-account same-timestamp ledger',
            endTime: new Date(base + 1000).toISOString(),
        },
    }, base, proposer.privateKey);
    lattice.processBlock(proposal);

    const vote = createSignedBlock({
        type: 'vote',
        account: voter.publicKey,
        previous: openVoter.hash,
        balance: lattice.getBalance(voter.publicKey, base),
        link: proposal.hash,
        height: 1,
        staked_balance: 0,
        spora: validSpora(openVoter.hash),
        payload: { vote: 'FOR' },
    }, base, voter.privateKey);
    lattice.processBlock(vote);

    const marketBid = createSignedBlock({
        type: 'market_bid',
        account: collector.publicKey,
        previous: openCollector.hash,
        balance: lattice.getBalance(collector.publicKey, base) - 25,
        link: 'STORAGE_MARKET',
        height: 1,
        staked_balance: 0,
        spora: validSpora(openCollector.hash),
        payload: { magnet: 'magnet:?xt=urn:btih:node-demurrage-multi-bid' },
    }, base, collector.privateKey);
    lattice.processBlock(marketBid);

    const mintNft = createSignedBlock({
        type: 'mint_nft',
        account: proposer.publicKey,
        previous: proposal.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 50,
        link: 'NFT_MINT',
        height: 4,
        staked_balance: 0,
        spora: validSpora(proposal.hash),
        payload: {
            name: 'Node Demurrage Multi Artifact',
            magnet: 'magnet:?xt=urn:btih:node-demurrage-multi-nft',
            description: 'demurrage-sensitive multi-account NFT',
        },
    }, base, proposer.privateKey);
    lattice.processBlock(mintNft);

    const transferNft = createSignedBlock({
        type: 'transfer_nft',
        account: proposer.publicKey,
        previous: mintNft.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 1,
        link: mintNft.hash,
        height: 5,
        staked_balance: 0,
        spora: validSpora(mintNft.hash),
        payload: {
            recipient: collector.publicKey,
        },
    }, base, proposer.privateKey);
    lattice.processBlock(transferNft);

    const swapLock = createSignedBlock({
        type: 'swap_lock',
        account: proposer.publicKey,
        previous: transferNft.hash,
        balance: lattice.getBalance(proposer.publicKey, base) - 75,
        link: 'HTLC_LOCK',
        height: 6,
        staked_balance: 0,
        spora: validSpora(transferNft.hash),
        payload: {
            secretHash,
            recipient: proposer.publicKey,
        },
    }, base, proposer.privateKey);
    lattice.processBlock(swapLock);

    const manifest = createSignedBlock({
        type: 'publish_manifest',
        account: proposer.publicKey,
        previous: swapLock.hash,
        balance: lattice.getBalance(proposer.publicKey, base),
        link: 'MANIFEST_PUBLISH',
        height: 7,
        staked_balance: 0,
        spora: validSpora(swapLock.hash),
        payload: {
            manifestId: 'node-demurrage-multi-manifest',
            locator: 'bobtorrent://manifest/node-demurrage-multi',
            manifestUrl: 'http://localhost:8000/manifests/node-demurrage-multi',
            name: 'node-demurrage-multi-manifest.json',
        },
    }, base, proposer.privateKey);
    lattice.processBlock(manifest);

    const swapClaim = createSignedBlock({
        type: 'swap_claim',
        account: proposer.publicKey,
        previous: manifest.hash,
        balance: lattice.getBalance(proposer.publicKey, base + 500) + lattice.swaps[secretHash].amount,
        link: 'HTLC_CLAIM',
        height: 8,
        staked_balance: 0,
        spora: validSpora(manifest.hash),
        payload: {
            secret,
            secretHash,
        },
    }, base + 500, proposer.privateKey);
    lattice.processBlock(swapClaim);

    const acceptBid = createSignedBlock({
        type: 'accept_bid',
        account: proposer.publicKey,
        previous: swapClaim.hash,
        balance: lattice.getBalance(proposer.publicKey, base + 1500) + lattice.marketBids[marketBid.hash].amount,
        link: marketBid.hash,
        height: 9,
        staked_balance: 0,
        spora: validSpora(swapClaim.hash),
    }, base + 1500, proposer.privateKey);
    lattice.processBlock(acceptBid);

    const finalizer = createSignedBlock({
        type: 'data_anchor',
        account: proposer.publicKey,
        previous: acceptBid.hash,
        balance: lattice.getBalance(proposer.publicKey, base + 3000) - 1,
        link: 'DATA_ANCHOR',
        height: 10,
        staked_balance: 0,
        spora: validSpora(acceptBid.hash),
        payload: {
            magnet: 'magnet:?xt=urn:btih:node-demurrage-multi-finalizer',
            name: 'node-demurrage-multi-finalizer.bin',
            size: 1,
        },
    }, base + 3000, proposer.privateKey);
    lattice.processBlock(finalizer);

    assert.equal(lattice.proposals[proposal.hash].status, 'Passed', 'demurrage-sensitive multi-account ledger should finalize proposal as Passed');
    assert.equal(lattice.swaps[secretHash].status, 'CLAIMED', 'demurrage-sensitive multi-account ledger should preserve claimed swap state');
    assert.equal(lattice.nfts[mintNft.hash].owner, collector.publicKey, 'demurrage-sensitive multi-account ledger should transfer NFT ownership to collector');
    assert.equal(lattice.marketBids[marketBid.hash].status, 'ACCEPTED', 'demurrage-sensitive multi-account ledger should preserve accepted bid state');
    assert.equal(lattice.anchors[manifest.hash].type, 'publish_manifest', 'demurrage-sensitive multi-account ledger should persist publish_manifest anchor type');
    assert.equal(lattice.anchors[finalizer.hash].type, 'data_anchor', 'demurrage-sensitive multi-account ledger should persist data_anchor anchor type');
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

const mirroredScenarioTests = {
    testSameTimestampMixedGovernanceAndSwapSemantics,
    testSameTimestampGovernanceSwapAndNftSemantics,
    testSameTimestampGovernanceSwapNftAndManifestSemantics,
    testMultiAccountSameTimestampMixedLedgerSemantics,
    testDemurrageSensitiveMultiAccountSameTimestampMixedLedgerSemantics,
    testMultiAccountSameTimestampDualCollectorActionsSemantics,
    testDemurrageSensitiveMultiAccountSameTimestampDualCollectorActionsSemantics,
};

function testGovernanceActionExecution() {
    const lattice = new Lattice();
    const proposer = deriveKeypair('node gov exec proposer');
    const target = deriveKeypair('node gov target');

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

    const proposal = createSignedBlock({
        type: 'proposal',
        account: proposer.publicKey,
        previous: genesis.hash,
        balance: 990,
        link: 'DAO_PROPOSAL',
        height: 1,
        staked_balance: 0,
        spora: validSpora(genesis.hash),
        payload: {
            title: 'Treasury Mint',
            endTime: new Date(10000).toISOString(),
            action: 'MINT_TREASURY',
            target: target.publicKey,
            amount: 100
        },
    }, 2, proposer.privateKey);
    lattice.processBlock(proposal);

    // Vote and finalize
    const vote = createSignedBlock({
        type: 'vote',
        account: proposer.publicKey,
        previous: proposal.hash,
        balance: 990,
        link: proposal.hash,
        height: 2,
        staked_balance: 0,
        spora: validSpora(proposal.hash),
        payload: { vote: 'FOR' },
    }, 3, proposer.privateKey);
    lattice.processBlock(vote);

    // Later block to trigger finalization
    const finalizer = createSignedBlock({
        type: 'achievement_unlock',
        account: proposer.publicKey,
        previous: vote.hash,
        balance: lattice.getBalance(proposer.publicKey, 20000),
        link: 'DONE',
        height: 3,
        staked_balance: 0,
        spora: validSpora(vote.hash),
    }, 20000, proposer.privateKey);
    lattice.processBlock(finalizer);

    assert.equal(lattice.proposals[proposal.hash].status, 'Passed', 'proposal should pass');
    assert.ok(lattice.pending[target.publicKey], 'target should have pending funds');
    assert.equal(lattice.pending[target.publicKey][0].amount, 100, 'amount should match');
}

function testMarketBidExpiry() {
    const lattice = new Lattice();
    const keys = deriveKeypair('node bid expiry');

    const genesis = createSignedBlock({
        type: 'open',
        account: keys.publicKey,
        previous: null,
        balance: 1000,
        link: 'SYSTEM_GENESIS',
        height: 0,
        staked_balance: 0,
    }, 1000, keys.privateKey);
    lattice.processBlock(genesis);

    const bid = createSignedBlock({
        type: 'market_bid',
        account: keys.publicKey,
        previous: genesis.hash,
        balance: 950,
        link: 'STORAGE_MARKET',
        height: 1,
        staked_balance: 0,
        spora: validSpora(genesis.hash),
        payload: {
            magnet: 'm',
            expiry: 2000 // Expire at 2s
        }
    }, 1500, keys.privateKey);
    lattice.processBlock(bid);

    assert.equal(lattice.marketBids[bid.hash].status, 'OPEN', 'should be open');

    const finalizer = createSignedBlock({
        type: 'achievement_unlock',
        account: keys.publicKey,
        previous: bid.hash,
        balance: lattice.getBalance(keys.publicKey, 5000),
        link: 'DONE',
        height: 2,
        staked_balance: 0,
        spora: validSpora(bid.hash),
    }, 5000, keys.privateKey);
    lattice.processBlock(finalizer);

    assert.equal(lattice.marketBids[bid.hash].status, 'EXPIRED', 'bid should be expired by later block timestamp');
}

function run() {
    testScenarioCatalogTracksMirroredReplayCoverage();
    testHistoricalVoteUsesBlockTimestamp();
    testHistoricalSwapClaimUsesBlockTimestamp();
    testDefaultSwapExpiryUsesLedgerTime();
    testProposalFinalizesOnLaterLedgerTime();
    testMixedGovernanceAndSwapLedgerSemantics();
    testSameTimestampMixedGovernanceAndSwapSemantics();
    testSameTimestampGovernanceSwapAndNftSemantics();
    testSameTimestampGovernanceSwapNftAndManifestSemantics();
    testMultiAccountSameTimestampMixedLedgerSemantics();
    testMultiAccountSameTimestampDualCollectorActionsSemantics();
    testDemurrageSensitiveMultiAccountSameTimestampDualCollectorActionsSemantics();
    testDemurrageSensitiveMultiAccountSameTimestampMixedLedgerSemantics();
    testDemurrageSensitiveMixedLedgerSemantics();
    testGovernanceActionExecution();
    testMarketBidExpiry();
    console.log('Node replay semantics tests passed.');
}

run();
