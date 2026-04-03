export const API_URL = import.meta.env.VITE_GAME_SERVER_URL || 'http://localhost:3001';

export const burnTokens = async (amount, reason) => {
    try {
        const res = await fetch(`${API_URL}/burn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, reason })
        });
        return await res.json();
    } catch (e) {
        console.error("Failed to burn tokens:", e);
        return { success: false };
    }
};

export const mintTokens = async (amount, reason) => {
    try {
        const res = await fetch(`${API_URL}/mint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, reason })
        });
        return await res.json();
    } catch (e) {
        console.error("Failed to mint tokens:", e);
        return { success: false };
    }
};

export const getTransactions = async () => {
    try {
        const res = await fetch(`${API_URL}/transactions`);
        return await res.json();
    } catch (e) {
        console.error("Failed to fetch transactions:", e);
        return [];
    }
};

export const getProposals = async () => {
    try {
        const res = await fetch(`${API_URL}/proposals`);
        return await res.json();
    } catch (e) {
        console.error("Failed to fetch proposals:", e);
        return [];
    }
};

export const castVote = async (id, voteType, power) => {
    try {
        const res = await fetch(`${API_URL}/proposals/${id}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                voterId: 'user_' + Math.random().toString(36).substr(2, 6),
                voteType: voteType === 'yes' ? 'FOR' : 'AGAINST',
                power
            })
        });
        return await res.json();
    } catch (e) {
        console.error("Voting failed:", e);
        return { success: false };
    }
};export const getBankroll = async () => { return 1000 + Math.random() * 50; }; export const submitProof = async (score, perfects, greats) => { try { const res = await fetch(`${API_URL}/submit-proof`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proof: { playerId: 'player_' + Math.random().toString(36).substr(2, 6), publicValues: { score, perfects, greats, misses: 0 }, proofBytes: 'mock_bytes' } }) }); return await res.json(); } catch (e) { console.error('Proof submission failed:', e); return { success: false, error: e.message }; } };
