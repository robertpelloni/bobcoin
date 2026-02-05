
const GAME_SERVER_URL = 'http://localhost:3001';

export async function submitProof(score, perfects, greats) {
    // Generate a simulated public key (In real app, connect to Phantom Wallet)
    const playerId = 'PlayerOnePublicKey1111111111111111111111';

    const proof = {
        playerId,
        publicValues: {
            score,
            perfects: Math.floor(score / 100), // Approximate for mock
            greats: 0
        },
        proofBytes: 'mock_proof_from_frontend'
    };

    try {
        const response = await fetch(`${GAME_SERVER_URL}/submit-proof`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ proof })
        });

        return await response.json();
    } catch (e) {
        console.error("API Error:", e);
        throw e;
    }
}

export async function getBankroll() {
    try {
        const response = await fetch(`${GAME_SERVER_URL}/bankroll`);
        const data = await response.json();
        return data.balance;
    } catch (e) {
        console.error("Failed to fetch bankroll:", e);
        return 0;
    }
}

export async function getLeaderboard() {
    try {
        const response = await fetch(`${GAME_SERVER_URL}/leaderboard`);
        const data = await response.json();
        return data.leaderboard || [];
    } catch (e) {
        console.error("Failed to fetch leaderboard", e);
        return [];
    }
}
