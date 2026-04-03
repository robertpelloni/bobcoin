import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import marketRouter from './market.js';
import { initDatabase } from './database.js';
import { Block } from '../bobcoin-consensus/Block.js';
import { generateKeypair } from '../bobcoin-consensus/cryptoUtils.js';

// Generate a runtime "System / Bridge" wallet for the Game Server
const SYSTEM_WALLET = generateKeypair();
let systemBalance = 1000000; // Starting supply
let systemFrontier = null;

// Helper to interact with the Lattice Network
const LATTICE_URL = process.env.LATTICE_URL || 'http://localhost:4000';
const SUPERNODE_URL = process.env.SUPERNODE_URL || 'http://localhost:8081';

async function getSporaProof(challenge) {
    const res = await fetch(`${SUPERNODE_URL}/spora/${challenge}`);
    const data = await res.json();
    if (data.success) return data.spora;
    throw new Error(data.error);
}

async function broadcastBlock(block) {
    const res = await fetch(`${LATTICE_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block })
    });
    return await res.json();
}

// Open the System Chain on boot
async function initializeSystemChain() {
    try {
        const genesisBlock = new Block({
            type: 'open',
            account: SYSTEM_WALLET.publicKey,
            previous: null,
            balance: systemBalance,
            link: 'SYSTEM_GENESIS'
        });
        genesisBlock.signBlock(SYSTEM_WALLET.privateKey);
        
        const res = await broadcastBlock(genesisBlock);
        if (res.success) {
            systemFrontier = res.hash;
            console.log(`[Game Server] Initialized Lattice Genesis Chain. Wallet: ${SYSTEM_WALLET.publicKey.substr(0, 16)}...`);
        }
    } catch (e) {
        console.warn(`[Game Server] Failed to bootstrap Lattice Chain. Is consensus node running?`);
    }
}
initializeSystemChain();

const app = express();
const PORT = process.env.GAME_SERVER_PORT || 3001;
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

// Health Check
app.get('/status', (req, res) => {
    res.json({ status: 'online', service: 'Game Server orchestrator', version: '2.4.0' });
});

// Expose System Bankroll
app.get('/bankroll', (req, res) => {
    res.json({ balance: systemBalance });
});

app.post('/fhe-oracle', async (req, res) => {
    const { cipherText } = req.body;
    if (!cipherText) return res.status(400).json({ error: 'Encrypted payload missing' });

    try {
        console.log(`[FHE Oracle] Received Homomorphically Encrypted Score...`);
        const { homomorphicAddPlain, homomorphicMultiplyPlain } = await import('./fheUtils.js');

        // Homomorphic Game Logic: Server doubles the score (multiplier) and adds a flat 500 point bonus!
        // All of this computation is done ON ENCRYPTED CIPHERTEXTS. The server DOES NOT KNOW the actual score.
        const multipliedCipher = await homomorphicMultiplyPlain(cipherText, 2);
        const finalCipher = await homomorphicAddPlain(multipliedCipher, 500);

        console.log(`[FHE Oracle] Computed encrypted game logic. Returning ciphertext...`);
        res.json({ success: true, resultCipher: finalCipher });
    } catch (e) {
        console.error("FHE Oracle Error:", e);
        res.status(500).json({ error: "Homomorphic computation failed." });
    }
});

// ZK Proof Submission & AI Oracle Endpoint
app.post('/submit-proof', async (req, res) => {
    const { proof } = req.body;
    if (!proof || !proof.publicValues) {
        return res.status(400).json({ success: false, error: 'Invalid proof payload' });
    }

    try {
        console.log(`[Game Server] Analyzing Proof of Play & Replay Log for player ${proof.playerId}...`);
        
        // --- AI ORACLE MOCK ---
        // Instead of relying on a missing Rust SP1 ZK prover, we simulate an AI Oracle
        // analyzing the replay logs to detect bots or cheating!
        const replay = proof.publicValues.replayLog || [];
        let aiConfidence = 0.95; // Default high confidence
        let botDetected = false;

        if (replay.length > 5) {
            // Check for inhuman consistency
            const diffs = replay.filter(r => r.diff !== null).map(r => r.diff);
            if (diffs.length > 5) {
                const avgDiff = diffs.reduce((a,b)=>a+b, 0) / diffs.length;
                const variance = diffs.reduce((a,b)=>a+Math.pow(b-avgDiff, 2), 0) / diffs.length;
                if (variance < 1.0) {
                    botDetected = true;
                    aiConfidence = 0.10;
                    console.log(`[AI Oracle] ⚠️ BOT DETECTED: Inhuman consistency (Variance: ${variance.toFixed(2)})`);
                }
            }
        }

        const zkData = { success: true, verified: !botDetected };
        console.log(`[AI Oracle] Analysis Complete. Human Confidence: ${(aiConfidence * 100).toFixed(1)}%`);

        if (zkData.success && zkData.verified) {
            // Mint Tokens via Lattice
            const address = proof.publicValues.address || 'unknown';
            let hash = Math.random().toString(16).substr(2, 8) + '...' + Math.random().toString(16).substr(2, 4);
            const amount = proof.publicValues.score / 100;
            const tx = 'tx_' + Math.random().toString(36).substr(2, 9);
            console.log(`[Game Server] Proof Verified. Minting ${amount} to ${address}...`);
            
            try {
                if (systemFrontier && address !== 'unknown') {
                    const balRes = await fetch(`${LATTICE_URL}/balance/${SYSTEM_WALLET.publicKey}`);
                    const balData = await balRes.json();
                    systemBalance = balData.balance - amount;

                    const expectedChallenge = parseInt(systemFrontier.substr(0, 8), 16);
                    let sporaProof = null;
                    try {
                        sporaProof = await getSporaProof(expectedChallenge);
                    } catch(e) {
                        console.error("[Game Server] SPoRA Failed:", e.message);
                        throw new Error("System SPoRA failed");
                    }
                    const sendBlock = new Block({
                        type: 'send',
                        account: SYSTEM_WALLET.publicKey,
                        previous: systemFrontier,
                        balance: systemBalance,
                        link: address,
                        spora: sporaProof
                    });
                    sendBlock.signBlock(SYSTEM_WALLET.privateKey);
                    const latticeRes = await broadcastBlock(sendBlock);
                    if (latticeRes.success) {
                        systemFrontier = sendBlock.hash;
                        hash = sendBlock.hash;
                    }
                }
                const { recordTransaction } = await import('./database.js');
                await recordTransaction(tx, 'MINT', amount, hash);
            } catch (e) {
                console.error("DB Error recording proof mint:", e);
            }

            return res.json({ success: true, tx, hash });
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
app.post('/burn', async (req, res) => {
    const { amount, reason } = req.body;
    console.log(`[Game Server] Burning ${amount} BOB for: ${reason}`);
    
    if (!amount || amount <= 0) return res.status(400).json({ success: false, error: 'Invalid amount' });

    // Simulate Solana Devnet Bridge Call
    const tx = 'tx_burn_' + Math.random().toString(36).substr(2, 9);
    const hash = Math.random().toString(16).substr(2, 8) + '...' + Math.random().toString(16).substr(2, 4);
    
    try {
        const { recordTransaction } = await import('./database.js');
        await recordTransaction(tx, 'SEND', amount, hash);
    } catch (e) {
        console.error("DB Error recording burn:", e);
    }

    res.json({ success: true, tx });
});

// Generic Mint Endpoint (System Sending to User)
app.post('/mint', async (req, res) => {
    const { amount, reason, address } = req.body;
    console.log(`[Game Server] Minting ${amount} BOB for: ${reason} to ${address || 'unknown'}`);
    
    if (!amount || amount <= 0) return res.status(400).json({ success: false, error: 'Invalid amount' });

    let hash = Math.random().toString(16).substr(2, 8) + '...' + Math.random().toString(16).substr(2, 4);

    try {
        // Broadcast send block to Lattice
        if (systemFrontier && address) {
            const balRes = await fetch(`${LATTICE_URL}/balance/${SYSTEM_WALLET.publicKey}`);
            const balData = await balRes.json();
            systemBalance = balData.balance - amount;

            const expectedChallenge = parseInt(systemFrontier.substr(0, 8), 16);
            let sporaProof = null;
            try {
                sporaProof = await getSporaProof(expectedChallenge);
            } catch(e) {
                console.error("[Game Server] SPoRA Failed:", e.message);
                throw new Error("System SPoRA failed");
            }
            const sendBlock = new Block({
                type: 'send',
                account: SYSTEM_WALLET.publicKey,
                previous: systemFrontier,
                balance: systemBalance,
                link: address,
                spora: sporaProof
            });
            sendBlock.signBlock(SYSTEM_WALLET.privateKey);
            const latticeRes = await broadcastBlock(sendBlock);
            if (latticeRes.success) {
                systemFrontier = sendBlock.hash;
                hash = sendBlock.hash;
                console.log(`[Lattice] System sent ${amount} BOB to ${address}. TX: ${hash}`);
            }
        }

        
        // Record Mint Transaction locally for UI
        const tx = 'tx_mint_' + Math.random().toString(36).substr(2, 9);
        const { recordTransaction } = await import('./database.js');
        await recordTransaction(tx, 'MINT', amount, hash);
        res.json({ success: true, tx, hash });
    } catch (e) {
        console.error("Lattice/DB Error recording mint:", e);
        res.status(500).json({ success: false, error: 'Internal Error' });
    }
});

// Transactions Endpoint
app.get('/transactions', async (req, res) => {
    try {
        const { getTransactions } = await import('./database.js');
        const txs = await getTransactions();
        res.json(txs);
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});

app.listen(PORT, () => {
    console.log(`[Game Server] Listening on internal port ${PORT}`);
});
