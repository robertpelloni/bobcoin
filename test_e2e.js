// test_e2e.js
// Simulates the full flow: Frontend -> GameServer -> ZKService -> Bridge

import fetch from 'node-fetch';

const GAME_SERVER_URL = 'http://localhost:3000'; // Port 3000 mapped to 3001? Docker says 3001:3000. Wait, inside container it's 3000. Outside is 3001.
// If I run this script from host, I should use 3001.
// If I run inside container, use 3000.
// I will run this from the HOST (or bash session root), so I should use the mapped port.
// Checking docker-compose.yml: game-server ports "3001:3000".
// However, I haven't started docker-compose up. I am running game-server via `node server.js` directly on port 3000 in the background?
// Wait, I killed the background processes in the previous step.
// I need to start them again.

async function testFlow() {
    console.log("=== STARTING E2E TEST ===");

    // 1. Submit Proof
    const score = 5000; // > 1000 to mint
    const perfects = 50;
    const greats = 0;

    // Check math: 50 * 100 + 0 * 50 = 5000. Matches.

    const proofPayload = {
        playerId: "test_player_" + Date.now(),
        publicValues: {
            score,
            perfects,
            greats,
            misses: 0
        },
        proofBytes: "mock_bytes" // The ZK Service currently just executes the trace based on inputs
    };

    console.log("1. Submitting Proof to Game Server...");
    try {
        const res = await fetch(`${GAME_SERVER_URL}/submit-proof`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proof: proofPayload })
        });

        const data = await res.json();
        console.log("Response:", data);

        if (data.success) {
            console.log("✅ Proof Verified & Tokens Minted!");
            console.log("TX:", data.tx);
        } else {
            console.error("❌ Failed:", data.error);
            process.exit(1);
        }

    } catch (e) {
        console.error("❌ Network Error:", e.message);
        process.exit(1);
    }

    console.log("=== TEST COMPLETE ===");
}

testFlow();
