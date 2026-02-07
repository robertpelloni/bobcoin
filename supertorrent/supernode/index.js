import express from 'express';
import cors from 'cors';
import BobcoinBridge from './blockchain/bobcoin.js';
import TorrentManager from './torrent-manager.js';

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

const torrentManager = new TorrentManager();
const bobcoinBridge = new BobcoinBridge();

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // process.exit(1); // Optional: force exit to let Docker restart, but we want to see logs first
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

        // Run the loop every 30 seconds
        setInterval(runProofOfStorageLoop, 30000);
        // Also run immediately
        runProofOfStorageLoop();
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

// Sintel, a free, Creative Commons movie
const SINTEL_MAGNET = 'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent';

torrentManager.addFile(SINTEL_MAGNET);

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
