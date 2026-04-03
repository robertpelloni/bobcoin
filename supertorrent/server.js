import express from 'express';
import cors from 'cors';
import WebTorrent from 'webtorrent';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.SUPERNODE_PORT || 8081;
const upload = multer({ dest: 'uploads/' });

// Create uploads dir if not exists
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const LATTICE_URL = process.env.LATTICE_URL || 'http://localhost:4000';
const NODE_ID = "sn_" + Math.random().toString(36).substr(2, 9);
const client = new WebTorrent();
const TORRENTS_FILE = path.resolve(process.cwd(), 'torrents.json');
const WALLET_FILE = path.resolve(process.cwd(), 'wallet.json');

app.use(cors());
app.use(express.json());

let nodeWallet = null;

// Initialize Cryptography
let cryptoUtils = null;
let Block = null;

async function initCryptoAndWallet() {
    cryptoUtils = await import('../bobcoin-consensus/cryptoUtils.js');
    const bModule = await import('../bobcoin-consensus/Block.js');
    Block = bModule.Block;

    if (fs.existsSync(WALLET_FILE)) {
        nodeWallet = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
        console.log(`[Supernode] Loaded Wallet: ${nodeWallet.publicKey.substr(0,16)}...`);
    } else {
        nodeWallet = cryptoUtils.generateKeypair();
        fs.writeFileSync(WALLET_FILE, JSON.stringify(nodeWallet, null, 2));
        console.log(`[Supernode] Generated New Wallet: ${nodeWallet.publicKey.substr(0,16)}...`);
    }

    // Attempt to bootstrap the supernode's account on the Lattice if it has no blocks
    setTimeout(async () => {
        try {
            const frontRes = await fetch(`${LATTICE_URL}/frontier/${nodeWallet.publicKey}`);
            const frontData = await frontRes.json();
            if (!frontData.frontier) {
                console.log(`[Supernode] Account not open on Lattice. Requesting bootstrap funds...`);
                // Ask the Game Server to mint us 1 BOB so we can open our account
                const mintRes = await fetch(`http://localhost:3001/mint`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: 1, reason: "Supernode Bootstrapping", address: nodeWallet.publicKey })
                });
                const mintData = await mintRes.json();
                
                if (mintData.success) {
                    console.log(`[Supernode] Bootstrap Send Block confirmed. Creating OPEN block...`);
                    
                    // Fetch pending to get exact amount after decay
                    const pendRes = await fetch(`${LATTICE_URL}/pending/${nodeWallet.publicKey}`);
                    const pendData = await pendRes.json();
                    const pendingAmount = pendData.pending && pendData.pending.length > 0 ? pendData.pending[0].amount : 1;

                    // Generate SPoRA for OPEN block
                    const baseHash = crypto.createHash('sha256').update(nodeWallet.publicKey).digest('hex');
                    const expectedChallenge = parseInt(baseHash.substr(0, 8), 16);
                    const coreAnchor = CORE_ARCADE_ANCHORS[0];
                    const infoHash = coreAnchor.magnet.split('urn:btih:')[1].split('&')[0];
                    const chunkHash = crypto.createHash('sha256').update(infoHash + expectedChallenge).digest('hex');

                    const openBlock = new Block({
                        type: 'open',
                        account: nodeWallet.publicKey,
                        previous: null,
                        balance: pendingAmount,
                        link: mintData.hash, // Link is the game server's send block
                        spora: { infoHash, challenge: expectedChallenge, chunkHash }
                    });
                    
                    openBlock.signBlock(nodeWallet.privateKey);

                    const latticeRes = await fetch(`${LATTICE_URL}/process`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ block: openBlock })
                    });
                    const latticeData = await latticeRes.json();
                    if (latticeData.success) {
                        console.log(`[Supernode] ✅ Account OPENED successfully! Node is ready to accept bids.`);
                    }
                }
            }
        } catch (e) {
            console.error(`[Supernode] Bootstrap warning:`, e.message);
        }
    }, 5000);
}
initCryptoAndWallet();

