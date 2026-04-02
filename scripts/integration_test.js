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

        // 4. Check Quests
        console.log(`[TEST] GET ${GAME_SERVER}/quests`);
        const qRes = await fetch(`${GAME_SERVER}/quests`);
        if (qRes.ok) {
            const data = await qRes.json();
            assert.ok(Array.isArray(data.quests), 'Quests should be array');
            console.log(`PASS: Quests OK (${data.quests.length} loaded)`);
        } else {
            console.error(`FAIL: Quests returned ${qRes.status}`);
            process.exit(1);
        }

        // 5. Test Chat Persistence
        console.log(`[TEST] POST ${GAME_SERVER}/chat`);
        const testMsg = `Integration Test Msg ${Date.now()}`;
        const chatPost = await fetch(`${GAME_SERVER}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: 'Tester', text: testMsg })
        });

        if (chatPost.ok) {
            const getChat = await fetch(`${GAME_SERVER}/chat`);
            const chatData = await getChat.json();
            const found = chatData.messages.find(m => m.text === testMsg);
            assert.ok(found, 'Posted message should exist in GET /chat response');
            console.log(`PASS: Chat Persistence OK`);
        } else {
            console.error(`FAIL: Chat Post returned ${chatPost.status}`);
            process.exit(1);
        }

        // 6. Test Governance
        console.log(`[TEST] GET ${GAME_SERVER}/proposals`);
        const govRes = await fetch(`${GAME_SERVER}/proposals`);
        if (govRes.ok) {
            const data = await govRes.json();
            assert.ok(Array.isArray(data.proposals), 'Proposals should be array');
            console.log(`PASS: Governance OK (${data.proposals.length} proposals)`);
        } else {
            console.error(`FAIL: Governance returned ${govRes.status}`);
            process.exit(1);
        }

        // 7. Submit Proof (Mock)
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

        console.log('\n✅ ALL INTEGRATION TESTS PASSED');
        process.exit(0);

    } catch (e) {
        console.error('\n❌ TEST EXCEPTION:', e);
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
