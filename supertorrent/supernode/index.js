import express from 'express';
import cors from 'cors';
import BobcoinBridge from './blockchain/bobcoin.js';
import TorrentManager from './torrent-manager.js';

const app = express();
const PORT = 8080;
const GAME_SERVER_URL = process.env.GAME_SERVER_URL || 'http://localhost:3000';

app.use(cors());
app.use(express.json());

const torrentManager = new TorrentManager();
const bobcoinBridge = new BobcoinBridge();

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

// Global state
let myAddress;

// Need to initialize bridge async
(async () => {
    try {
        await bobcoinBridge.init();
        myAddress = bobcoinBridge.keypair.publicKey.toBase58();
        console.log('=== Supertorrent Node Startup ===');
        console.log(`Validator Address: ${myAddress}`);

        // Run the proof loop every 30 seconds
        setInterval(runProofOfStorageLoop, 30000);
        // Also run immediately
        runProofOfStorageLoop();

        // Run the smart mining loop every 60 seconds
        setInterval(runSmartMiningLoop, 60000);
        // Also run immediately
        runSmartMiningLoop();

    } catch (e) {
        console.error('Failed to init bridge:', e);
    }
})();

// API Endpoint for Frontend
app.get('/stats', (req, res) => {
    const stats = torrentManager.getStats();
    res.json({
        address: myAddress || 'Initializing...',
        uptime: process.uptime(),
        storage: {
            totalSize: torrentManager.getTotalStorageSize(),
            torrents: stats
        },
        network: {
            peers: stats.reduce((acc, t) => acc + t.peers, 0),
            downloadSpeed: stats.reduce((acc, t) => acc + t.downloadSpeed, 0),
            uploadSpeed: stats.reduce((acc, t) => acc + t.uploadSpeed, 0)
        }
    });
});

app.post('/add-torrent', async (req, res) => {
    const { magnet } = req.body;
    if (!magnet) {
        return res.status(400).json({ error: 'Magnet URI required' });
    }
    try {
        const result = await torrentManager.addFile(magnet);
        res.json({ success: true, torrent: result });
    } catch (e) {
        console.error('Failed to add torrent:', e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/remove-torrent', (req, res) => {
    const { infoHash } = req.body;
    if (!infoHash) {
        return res.status(400).json({ error: 'InfoHash required' });
    }
    const success = torrentManager.removeFile(infoHash);
    if (success) {
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Torrent not found' });
    }
});

app.listen(PORT, () => {
    console.log(`[Supernode] API Server running on port ${PORT}`);
});

async function runProofOfStorageLoop() {
    console.log('\n[Supernode] Starting Proof of Storage Loop...');

    const storedFiles = torrentManager.getStoredFiles();
    const totalSize = torrentManager.getTotalStorageSize();

    if (storedFiles.length === 0) {
        console.log('[Supernode] No files stored. Skipping proof.');
        return;
    }

    console.log(`[Supernode] Generating proof for ${storedFiles.length} files (${(totalSize / 1024 / 1024).toFixed(2)} MB total)...`);

    try {
        const merkleRoot = bobcoinBridge.generateStorageProof(storedFiles);

        if (merkleRoot) {
            const signature = await bobcoinBridge.submitProofOfStorage(merkleRoot, totalSize);
            console.log(`[Supernode] Proof submitted successfully! Tx: ${signature}`);

            const isEligible = await bobcoinBridge.isValidatorEligible(myAddress);
            console.log(`[Supernode] Validator Status: ${isEligible ? 'ACTIVE' : 'INACTIVE'}`);
        }
    } catch (error) {
        console.error('[Supernode] Failed to submit proof:', error);
    }
}

async function runSmartMiningLoop() {
    console.log('\n[SmartMiner] Checking for profitable storage bids...');

    try {
        // We use fetch (Node v18+ supports fetch native, otherwise we need node-fetch)
        // Assuming environment supports it or we use dynamic import
        const fetch = globalThis.fetch || (await import('node-fetch')).default;

        const res = await fetch(`${GAME_SERVER_URL}/market/bids`);
        if (!res.ok) throw new Error(`Market API error: ${res.status}`);

        const data = await res.json();
        const bids = data.bids || [];

        console.log(`[SmartMiner] Found ${bids.length} open bids.`);

        // Strategy: Accept bids > 20 BOB
        const MIN_BID = 20;

        for (const bid of bids) {
            if (bid.amount >= MIN_BID) {
                console.log(`[SmartMiner] Accepting Bid #${bid.id} (${bid.amount} BOB) for ${bid.magnet.slice(0, 20)}...`);

                // 1. Add Torrent
                await torrentManager.addFile(bid.magnet);

                // 2. Claim Bid
                const acceptRes = await fetch(`${GAME_SERVER_URL}/market/accept`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bidId: bid.id, nodeId: myAddress })
                });

                if (acceptRes.ok) {
                    console.log(`[SmartMiner] Bid #${bid.id} accepted successfully!`);
                } else {
                    console.error(`[SmartMiner] Failed to accept bid #${bid.id}`);
                }
            }
        }

    } catch (e) {
        console.error('[SmartMiner] Error:', e.message);
    }
}