const CORE_ARCADE_ANCHORS = [
    { name: 'bobsgame-arcade-tokyo', magnet: 'magnet:?xt=urn:btih:1234567890abcdef1234567890abcdef12345678' },
    { name: 'fwber-hq-node', magnet: 'magnet:?xt=urn:btih:abcdef1234567890abcdef1234567890abcdef12' }
];

let savedTorrents = [];
if (fs.existsSync(TORRENTS_FILE)) {
    try {
        savedTorrents = JSON.parse(fs.readFileSync(TORRENTS_FILE, 'utf8'));
        console.log(`[Supernode] Loaded ${savedTorrents.length} saved torrents.`);
        savedTorrents.forEach(t => client.add(t.magnet, { path: './downloads' }));
    } catch(e) {
        console.error("Failed to parse torrents.json");
    }
}

// Ensure Core Arcade Anchor files are permanently seeded
CORE_ARCADE_ANCHORS.forEach(anchor => {
    if (!client.get(anchor.magnet) && !savedTorrents.find(t => t.magnet === anchor.magnet)) {
        console.log(`[Anchor Bootstrap] Initializing permanent seeding for ${anchor.name}...`);
        client.add(anchor.magnet, { path: './downloads' });
    }
});

function saveTorrents() {
    const data = client.torrents.map(t => ({ magnet: t.magnetURI, infoHash: t.infoHash }));
    fs.writeFileSync(TORRENTS_FILE, JSON.stringify(data, null, 2));
}

app.get('/stats', (req, res) => {
    res.json({
        address: "sn_" + Math.random().toString(36).substr(2, 9),
        uptime: process.uptime(),
        network: {
            downloadSpeed: client.downloadSpeed,
            uploadSpeed: client.uploadSpeed,
            peers: client.torrents.reduce((acc, t) => acc + t.numPeers, 0)
        },
        storage: {
            totalSize: client.torrents.reduce((acc, t) => acc + t.length, 0),
            torrents: client.torrents.map(t => ({
                infoHash: t.infoHash,
                name: t.name,
                progress: t.progress,
                peers: t.numPeers,
                totalSize: t.length
            }))
        }
    });
});

app.post('/add-torrent', (req, res) => {
    const { magnet } = req.body;
    if (!magnet) return res.status(400).json({ error: 'Magnet link required' });

    if (client.get(magnet)) {
        return res.status(400).json({ error: 'Torrent already seeding' });
    }

    client.add(magnet, { path: './downloads' }, (torrent) => {
        console.log('[Supernode] Started seeding:', torrent.infoHash);
        saveTorrents();
    });

    res.json({ success: true, status: 'Added to download queue' });
});

app.post('/remove-torrent', (req, res) => {
    const { infoHash } = req.body;
    if (!infoHash) return res.status(400).json({ error: 'infoHash required' });

    client.remove(infoHash, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        console.log('[Supernode] Stopped seeding:', infoHash);
        saveTorrents();
        res.json({ success: true });
    });
});

app.get('/spora/:challenge', (req, res) => {
    const { challenge } = req.params;
    
    // Check if we are seeding the core anchor
    const coreAnchor = CORE_ARCADE_ANCHORS[0];
    const infoHash = coreAnchor.magnet.split('urn:btih:')[1].split('&')[0];
    
    const torrent = client.get(coreAnchor.magnet);
    
    if (!torrent) {
        return res.status(400).json({ error: 'Supernode is not tracking the Core Arcade Anchor. SPoRA failed.' });
    }

    // In a real SPoRA, we read the actual file chunk from disk (requires torrent.progress === 1).
    // For this prototype, we simulate reading the chunk by hashing the infoHash + challenge
    const chunkHash = crypto.createHash('sha256').update(infoHash + challenge).digest('hex');
    res.json({ 
        success: true, 
        spora: {
            infoHash: infoHash,
            challenge: parseInt(challenge, 10),
            chunkHash
        }
    });
});

