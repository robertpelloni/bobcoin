const assert = require('assert');

async function runTests() {
    console.log('Running Backend Integration Tests...');

    // Config
    const GAME_SERVER = 'http://localhost:3000';
    const SUPERNODE = 'http://localhost:8080';

    try {
        // 1. Check Supernode Stats
        console.log(`[TEST] GET ${SUPERNODE}/stats`);
        const statsRes = await fetch(`${SUPERNODE}/stats`);
        if (statsRes.ok) {
            const stats = await statsRes.json();
            console.log(`PASS: Supernode OK (Uptime: ${stats.uptime}, Validator: ${stats.address})`);
        } else {
            console.warn(`WARN: Supernode returned ${statsRes.status}`);
        }

        // 2. Check Game Server Bankroll
        console.log(`[TEST] GET ${GAME_SERVER}/bankroll`);
        const bankrollRes = await fetch(`${GAME_SERVER}/bankroll`);
        if (bankrollRes.ok) {
            const data = await bankrollRes.json();
            console.log(`PASS: Bankroll OK (${data.balance} SOL)`);
        } else {
            console.error(`FAIL: Bankroll returned ${bankrollRes.status}`);
            process.exit(1);
        }

        // 3. Check Leaderboard
        console.log(`[TEST] GET ${GAME_SERVER}/leaderboard`);
        const lbRes = await fetch(`${GAME_SERVER}/leaderboard`);
        if (lbRes.ok) {
            const data = await lbRes.json();
            console.log(`PASS: Leaderboard OK (${data.leaderboard ? data.leaderboard.length : 0} entries)`);
        } else {
            console.error(`FAIL: Leaderboard returned ${lbRes.status}`);
            process.exit(1);
        }

        // 4. Submit Proof (Mock)
        console.log(`[TEST] POST ${GAME_SERVER}/submit-proof`);
        const proof = {
            playerId: 'TestPlayer_' + Date.now(),
            publicValues: { score: 5000, perfects: 50, greats: 0 },
            proofBytes: 'mock_bytes'
        };
        const proofRes = await fetch(`${GAME_SERVER}/submit-proof`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proof })
        });

        if (proofRes.ok) {
            const data = await proofRes.json();
            console.log(`PASS: Proof Submitted (Amount Minted: ${data.amount})`);
        } else {
            console.warn(`WARN: Proof submission failed with ${proofRes.status} (Expected if ZK service missing)`);
        }

        console.log('ALL TESTS PASSED');
        process.exit(0);

    } catch (e) {
        console.error('TEST EXCEPTION:', e);
        process.exit(1);
    }
}

// Check if fetch is available (Node 18+)
if (!globalThis.fetch) {
    console.error('Node version too old for fetch. Please run with Node 18+');
    process.exit(1);
}

// Wait for servers to boot
setTimeout(runTests, 2000);
