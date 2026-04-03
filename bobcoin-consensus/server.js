import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Lattice } from './Lattice.js';
import { Block } from './Block.js';

const app = express();
const PORT = process.env.LATTICE_PORT || 4000;

app.use(cors());
app.use(express.json());

const lattice = new Lattice();
const peers = new Map();

// Background Gossip Loop
async function gossipLoop() {
    for (const [url] of peers.entries()) {
        try {
            const start = Date.now();
            const res = await fetch(`${url}/status`);
            const latency = Date.now() - start;
            if (!res.ok) throw new Error("Offline");
            const stats = await res.json();
            peers.set(url, { status: 'online', latency, stateHash: stats.stateHash });

            if (stats.stateHash && stats.stateHash !== lattice.stateHash) {
                const syncRes = await fetch(`${url}/blocks?after=${lattice.stateHash}`);
                const newBlocks = await syncRes.json();
                for (const bData of newBlocks) {
                    const block = new Block(bData);
                    block.hash = bData.hash;
                    block.signature = bData.signature;
                    block.timestamp = bData.timestamp;
                    lattice.processBlock(block);
                }
            }
        } catch (e) {
            peers.set(url, { status: 'offline', latency: 0 });
        }
    }
    setTimeout(gossipLoop, 10000);
}
gossipLoop();

app.get('/status', (req, res) => {
    res.json({
        status: 'online',
        engine: 'Node-Lattice v6.4.0',
        stateHash: lattice.stateHash,
        chains: Object.keys(lattice.chains).length,
        blocks: Object.keys(lattice.blocks).length
    });
});

app.get('/peers', (req, res) => {
    res.json(Object.fromEntries(peers));
});

app.post('/peers', (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    peers.set(url, { status: 'connecting', latency: 0 });
    res.json({ success: true });
});

app.get('/blocks', (req, res) => {
    const after = req.query.after;
    const allBlocks = Object.values(lattice.blocks).sort((a,b) => a.timestamp - b.timestamp);
    let delta = [];
    let found = !after;
    for (const b of allBlocks) {
        if (found) delta.push(b);
        else if (b.hash === after) found = true;
    }
    res.json(delta);
});

// Submit a signed block to the network
app.post('/process', (req, res) => {
    try {
        const blockData = req.body.block;
        if (!blockData) return res.status(400).json({ error: 'Block data required' });

        // Reconstruct block object
        const block = new Block({
            type: blockData.type,
            account: blockData.account,
            previous: blockData.previous,
            balance: blockData.balance,
            link: blockData.link,
            spora: blockData.spora,
            payload: blockData.payload
        });
        block.timestamp = blockData.timestamp;
        block.hash = blockData.hash;
        block.signature = blockData.signature;

        lattice.processBlock(block);

        console.log(`[Lattice] Processed ${block.type} block for ${block.account.substr(0, 8)}...`);
        
        // Broadcast to all WebSocket clients
        broadcastBlock({
            type: block.type,
            account: block.account,
            hash: block.hash,
            balance: block.balance,
            timestamp: block.timestamp,
            link: block.link
        });
        
        res.json({ success: true, hash: block.hash });

    } catch (e) {
        console.error("[Lattice Error]", e.message);
        res.status(400).json({ success: false, error: e.message });
    }
});

// Get pending transactions for an account
app.get('/pending/:account', (req, res) => {
    const account = req.params.account;
    const pending = lattice.pending[account] || [];
    res.json({ pending });
});

// Get balance
app.get('/balance/:account', (req, res) => {
    const account = req.params.account;
    res.json({ balance: lattice.getBalance(account) });
});

// Get frontier hash
app.get('/frontier', (req, res) => {
    const result = {};
    for (const [account, chain] of Object.entries(lattice.chains)) {
        const head = chain[chain.length - 1];
        result[account] = {
            balance: lattice.getBalance(account),
            staked_balance: head ? head.staked_balance : 0,
            height: chain.length,
            headHash: head ? head.hash : null
        };
    }
    res.json(result);
});

app.get('/frontier/:account', (req, res) => {
    const account = req.params.account;
    const frontier = lattice.getFrontier(account);
    res.json({ 
        frontier: frontier ? frontier.hash : null,
        balance: lattice.getBalance(account),
        staked_balance: frontier ? frontier.staked_balance : 0
    });
});

// Get chain
app.get('/chain/:account', (req, res) => {
    const account = req.params.account;
    const chain = lattice.chains[account] || [];
    res.json({ chain });
});

// Governance Endpoints
app.get('/proposals', (req, res) => {
    res.json(Object.values(lattice.proposals));
});

app.get('/votes/:proposalHash', (req, res) => {
    const proposalHash = req.params.proposalHash;
    const votes = lattice.votes[proposalHash] || {};
    res.json(votes);
});

// Market Endpoints
app.get('/market/bids', (req, res) => {
    res.json({ bids: Object.values(lattice.marketBids).filter(b => b.status === 'OPEN') });
});

app.get('/nfts/:account', (req, res) => {
    const account = req.params.account;
    const owned = Object.values(lattice.nfts).filter(n => n.owner === account);
    res.json({ nfts: owned });
});

app.get('/nfts', (req, res) => {
    res.json({ nfts: Object.values(lattice.nfts) });
});

app.get('/anchors', (req, res) => {
    res.json({ anchors: Object.values(lattice.anchors) });
});

app.get('/multisigs', (req, res) => {
    res.json({ multisigs: lattice.multisigs });
});

app.get('/multisig/:account', (req, res) => {
    const account = req.params.account;
    res.json(lattice.multisigs[account] || { error: 'Multisig not found' });
});

// Full state bootstrap for new nodes
app.get('/bootstrap', (req, res) => {
    res.json(lattice.getStateSnapshot());
});

app.post('/bootstrap', (req, res) => {
    const snapshot = req.body;
    if (!snapshot || !snapshot.stateHash) return res.status(400).json({ error: 'Invalid snapshot' });
    lattice.loadStateSnapshot(snapshot);
    res.json({ success: true, stateHash: lattice.stateHash });
});

const server = app.listen(PORT, () => {
    console.log(`[Lattice Node] Operating asynchronously on port ${PORT}`);
});

// --- Real-Time Block Feed via WebSocket ---
const wss = new WebSocketServer({ server });
const wsClients = new Set();

wss.on('connection', (ws) => {
    wsClients.add(ws);
    console.log(`[WS] Block feed client connected. Total: ${wsClients.size}`);
    
    // Send current stats on connect
    const accounts = Object.keys(lattice.chains).length;
    let totalBlocks = 0;
    for (const chain of Object.values(lattice.chains)) totalBlocks += chain.length;
    ws.send(JSON.stringify({ type: 'STATS', accounts, totalBlocks }));
    
    ws.on('close', () => {
        wsClients.delete(ws);
    });
});

// Broadcast new blocks to all connected clients
function broadcastBlock(block) {
    const msg = JSON.stringify({ type: 'NEW_BLOCK', block });
    for (const client of wsClients) {
        if (client.readyState === 1) {
            client.send(msg);
        }
    }
}
