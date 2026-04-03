// test_e2e.js
// Simulates the full flow: User Wallet -> GameServer -> Lattice Network
import fetch from 'node-fetch';
import { generateKeypair, sign } from './bobcoin-consensus/cryptoUtils.js';
import { Block } from './bobcoin-consensus/Block.js';

const GAME_SERVER_URL = process.env.GAME_SERVER_URL || 'http://localhost:3001';
const LATTICE_URL = process.env.LATTICE_URL || 'http://localhost:4000';

async function testFlow() {
    console.log("=== STARTING LATTICE E2E TEST ===");

    // 1. User Wallet Generation
    const userWallet = generateKeypair();
    console.log("1. Generated User Wallet:", userWallet.publicKey.substr(0, 16) + '...');

    // 2. Submit Proof
    const score = 5000; // > 1000 to mint
    
    const proofPayload = {
        playerId: "test_player_" + Date.now(),
        publicValues: {
            score,
            perfects: 50,
            greats: 0,
            misses: 0,
            address: userWallet.publicKey // Include address for reward
        },
        proofBytes: "mock_bytes" 
    };

    console.log("2. Submitting ZK Proof to Game Server...");
    try {
        const res = await fetch(`${GAME_SERVER_URL}/submit-proof`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proof: proofPayload })
        });
        const data = await res.json();
        
        if (data.success) {
            console.log("✅ Proof Verified & System 'Send' block broadcasted! TX:", data.hash);
        } else {
            console.error("❌ Failed:", data.error);
            process.exit(1);
        }
    } catch (e) {
        console.error("❌ Network Error:", e.message);
        process.exit(1);
    }

    // Give Lattice time to process
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. User Wallet Fetches Pending
    console.log("3. Fetching pending blocks from Lattice...");
    const pendRes = await fetch(`${LATTICE_URL}/pending/${userWallet.publicKey}`);
    const pendData = await pendRes.json();
    
    if (!pendData.pending || pendData.pending.length === 0) {
        console.error("❌ No pending funds found!");
        process.exit(1);
    }

    const pendingTx = pendData.pending[0];
    console.log(`✅ Found pending funds: ${pendingTx.amount} BOB from ${pendingTx.sender.substr(0, 8)}...`);

    // 4. User Creates and Signs 'Open' Block
    console.log("4. User requests SPoRA challenge from local Supernode...");
    const { hash } = await import('./bobcoin-consensus/cryptoUtils.js');
    const baseHash = hash(userWallet.publicKey);
    const expectedChallenge = parseInt(baseHash.substr(0, 8), 16);
    const sporaRes = await fetch(`http://localhost:8081/spora/${expectedChallenge}`);
    const sporaData = await sporaRes.json();

    if (!sporaData.success) {
        console.error("❌ Failed to generate SPoRA Proof. Ensure supernode is seeding Anchors.");
        process.exit(1);
    }
    
    console.log("5. User signs and broadcasts 'Open' receive block with SPoRA...");
    const receiveBlock = new Block({
        type: 'open',
        account: userWallet.publicKey,
        previous: null, // First block in user's chain
        balance: pendingTx.amount, // New balance
        link: pendingTx.hash, // Link to system's send block
        spora: sporaData.spora
    });
    
    receiveBlock.signBlock(userWallet.privateKey);

    const receiveRes = await fetch(`${LATTICE_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block: receiveBlock })
    });
    const receiveData = await receiveRes.json();

    if (receiveData.success) {
        console.log("✅ Receive Block Accepted by Lattice! Hash:", receiveData.hash);
        
        // 5. Verify Balance
        const balRes = await fetch(`${LATTICE_URL}/balance/${userWallet.publicKey}`);
        const balData = await balRes.json();
        console.log(`✅ Final Wallet Balance on Lattice: ${balData.balance} BOB`);
    // 6. User Creates a Governance Proposal
    console.log("\n6. User creates a DAO Proposal...");
    const proposalTitle = "Burn 50% of System Supply";
    const endTime = new Date(Date.now() + 86400000).toISOString();
    
    const propSporaRes = await fetch(`http://localhost:8081/spora/${parseInt(receiveData.hash.substr(0, 8), 16)}`);
    const propSporaData = await propSporaRes.json();

    const proposalBlock = new Block({
        type: 'proposal',
        account: userWallet.publicKey,
        previous: receiveData.hash,
        balance: balData.balance - 10, // Costs 10 BOB
        link: 'DAO_PROPOSAL',
        spora: propSporaData.spora,
        payload: { title: proposalTitle, endTime }
    });
    await proposalBlock.signBlock(userWallet.privateKey);
    
    const propRes = await fetch(`${LATTICE_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block: proposalBlock })
    });
    const propData = await propRes.json();
    if (propData.success) {
        console.log(`✅ Proposal Created! Hash: ${propData.hash}`);
    } else {
        console.error("❌ Proposal Failed:", propData.error);
        process.exit(1);
    }

    // 7. User Votes on their own Proposal
    console.log("7. User casts Quadratic Vote 'FOR' their proposal...");
    const voteSporaRes = await fetch(`http://localhost:8081/spora/${parseInt(propData.hash.substr(0, 8), 16)}`);
    const voteSporaData = await voteSporaRes.json();

    const voteBlock = new Block({
        type: 'vote',
        account: userWallet.publicKey,
        previous: propData.hash,
        balance: balData.balance - 10, // Balance remains the same
        link: propData.hash,
        spora: voteSporaData.spora,
        payload: { vote: 'FOR' }
    });
    await voteBlock.signBlock(userWallet.privateKey);

    const voteRes = await fetch(`${LATTICE_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block: voteBlock })
    });
    const voteData = await voteRes.json();
    
    if (voteData.success) {
        console.log(`✅ Vote Cast! Hash: ${voteData.hash}`);
        const fetchProp = await fetch(`${LATTICE_URL}/proposals`);
        const fetchPropData = await fetchProp.json();
        console.log("Current Proposals State:");
        console.log(fetchPropData);
    } else {
        console.error("❌ Vote Failed:", voteData.error);
        process.exit(1);
    }

    // 8. User Creates a Storage Market Bid
    console.log("\n8. User creates a Storage Market Bid...");
    const marketMagnet = "magnet:?xt=urn:btih:3333333333333333333333333333333333333333";
    
    // We need their latest frontier after the vote
    const postVoteFrontierRes = await fetch(`${LATTICE_URL}/frontier/${userWallet.publicKey}`);
    const postVoteFrontier = await postVoteFrontierRes.json();
    
    const expectedBidChallenge = parseInt(postVoteFrontier.frontier.substr(0, 8), 16);
    const bidSporaRes = await fetch(`http://localhost:8081/spora/${expectedBidChallenge}`);
    const bidSporaData = await bidSporaRes.json();

    const bidBlock = new Block({
        type: 'market_bid',
        account: userWallet.publicKey,
        previous: postVoteFrontier.frontier,
        balance: balData.balance - 10, // Vote was free, so 50 - 10 (proposal) = 40. Now bid costs 20.
        link: 'STORAGE_MARKET',
        spora: bidSporaData.spora,
        payload: { magnet: marketMagnet }
    });
    // Wait, the balance math is 50 (start) - 10 (proposal) - 0 (vote) = 40. We want to bid 20. So final balance 20!
    bidBlock.balance = 20;

    await bidBlock.signBlock(userWallet.privateKey);
    
    const bidRes = await fetch(`${LATTICE_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block: bidBlock })
    });
    const bidData = await bidRes.json();
    
    if (bidData.success) {
        console.log(`✅ Market Bid Created! Hash: ${bidData.hash}`);
        const fetchBids = await fetch(`${LATTICE_URL}/market/bids`);
        const fetchBidsData = await fetchBids.json();
        console.log("Current Market Bids:");
        console.log(fetchBidsData);
    } else {
        console.error("❌ Market Bid Failed:", bidData.error);
        process.exit(1);
    }

    // 9. Encrypted P2P Messaging via Lattice
    console.log("\n9. Encrypted P2P Messaging via Lattice...");
    const bobWallet = generateKeypair();
    console.log("   Generated Bob's Wallet:", bobWallet.publicKey.substr(0, 8) + '...');
    
    const memo = "Top secret Bobsgame strategy.";
    console.log("   Alice sends 5 BOB to Bob with Encrypted Memo:", memo);
    
    const postBidFrontierRes = await fetch(`${LATTICE_URL}/frontier/${userWallet.publicKey}`);
    const postBidFrontier = await postBidFrontierRes.json();
    
    const expectedMsgChallenge = parseInt(postBidFrontier.frontier.substr(0, 8), 16);
    const msgSporaRes = await fetch(`http://localhost:8081/spora/${expectedMsgChallenge}`);
    const msgSporaData = await msgSporaRes.json();

    const { encryptMemo, decryptMemo } = await import('./bobcoin-consensus/cryptoUtils.js');
    const encryptedBox = encryptMemo(memo, bobWallet.boxPublicKey, userWallet.boxPrivateKey);

    const msgBlock = new Block({
        type: 'send',
        account: userWallet.publicKey,
        previous: postBidFrontier.frontier,
        balance: 15,
        link: bobWallet.publicKey,
        spora: msgSporaData.spora,
        payload: {
            memo: encryptedBox.box,
            nonce: encryptedBox.nonce,
            senderBoxKey: userWallet.boxPublicKey
        }
    });
    await msgBlock.signBlock(userWallet.privateKey);
    
    const msgRes = await fetch(`${LATTICE_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block: msgBlock })
    });
    const msgData = await msgRes.json();
    
    if (msgData.success) {
        console.log(`✅ Encrypted Send Block Created! Hash: ${msgData.hash}`);
        console.log("   Bob checking pending funds...");
        const bobPendRes = await fetch(`${LATTICE_URL}/pending/${bobWallet.publicKey}`);
        const bobPendData = await bobPendRes.json();
        const bobTx = bobPendData.pending[0];
        
        if (bobTx) {
            console.log(`✅ Bob found ${bobTx.amount} BOB pending from ${bobTx.sender.substr(0, 8)}...`);
            const decrypted = decryptMemo(bobTx.payload.memo, bobTx.payload.nonce, bobTx.payload.senderBoxKey, bobWallet.boxPrivateKey);
            if (decrypted === memo) {
                console.log("✅ Bob successfully decrypted the memo: '" + decrypted + "'");
                console.log("\n=== FULL LATTICE E2E TEST COMPLETE ===");
            } else {
                console.error("❌ Bob failed to decrypt the memo!");
                process.exit(1);
            }
        }
    } else {
        console.error("❌ Send Block Failed:", msgData.error);
        process.exit(1);
    }
    
    } else {
        console.error("❌ Failed to process receive block:", receiveData.error);
        process.exit(1);
    }
}

testFlow();
