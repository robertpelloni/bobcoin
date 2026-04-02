import express from 'express';
import cors from 'cors';
import WebTorrent from 'webtorrent';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 8080;
const client = new WebTorrent();
const TORRENTS_FILE = path.resolve(process.cwd(), 'torrents.json');

app.use(cors());
app.use(express.json());

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
    console.log(`[Supernode] Listening on port ${PORT}`);
});
