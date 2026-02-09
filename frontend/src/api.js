
const GAME_SERVER_URL = 'http://localhost:3001';

// We now support an optional wallet provider for signing
export async function submitProof(score, perfects, greats, wallet = null) {
    // If wallet is provided, we can sign the payload
    // For now, we just pass the public key if available
    const playerId = wallet?.publicKey ? wallet.publicKey.toBase58() : 'PlayerOnePublicKey1111111111111111111111';

    // In a real implementation, we would sign the message here:
    // const message = new TextEncoder().encode(`Score:${score}`);
    // const signature = await wallet.signMessage(message);

    const proof = {
        playerId,
        publicValues: {
            score,
            perfects: Math.floor(score / 100), // Approximate for mock
            greats: 0
        },
        proofBytes: 'mock_proof_from_frontend',
        // signature: signature ? bs58.encode(signature) : null
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

export async function getContent() {
    try {
        const response = await fetch(`${GAME_SERVER_URL}/content`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.content || [];
    } catch (e) {
        console.error("Failed to fetch content", e);
        return [];
    }
}

export async function getProposals() {
    try {
        const response = await fetch(`${GAME_SERVER_URL}/proposals`);
        if (!response.ok) throw new Error("Failed to fetch proposals");
        const data = await response.json();
        return data.proposals || [];
    } catch (e) {
        console.error("Governance API Error:", e);
        return [];
    }
}

export async function castVote(proposalId, vote, votingPower, wallet = null) {
    // If wallet provided, sign vote
    try {
        const response = await fetch(`${GAME_SERVER_URL}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                proposalId,
                vote,
                votingPower,
                voter: wallet?.publicKey ? wallet.publicKey.toBase58() : 'anon'
            })
        });
        return await response.json();
    } catch (e) {
        console.error("Vote API Error:", e);
        return { error: e.message };
    }
}

export async function burnTokens(amount, reason, wallet = null) {
    try {
        const response = await fetch(`${GAME_SERVER_URL}/burn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount,
                reason,
                sender: wallet?.publicKey ? wallet.publicKey.toBase58() : 'anon'
            })
        });
        return await response.json();
    } catch (e) {
        console.error("Burn API Error:", e);
        return { error: e.message };
    }
}
