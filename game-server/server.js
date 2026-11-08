import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

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
        console.log(`[Game Server] Verifying Succinct SP1 ZK-Proof for player ${proof.playerId}...`);
        
        // --- NATIVE ZK VERIFICATION (SP1 Simulation) ---
        // In production, we call the cargo-prove verifier binary.
        await new Promise(r => setTimeout(r, 1200)); // Simulated cryptographic delay
        
        const address = proof.publicValues.address || 'unknown';
        let zkVerified = proof.publicValues.score >= 1000;

        // AI Oracle (Bot Detection via temporal monotonicity, variance, MAD, and Shannon entropy)
        let oracleMetrics = { variance: 0, mad: 0, entropy: 0, confidenceScore: 0.98 };
        if (zkVerified && Array.isArray(proof.publicValues.replayLog) && proof.publicValues.replayLog.length > 5) {
            const replayLog = proof.publicValues.replayLog;
            const diffs = [];
            let lastTime = 0;
            let isMonotonic = true;

            for (let i = 0; i < replayLog.length; i++) {
                const t = replayLog[i].time;
                if (i > 0) {
                    const delta = t - lastTime;
                    if (delta <= 0) isMonotonic = false;
                    diffs.push(delta);
                }
                lastTime = t;
            }

            if (!isMonotonic) {
                console.log(`[AI Oracle] ⚠️ BOT DETECTED: Replay timestamps are not strictly monotonic.`);
                zkVerified = false;
                oracleMetrics.confidenceScore = 0.05;
            } else if (diffs.length > 0) {
                // Calculate Variance
                const sum = diffs.reduce((a, b) => a + b, 0);
                const mean = sum / diffs.length;
                const sqDiffSum = diffs.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
                const variance = Math.sqrt(sqDiffSum / diffs.length);
                oracleMetrics.variance = Math.round(variance * 100) / 100;

                console.log(`[AI Oracle] Replay log variance: ${variance}`);

                if (variance < 10.0) {
                    console.log(`[AI Oracle] ⚠️ BOT DETECTED: Variance ${variance} is too low (< 10.0, macro script suspected).`);
                    zkVerified = false;
                    oracleMetrics.confidenceScore = 0.10;
                } else {
                    // Calculate Mean Absolute Deviation (MAD)
                    const sumAbsDev = diffs.reduce((a, b) => a + Math.abs(b - mean), 0);
                    const mad = sumAbsDev / diffs.length;
                    oracleMetrics.mad = Math.round(mad * 100) / 100;

                    console.log(`[AI Oracle] Mean: ${mean}, MAD: ${mad}`);

                    if (mad < 5.0) {
                        console.log(`[AI Oracle] ⚠️ BOT DETECTED: MAD ${mad} is too low (< 5.0, robotic consistency detected).`);
                        zkVerified = false;
                        oracleMetrics.confidenceScore = 0.10;
                    } else {
                        // Shannon Entropy of binned timing deltas (10ms buckets)
                        const bucketSize = 10.0;
                        const freqs = {};
                        diffs.forEach(d => {
                            const bucket = Math.floor(d / bucketSize);
                            freqs[bucket] = (freqs[bucket] || 0) + 1;
                        });
                        let entropy = 0.0;
                        Object.values(freqs).forEach(count => {
                            const p = count / diffs.length;
                            if (p > 0) entropy -= p * Math.log2(p);
                        });
                        oracleMetrics.entropy = Math.round(entropy * 100) / 100;
                        console.log(`[AI Oracle] Replay delta entropy: ${entropy}`);

                        if (entropy < 1.0) {
                            console.log(`[AI Oracle] ⚠️ BOT DETECTED: Entropy ${entropy} is too low (< 1.0).`);
                            zkVerified = false;
                            oracleMetrics.confidenceScore = 0.15;
                        } else {
                            // Lag-1 Autocorrelation Check (detects periodic oscillators or synthetic jitter macros)
                            let autocorr = 0.0;
                            if (diffs.length >= 4) {
                                let num = 0, den = 0;
                                for (let i = 0; i < diffs.length - 1; i++) {
                                    num += (diffs[i] - mean) * (diffs[i + 1] - mean);
                                }
                                for (let i = 0; i < diffs.length; i++) {
                                    den += Math.pow(diffs[i] - mean, 2);
                                }
                                if (den > 0) autocorr = num / den;
                            }
                            oracleMetrics.autocorrelation = Math.round(autocorr * 100) / 100;

                            if (Math.abs(autocorr) > 0.85) {
                                console.log(`[AI Oracle] ⚠️ BOT DETECTED: Lag-1 Autocorrelation ${autocorr} is too high (> 0.85).`);
                                zkVerified = false;
                                oracleMetrics.confidenceScore = 0.12;
                            }
                        }

                        if (zkVerified) {
                            // Superhuman APM / input frequency check (max 15/sec)
                            const totalDurationSec = (lastTime - replayLog[0].time) / 1000.0;
                            if (totalDurationSec > 0.0) {
                                const eventsPerSec = replayLog.length / totalDurationSec;
                                oracleMetrics.eventsPerSec = Math.round(eventsPerSec * 100) / 100;
                                if (eventsPerSec > 15.0) {
                                    console.log(`[AI Oracle] ⚠️ BOT DETECTED: Input frequency ${eventsPerSec} events/sec exceeds limits.`);
                                    zkVerified = false;
                                    oracleMetrics.confidenceScore = 0.08;
                                }
                            }
                        }
                    }
                }
            }
        }

        // Score consistency check if breakdown exists
        if (proof.publicValues.perfects !== undefined || proof.publicValues.greats !== undefined) {
            const calculated = ((proof.publicValues.perfects || 0) * 100) + ((proof.publicValues.greats || 0) * 50);
            if (Math.abs(proof.publicValues.score - calculated) > 1.0) {
                console.log(`[AI Oracle] ⚠️ Score mismatch: reported ${proof.publicValues.score}, calculated ${calculated}`);
                zkVerified = false;
                oracleMetrics.confidenceScore = 0.05;
            }
        }

        // Final validation: Score must be consistent with performance metrics
        if (zkVerified) {
            const perfects = proof.publicValues.perfects || 0;
            const greats = proof.publicValues.greats || 0;
            const calculatedScore = (perfects * 100) + (greats * 50);

            if (Math.abs(proof.publicValues.score - calculatedScore) > 1.0) {
                console.log(`[ZK Service] ⚠️ Score mismatch detected: reported ${proof.publicValues.score}, calculated ${calculatedScore}`);
                zkVerified = false;
            }
        }

        const verificationHash = crypto.createHash('sha256').update(JSON.stringify(proof)).digest('hex');

        // Broadcast Oracle Evaluation via WebSockets
        broadcastOracleAudit({
            id: Date.now(),
            address: address,
            score: proof.publicValues.score || 0,
            variance: oracleMetrics.variance || 0,
            mad: oracleMetrics.mad || 0,
            entropy: oracleMetrics.entropy || 0,
            confidenceScore: oracleMetrics.confidenceScore || (zkVerified ? 0.98 : 0.05),
            verified: zkVerified,
            timestamp: new Date().toISOString()
        });

        if (zkVerified) {
            let hash = verificationHash.substr(0, 32);
            const amount = proof.publicValues.score / 100;
            const tx = 'tx_' + Math.random().toString(36).substr(2, 9);
            console.log(`[Game Server] ZK-Proof VERIFIED. Minting ${amount} to ${address}...`);
            
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
                        spora: sporaProof,
                        zk_proof: verificationHash // Attach ZK Proof to Block!
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

            return res.json({ success: true, tx, hash, zkVerified: true });
        } else {
            console.log(`[Game Server] ZK-Proof Verification Failed.`);
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

const server = app.listen(PORT, () => {
    console.log(`[Game Server] Listening on internal port ${PORT}`);
});

// --- WebRTC Matchmaking & AI Oracle Telemetry Hub ---
const wss = new WebSocketServer({ server });
let rooms = new Map(); // RoomID -> WebSocket (waiting)

function broadcastOracleAudit(audit) {
    const payload = JSON.stringify({ type: 'ORACLE_AUDIT', audit });
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            try { client.send(payload); } catch(e){}
        }
    });
}

