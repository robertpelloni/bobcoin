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
    const expectedChallenge = parseInt(userWallet.publicKey.substr(0, 8), 16);
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
        console.log("=== TEST COMPLETE ===");
    } else {
        console.error("❌ Failed to process receive block:", receiveData.error);
        process.exit(1);
    }
}

testFlow();
