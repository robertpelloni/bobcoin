import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import marketRouter from './market.js';
import { initDatabase } from './database.js';

const app = express();
const PORT = process.env.PORT || 3000;
const ZK_SERVICE_URL = process.env.ZK_SERVICE_URL || 'http://localhost:8080';

app.use(cors());
app.use(express.json());

// Initialize SQLite DB for Governance and Market
initDatabase().catch(err => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
});

// Mount the marketplace router
app.use('/market', marketRouter);

// Governance Endpoints
app.get('/proposals', async (req, res) => {
    try {
        const { getAllProposals } = await import('./database.js');
        const proposals = await getAllProposals();
        res.json(proposals);
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});

app.post('/proposals/:id/vote', async (req, res) => {
    const { id } = req.params;
    const { voterId, voteType, power } = req.body;
    try {
        const { castVote } = await import('./database.js');
        await castVote(parseInt(id), voterId, voteType, power);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message || 'DB Error' });
    }
});

app.get('/proposals/:id/votes', async (req, res) => {
    const { id } = req.params;
    try {
        const { getVotesByProposal } = await import('./database.js');
        const votes = await getVotesByProposal(parseInt(id));
        res.json(votes);
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});

// Health Check
app.get('/status', (req, res) => {
    res.json({ status: 'online', service: 'Game Server orchestrator', version: '2.4.0' });
});

// ZK Proof Submission Endpoint
app.post('/submit-proof', async (req, res) => {
    const { proof } = req.body;
    if (!proof || !proof.publicValues) {
        return res.status(400).json({ success: false, error: 'Invalid proof payload' });
    }

    try {
        console.log(`[Game Server] Relaying proof for player ${proof.playerId} to ZK Service...`);
        // We simulate calling the actual Rust ZK Service on port 8080
        // Currently the ZK service only executes traces (client.execute)
        
        // Mock ZK Service Verification Response
        // Replace with actual fetch to ZK_SERVICE_URL when SP1 is robust
        /*
        const zkRes = await fetch(`${ZK_SERVICE_URL}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(proof)
        });
        const zkData = await zkRes.json();
        */
        
        // Simulated successful ZK Verification based on previous mock behavior
        const zkData = { success: true, verified: true };

        if (zkData.success && zkData.verified) {
            // Mint Tokens (Simulated Bridge Call)
            const tx = 'tx_' + Math.random().toString(36).substr(2, 9);
            console.log(`[Game Server] Proof Verified. Tokens minted. TX: ${tx}`);
            return res.json({ success: true, tx });
        } else {
            console.log(`[Game Server] Proof Verification Failed.`);
            return res.status(400).json({ success: false, error: 'Cryptographic trace verification failed.' });
        }
    } catch (e) {
        console.error("ZK Verification Error:", e);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// Mock Burn Endpoint for the economic loop
app.post('/burn', (req, res) => {
    const { amount, reason } = req.body;
    console.log(`[Game Server] Burning ${amount} BOB for: ${reason}`);
    
    if (!amount || amount <= 0) return res.status(400).json({ success: false, error: 'Invalid amount' });

    // Simulate Solana Devnet Bridge Call
    const tx = 'tx_burn_' + Math.random().toString(36).substr(2, 9);
    res.json({ success: true, tx });
});

app.listen(PORT, () => {
    console.log(`[Game Server] Listening on internal port ${PORT}`);
});
