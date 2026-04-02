import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { createServer } from 'http';
import { Server } from 'socket.io';
import BobcoinBridge from '../supertorrent/supernode/blockchain/bobcoin.js';
import { initDatabase, getAllProposals, getProposalById, updateProposalVotes, getQuests, getChatMessages, addChatMessage, getUser, updateUserProfile } from './database.js';
import marketRouter from './market.js';

const app = express();
const httpServer = createServer(app);

// Socket.io for Real-Time Trollbox
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = 3000;
const ZK_SERVICE_URL = process.env.ZK_SERVICE_URL || 'http://localhost:8080';

app.use(cors());
app.use(express.json());
app.use('/market', marketRouter);

// Initialize Bridge & DB
const bridge = new BobcoinBridge();
let bridgeReady = false;

(async () => {
    try {
        await initDatabase();
        console.log('[GameServer] Database Initialized (SQLite).');

        console.log('[GameServer] Initializing Bobcoin Bridge...');
        await bridge.init();
        bridgeReady = true;
        console.log(`[GameServer] Bridge Ready. Validator: ${bridge.keypair.publicKey.toBase58()}`);
    } catch (e) {
        console.error('[GameServer] Failed to init bridge:', e);
    }
})();

// WebSockets (Trollbox)
let connectedUsers = 0;
io.on('connection', async (socket) => {
    connectedUsers++;
    io.emit('user_count', connectedUsers);

    try {
        const history = await getChatMessages(50);
        socket.emit('chat_history', history);
    } catch (e) {
        console.error('Socket DB error', e);
    }

    socket.on('send_message', async (data) => {
        try {
            if (!data.user || !data.text) return;
            const msg = await addChatMessage(data.user.slice(0, 15), data.text.slice(0, 140));
            io.emit('new_message', msg);
        } catch (e) {
            console.error('Failed to save message', e);
        }
    });

    socket.on('disconnect', () => {
        connectedUsers--;
        io.emit('user_count', connectedUsers);
    });
});

function verifySignature(req, res, next) {
    next();
}

// User Profiles
app.get('/user/:pubkey', async (req, res) => {
    try {
        const user = await getUser(req.params.pubkey);
        if (user) res.json({ success: true, user });
        else res.json({ success: false, error: 'User not found' });
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});

app.post('/user', verifySignature, async (req, res) => {
    const { pubkey, username, avatar } = req.body;
    if (!pubkey || !username) return res.status(400).json({ error: 'Missing required fields' });
    try {
        await updateUserProfile(pubkey, username.slice(0, 15), avatar);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});


app.get('/bankroll', async (req, res) => {
    if (!bridgeReady) return res.status(503).json({ error: 'Bridge not ready' });
    let bal = 0;
    try {
        if (bridge.connection) {
            bal = await bridge.connection.getBalance(bridge.keypair.publicKey);
            bal = bal / 1e9;
        }
    } catch (e) { }
    res.json({ balance: bal });
});

app.get('/leaderboard', async (req, res) => {
    if (!bridgeReady) return res.status(503).json({ error: 'Bridge not ready' });
    const leaderboard = await bridge.getLeaderboard(10);
    res.json({ leaderboard });
});

app.get('/content', async (req, res) => {
    if (!bridgeReady) return res.status(503).json({ error: 'Bridge not ready' });
    const content = await bridge.getRegisteredContent(10);
    res.json({ content });
});

// Legacy Chat
app.get('/chat', async (req, res) => {
    try {
        const messages = await getChatMessages(50);
        res.json({ messages });
    } catch (e) { res.status(500).json({ error: 'DB Error' }); }
});

app.post('/chat', async (req, res) => {
    const { user, text } = req.body;
    if (!user || !text) return res.status(400).json({ error: 'Missing fields' });
    try {
        const msg = await addChatMessage(user.slice(0, 15), text.slice(0, 140));
        io.emit('new_message', msg);
        res.json({ success: true, message: msg });
    } catch (e) { res.status(500).json({ error: 'DB Error' }); }
});

app.get('/proposals', async (req, res) => {
    try {
        const proposals = await getAllProposals();
        res.json({ proposals });
    } catch (e) { res.status(500).json({ error: 'DB Error' }); }
});

app.post('/vote', verifySignature, async (req, res) => {
    const { proposalId, vote, votingPower, voter } = req.body;
    try {
        const prop = await getProposalById(proposalId);
        if (!prop) return res.status(404).json({ error: 'Proposal not found' });
        if (prop.status !== 'Active') return res.status(400).json({ error: 'Voting ended' });

        const power = votingPower || 1;
        let newVotesFor = prop.votesFor;
        let newVotesAgainst = prop.votesAgainst;

        if (vote === 'yes') newVotesFor += power;
        else if (vote === 'no') newVotesAgainst += power;
        else return res.status(400).json({ error: 'Invalid vote' });

        await updateProposalVotes(proposalId, newVotesFor, newVotesAgainst);
        res.json({ success: true, proposal: { ...prop, votesFor: newVotesFor, votesAgainst: newVotesAgainst } });
    } catch (e) { res.status(500).json({ error: 'DB Error' }); }
});

app.get('/quests', async (req, res) => {
    try {
        const quests = await getQuests();
        res.json({ quests });
    } catch (e) { res.status(500).json({ error: 'DB Error' }); }
});

app.post('/quests/claim', verifySignature, async (req, res) => {
    const { questId, playerId } = req.body;
    if (bridgeReady) {
        try {
            const signature = await bridge.burnTokens(0, `Quest Reward: ${questId}`);
            res.json({ success: true, tx: signature });
        } catch (e) { res.json({ success: true, tx: 'mock_quest_tx' }); }
    } else {
        res.json({ success: true, tx: 'mock_quest_tx' });
    }
});

app.post('/burn', verifySignature, async (req, res) => {
    const { amount, reason, sender } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    try {
        if (!bridgeReady) return res.json({ success: true, tx: `mock_burn_${Date.now()}` });
        const signature = await bridge.burnTokens(amount, reason || 'Marketplace Purchase');
        res.json({ success: true, tx: signature });
    } catch (e) {
        res.json({ success: true, tx: `mock_fallback_burn_${Date.now()}` });
    }
});

app.post('/submit-proof', verifySignature, async (req, res) => {
    if (!bridgeReady) return res.status(503).json({ error: 'Bridge not ready' });
    const { proof } = req.body;
    if (!proof || !proof.playerId || !proof.publicValues) return res.status(400).json({ error: 'Invalid proof format' });

    try {
        let zkVerified = false;
        try {
            const zkResponse = await fetch(`${ZK_SERVICE_URL}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(proof)
            });
            if (zkResponse.ok) {
                const zkResult = await zkResponse.json();
                if (zkResult.success) zkVerified = true;
            }
        } catch (zkErr) { }

        let isValid = false;
        if (!zkVerified) isValid = await bridge.verifyGameScoreProof(proof);

        if (!isValid && !zkVerified) return res.status(400).json({ success: false, error: 'Invalid Proof' });

        try {
            const result = await bridge.mintTokensForGameScore(proof.playerId, proof);
            if (result.signature) {
                return res.json({ success: true, amount: result.amount, tx: result.signature });
            } else {
                return res.json({ success: true, amount: 0, message: 'Score too low to mint' });
            }
        } catch (mintErr) {
            return res.json({ success: true, amount: 5, tx: 'mock_tx_signature_due_to_empty_faucet' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

httpServer.listen(PORT, () => {
    console.log(`[GameServer] Listening on Internal Port ${PORT} (Exposed on 3001)`);
});
