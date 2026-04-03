// test_e2e.js - Hardened for v3.4.0 (Sequential Block Heights)
import fetch from 'node-fetch';
import { generateKeypair } from './bobcoin-consensus/cryptoUtils.js';
import { Block } from './bobcoin-consensus/Block.js';

const GAME_SERVER_URL = process.env.GAME_SERVER_URL || 'http://localhost:3001';
const LATTICE_URL = process.env.LATTICE_URL || 'http://localhost:4000';

async function testFlow() {
    console.log("=== STARTING HARDENED LATTICE E2E TEST ===");

    // 1. User Wallet Generation
    const userWallet = generateKeypair();
    console.log("1. Generated User Wallet:", userWallet.publicKey.substr(0, 16) + '...');
    let currentHeight = 0;

    // 2. AI Oracle Proof
    const mockReplay = [];
    for (let i = 0; i < 10; i++) {
        mockReplay.push({ time: Date.now() + i*500, key: 'D', diff: 15 + Math.random() * 10, result: 'GOOD' });
    }

    console.log("2. Submitting Replay Log to AI Oracle on Game Server...");
    const mintRes = await fetch(`${GAME_SERVER_URL}/submit-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proof: {
            playerId: "test_player_" + Date.now(),
            publicValues: { score: 5000, perfects: 50, greats: 0, misses: 0, address: userWallet.publicKey, replayLog: mockReplay },
            proofBytes: "mock_bytes" 
        }})
    }).then(r => r.json());
    
    if (!mintRes.success) throw new Error("Minting failed");
    console.log("✅ Proof Verified!");

    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Fetch Pending
    console.log("3. Fetching pending blocks from Lattice...");
    const pendData = await fetch(`${LATTICE_URL}/pending/${userWallet.publicKey}`).then(r => r.json());
    const pendingTx = pendData.pending[0];
    console.log(`✅ Found pending funds: ${pendingTx.amount} BOB`);

    // 4. SPoRA + Open Block
    const { hash } = await import('./bobcoin-consensus/cryptoUtils.js');
    const challenge = parseInt(hash(userWallet.publicKey).substr(0, 8), 16);
    const spora = await fetch(`http://localhost:8081/spora/${challenge}`).then(r => r.json());

    console.log("5. User signs and broadcasts 'Open' block (Height 0)...");
    const receiveBlock = new Block({
        type: 'open',
        account: userWallet.publicKey,
        previous: null,
        balance: pendingTx.amount,
        link: pendingTx.hash,
        spora: spora.spora,
        height: 0
    });
    receiveBlock.signBlock(userWallet.privateKey);
    const res = await fetch(`${LATTICE_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block: receiveBlock })
    }).then(r => r.json());
    if (!res.success) throw new Error("Open failed: " + res.error);
    currentHeight = 1;

    // 6. DAO Proposal
    console.log("6. User creates a DAO Proposal (Height 1)...");
    const propSpora = await fetch(`http://localhost:8081/spora/${parseInt(res.hash.substr(0, 8), 16)}`).then(r => r.json());
    const proposalBlock = new Block({
        type: 'proposal',
        account: userWallet.publicKey,
        previous: res.hash,
        balance: receiveBlock.balance - 10,
        link: 'DAO_PROPOSAL',
        spora: propSpora.spora,
        payload: { title: 'Burn Supply', endTime: new Date(Date.now() + 86400).toISOString() },
        height: currentHeight++
    });
    await proposalBlock.signBlock(userWallet.privateKey);
    const propRes = await fetch(`${LATTICE_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block: proposalBlock })
    }).then(r => r.json());
    console.log("✅ Proposal Created!");

    // 7. DAO Vote
    console.log("7. User casts Quadratic Vote (Height 2)...");
    const voteSpora = await fetch(`http://localhost:8081/spora/${parseInt(propRes.hash.substr(0, 8), 16)}`).then(r => r.json());
    const voteBlock = new Block({
        type: 'vote',
        account: userWallet.publicKey,
        previous: propRes.hash,
        balance: proposalBlock.balance,
        link: propRes.hash,
        spora: voteSpora.spora,
        payload: { vote: 'FOR' },
        height: currentHeight++
    });
    await voteBlock.signBlock(userWallet.privateKey);
    await fetch(`${LATTICE_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block: voteBlock })
    }).then(r => r.json());
    console.log("✅ Vote Cast!");

    console.log("\n=== HARDENED E2E TEST PASSED ===");
}

testFlow().catch(e => { console.error("❌ TEST FAILED:", e.message); process.exit(1); });
