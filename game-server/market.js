import express from 'express';
import { createBid, getOpenBids, acceptBid } from './database.js';

const router = express.Router();

router.get('/bids', async (req, res) => {
    try {
        const bids = await getOpenBids();
        res.json({ bids });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error' });
    }
});

router.post('/bid', async (req, res) => {
    const { magnet, amount } = req.body;
    if (!magnet || !amount) return res.status(400).json({ error: 'Magnet and Amount required' });

    try {
        const id = await createBid(magnet, amount);
        res.json({ success: true, id });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error' });
    }
});

router.post('/accept', async (req, res) => {
    const { bidId, nodeId } = req.body;
    if (!bidId || !nodeId) return res.status(400).json({ error: 'BidId and NodeId required' });

    try {
        const changes = await acceptBid(bidId, nodeId);
        if (changes > 0) {
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'Bid not available or already accepted' });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error' });
    }
});

export default router;
