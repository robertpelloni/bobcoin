import express from 'express';
import cors from 'cors';
import WebTorrent from 'webtorrent';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.SUPERNODE_PORT || 8081;
const GAME_SERVER_URL = process.env.GAME_SERVER_URL || 'http://localhost:3001';
const NODE_ID = "sn_" + Math.random().toString(36).substr(2, 9);
const client = new WebTorrent();
const TORRENTS_FILE = path.resolve(process.cwd(), 'torrents.json');

app.use(cors());
app.use(express.json());

const CORE_ARCADE_ANCHORS = [
    { name: 'bobsgame-arcade-tokyo', magnet: 'magnet:?xt=urn:btih:bobsgamecorefiles1234567890abcdef' },
    { name: 'fwber-hq-node', magnet: 'magnet:?xt=urn:btih:fwbercorefiles1234567890abcdef' }
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

app.listen(PORT, () => {
    console.log(`[Supernode ${NODE_ID}] Listening on port ${PORT}`);
    
    // Background Market Polling Loop
    setInterval(async () => {
        try {
            const res = await fetch(`${GAME_SERVER_URL}/market/bids`);
            const data = await res.json();
            
            if (data.bids && data.bids.length > 0) {
                // Find an open bid we aren't already seeding
                for (const bid of data.bids) {
                    if (bid.status === 'OPEN' && !client.get(bid.magnet)) {
                        console.log(`[Supernode] Found open bid #${bid.id} for ${bid.amount} BOB. Accepting...`);
                        
                        // Accept Bid
                        const acceptRes = await fetch(`${GAME_SERVER_URL}/market/accept`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ bidId: bid.id, nodeId: NODE_ID })
                        });
                        
                        const acceptData = await acceptRes.json();
                        if (acceptData.success) {
                            console.log(`[Supernode] Bid #${bid.id} accepted! Starting WebTorrent download...`);
                            client.add(bid.magnet, { path: './downloads' }, (torrent) => {
                                console.log('[Supernode] Market Torrent seeding:', torrent.infoHash);
                                saveTorrents();
                            });
                        }
                    }
                }
            }
        } catch (e) {
            // Ignore fetch errors if game-server is down
        }
    }, 10000); // Check every 10 seconds
});