// Endpoint to upload a file and start seeding it
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const filePath = req.file.path;
    client.seed(filePath, { name: req.file.originalname }, (torrent) => {
        console.log(`[Supernode] Seeding new file: ${torrent.name} (${torrent.magnetURI})`);
        res.json({
            success: true,
            name: torrent.name,
            magnet: torrent.magnetURI,
            infoHash: torrent.infoHash,
            size: req.file.size
        });
    });
});

app.listen(PORT, () => {
    console.log(`[Supernode ${NODE_ID}] Listening on port ${PORT}`);
    
    // Background Market Polling Loop
    setInterval(async () => {
        if (!nodeWallet || !Block) return;

        try {
            const res = await fetch(`${LATTICE_URL}/market/bids`);
            const data = await res.json();
            
            if (data.bids && data.bids.length > 0) {
                // Find an open bid we aren't already seeding
                for (const bid of data.bids) {
                    if (bid.status === 'OPEN' && !client.get(bid.magnet)) {
                        console.log(`[Supernode] Found open lattice bid #${bid.id.slice(0, 8)}... Accepting...`);
                        
                        // 1. Supernode initiates seeding
                        client.add(bid.magnet, { path: './downloads' }, async (torrent) => {
                            console.log(`[Supernode] Market Torrent seeding: ${torrent.infoHash}`);
                            saveTorrents();
                            
                            // 2. Claim Funds on Lattice
                            try {
                                const frontRes = await fetch(`${LATTICE_URL}/frontier/${nodeWallet.publicKey}`);
                                const frontData = await frontRes.json();
                                const previousHash = frontData.frontier || null;

                                const balRes = await fetch(`${LATTICE_URL}/balance/${nodeWallet.publicKey}`);
                                const balData = await balRes.json();
                                const currentBalance = balData.balance || 0;
                                
                                if (!previousHash) {
                                    console.log(`[Supernode] Cannot accept bid: Account not initialized on Lattice. Waiting for bootstrap...`);
                                    return;
                                }

                                // Generate SPoRA for the acceptance
                                // Challenge is our previous block hash or pub key
                                const baseHash = previousHash || crypto.createHash('sha256').update(nodeWallet.publicKey).digest('hex');
                                const expectedChallenge = parseInt(baseHash.substr(0, 8), 16);
                                
                                const coreAnchor = CORE_ARCADE_ANCHORS[0];
                                const infoHash = coreAnchor.magnet.split('urn:btih:')[1].split('&')[0];
                                const chunkHash = crypto.createHash('sha256').update(infoHash + expectedChallenge).digest('hex');

                                const acceptBlock = new Block({
                                    type: 'accept_bid',
                                    account: nodeWallet.publicKey,
                                    previous: previousHash,
                                    balance: currentBalance + bid.amount,
                                    link: bid.id, // the bid block hash
                                    spora: { infoHash, challenge: expectedChallenge, chunkHash }
                                });
                                
                                acceptBlock.signBlock(nodeWallet.privateKey);

                                const latticeRes = await fetch(`${LATTICE_URL}/process`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ block: acceptBlock })
                                });
                                const latticeData = await latticeRes.json();
                                
                                if (latticeData.success) {
                                    console.log(`[Supernode] ✅ Bid Claimed Successfully! Received ${bid.amount} BOB. TX: ${latticeData.hash}`);
                                } else {
                                    console.error(`[Supernode] ❌ Failed to claim bid funds: ${latticeData.error}`);
                                }
                            } catch (err) {
                                console.error(`[Supernode] Error processing accept block:`, err.message);
                            }
                        });
                    }
                }
            }
        } catch (e) {
            // Ignore fetch errors
        }
    }, 10000); // Check every 10 seconds
});
