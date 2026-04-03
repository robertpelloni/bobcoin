import express from 'express';
import cors from 'cors';
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

app.get('/status', (req, res) => {
    res.json({
        status: 'online',
        service: 'Asynchronous Block Lattice Node',
        chains: Object.keys(lattice.chains).length,
        blocks: Object.keys(lattice.blocks).length
    });
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
            height: chain.length,
            headHash: head ? head.hash : null
        };
    }
    res.json(result);
});

app.get('/frontier/:account', (req, res) => {
    const account = req.params.account;
    const frontier = lattice.getFrontier(account);
    res.json({ frontier: frontier ? frontier.hash : null });
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
