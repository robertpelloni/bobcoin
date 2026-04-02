const API_URL = 'http://localhost:3001';

export const burnTokens = async (amount, reason) => {
    console.log(`[API Mock] Burning ${amount} BOB for: ${reason}`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return { success: true, tx: 'tx_' + Math.random().toString(36).substr(2, 9) };
};

export const mintTokens = async (amount, reason) => {
    console.log(`[API Mock] Minting ${amount} BOB for: ${reason}`);
    await new Promise(resolve => setTimeout(resolve, 800));
    return { success: true, tx: 'tx_' + Math.random().toString(36).substr(2, 9) };
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
};