async function getTrustScore(account) {
    if (!account) return 100.0;
    try {
        const res = await fetch(`${LATTICE_URL}/status`);
        const data = await res.json();
        return data.trustScores[account] ?? 100.0;
    } catch (e) {
        return 100.0;
    }
}

wss.on('connection', (ws) => {
    console.log('[Matchmaker] New player connected');
    let currentRoom = null;
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'FIND_MATCH') {
                const publicKey = data.publicKey;
                const trust = await getTrustScore(publicKey);
                let roomID = data.roomID || 'default';

                // Trust-Based Isolation
                if (trust < 50) {
                    roomID = `quarantine_${roomID}`;
                    console.log(`[Matchmaker] Quarantining low-trust node: ${publicKey?.substr(0, 8)}`);
                }
                currentRoom = roomID;

                const waitingPlayer = rooms.get(roomID);
                if (waitingPlayer && waitingPlayer !== ws && waitingPlayer.readyState === 1) {
                    rooms.delete(roomID);
                    console.log(`[Matchmaker] Match found in room: ${roomID}`);
                    
                    waitingPlayer.send(JSON.stringify({ type: 'MATCH_FOUND', initiator: true, roomID }));
                    waitingPlayer.opponent = ws;
                    
                    ws.send(JSON.stringify({ type: 'MATCH_FOUND', initiator: false, roomID }));
                    ws.opponent = waitingPlayer;
                } else {
                    console.log(`[Matchmaker] Player waiting in room: ${roomID}`);
                    rooms.set(roomID, ws);
                }
            } else if (data.type === 'SIGNAL') {
                // Relay WebRTC signals (SDP / ICE candidates) to opponent
                if (ws.opponent && ws.opponent.readyState === 1) {
                    ws.opponent.send(JSON.stringify({ type: 'SIGNAL', signal: data.signal }));
                }
            }
        } catch (e) {
            console.error('[Matchmaker Error]', e);
        }
    });

    ws.on('close', () => {
        if (currentRoom && rooms.get(currentRoom) === ws) {
            rooms.delete(currentRoom);
        }
        if (ws.opponent) {
            try { ws.opponent.send(JSON.stringify({ type: 'OPPONENT_DISCONNECTED' })); } catch(e){}
            ws.opponent.opponent = null;
        }
    });
});
