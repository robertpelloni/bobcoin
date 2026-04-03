import express from 'express';
import cors from 'cors';
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
            spora: blockData.spora
        });
        block.timestamp = blockData.timestamp;
        block.hash = blockData.hash;
        block.signature = blockData.signature;

        lattice.processBlock(block);

        console.log(`[Lattice] Processed ${block.type} block for ${block.account.substr(0, 8)}...`);
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

app.listen(PORT, () => {
    console.log(`[Lattice Node] Operating asynchronously on port ${PORT}`);
});
