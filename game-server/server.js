import express from 'express';
import cors from 'cors';
// Import BobcoinBridge from the linked supertorrent package
// Note: supertorrent package.json main is index.js, but we need the class.
// Based on ESM refactor, index.js does not export the class default, but bobcoin.js does.
// We should import from the internal path if package export isn't set up for it, 
// OR we rely on supertorrent exporting it. 
// Given the current supertorrent setup, index.js does NOT export the bridge. 
// We will try deep import.
// import BobcoinBridge from 'supertorrent/supernode/blockchain/bobcoin.js';
// Docker structure allows relative import from sibling directory
import BobcoinBridge from '../supertorrent/supernode/blockchain/bobcoin.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize Bridge
const bridge = new BobcoinBridge();
let bridgeReady = false;

(async () => {
    try {
        console.log('[GameServer] Initializing Bobcoin Bridge...');
        await bridge.init();
        bridgeReady = true;
        console.log(`[GameServer] Bridge Ready. Validator: ${bridge.keypair.publicKey.toBase58()}`);
    } catch (e) {
        console.error('[GameServer] Failed to init bridge:', e);
    }
})();

app.get('/bankroll', async (req, res) => {
    if (!bridgeReady) {
        return res.status(503).json({ error: 'Bridge not ready' });
    }
    res.json({ balance });
});

app.get('/leaderboard', async (req, res) => {
    if (!bridgeReady) {
        return res.status(503).json({ error: 'Bridge not ready' });
    }
    const leaderboard = await bridge.getLeaderboard(10);
    res.json({ leaderboard });
});

app.post('/submit-proof', async (req, res) => {
    if (!bridgeReady) {
        return res.status(503).json({ error: 'Bridge not ready' });
    }

    const { proof } = req.body;

    if (!proof || !proof.playerId || !proof.publicValues) {
        return res.status(400).json({ error: 'Invalid proof format' });
    }

    console.log(`[GameServer] Received Proof from ${proof.playerId}. Score: ${proof.publicValues.score}`);

    try {
        // 1. ZK Verification (Phase 13)
        // Check if ZK Service is available and verify execution
        try {
            console.log('[GameServer] Requesting ZK Verification from zk-service...');
            const zkResponse = await fetch('http://zk-service:8080/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(proof)
            });

            if (zkResponse.ok) {
                const zkResult = await zkResponse.json();
                console.log('[GameServer] ZK Service Result:', zkResult);
                if (!zkResult.success) {
                    throw new Error(`ZK Verification Failed: ${zkResult.error}`);
                }
            } else {
                console.warn('[GameServer] ZK Service unavailable or error. status:', zkResponse.status);
                // Fallback? Or fail? For robustness, we warn but proceed to Bridge check.
            }
        } catch (zkErr) {
            console.error('[GameServer] ZK Service Error:', zkErr.message);
            // Decide if hard fail. For now, soft fail to allow gameplay if verify service is down.
        }

        // 2. Bridge Verification (Simple logic + Signature check if we had it)
        const isValid = await bridge.verifyGameScoreProof(proof);

        if (!isValid) {
            console.log('[GameServer] Proof Rejected ❌');
            return res.status(400).json({ success: false, error: 'Invalid Proof' });
        }

        // 2. Mint Tokens
        console.log('[GameServer] Proof Valid ✅. Minting tokens...');
        const result = await bridge.mintTokensForGameScore(proof.playerId, proof);

        if (result.signature) {
            console.log(`[GameServer] Minted ${result.amount} tokens. Tx: ${result.signature}`);
            return res.json({
                success: true,
                amount: result.amount,
                tx: result.signature
            });
        } else {
            console.log('[GameServer] Score too low for tokens.');
            return res.json({ success: true, amount: 0, message: 'Score too low to mint' });
        }

    } catch (error) {
        console.error('[GameServer] Error processing proof:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`[GameServer] Listening on Internal Port ${PORT} (Exposed on 3001)`);
});
