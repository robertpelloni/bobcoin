export const API_URL = import.meta.env.VITE_GAME_SERVER_URL || 'http://localhost:3001';
export const LATTICE_URL = import.meta.env.VITE_LATTICE_URL || 'http://localhost:4000';
export const SUPERNODE_URL = import.meta.env.VITE_SUPERNODE_URL || 'http://localhost:8081';

export const getSporaProof = async (challenge) => {
    try {
        const res = await fetch(`${SUPERNODE_URL}/spora/${challenge}`);
        const data = await res.json();
        if (data.success) return data.spora;
        throw new Error(data.error);
    } catch (e) {
        console.error("SPoRA Error:", e);
        throw e;
    }
};

export const submitLatticeBlock = async (block) => {
    try {
        const res = await fetch(`${LATTICE_URL}/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ block })
        });
        return await res.json();
    } catch (e) {
        console.error("Lattice block submission failed:", e);
        return { success: false, error: e.message };
    }
};

export const getLatticePending = async (publicKey) => {
    try {
        const res = await fetch(`${LATTICE_URL}/pending/${publicKey}`);
        return await res.json();
    } catch (e) {
        return { pending: [] };
    }
};

export const getLatticeFrontier = async (publicKey) => {
    try {
        const res = await fetch(`${LATTICE_URL}/frontier/${publicKey}`);
        return await res.json();
    } catch (e) {
        return { frontier: null };
    }
};

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
    let address = null;
    try {
        const storedKeys = localStorage.getItem('bobcoin_wallet');
        if (storedKeys) address = JSON.parse(storedKeys).publicKey;
    } catch(e) {}

    try {
        const res = await fetch(`${API_URL}/mint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, reason, address })
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
        const res = await fetch(`${LATTICE_URL}/proposals`);
        return await res.json();
    } catch (e) {
        console.error("Failed to fetch proposals:", e);
        return [];
    }
};

export const getBankroll = async () => {
    return 1000 + Math.random() * 50; 
}; 

export const submitFHEOracle = async (cipherText) => {
    try {
        const res = await fetch(`${API_URL}/fhe-oracle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cipherText })
        });
        return await res.json();
    } catch (e) {
        console.error("FHE Oracle failed:", e);
        return { success: false, error: e.message };
    }
};

export const submitProof = async (score, perfects, greats) => { 
    let address = null;
    try {
        const storedKeys = localStorage.getItem('bobcoin_wallet');
        if (storedKeys) address = JSON.parse(storedKeys).publicKey;
    } catch(e) {}

    try { 
        const res = await fetch(`${API_URL}/submit-proof`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                proof: { 
                    playerId: 'player_' + Math.random().toString(36).substr(2, 6), 
                    publicValues: { score, perfects, greats, misses: 0, address }, 
                    proofBytes: 'mock_bytes' 
                } 
            }) 
        }); 
        return await res.json(); 
    } catch (e) { 
        console.error('Proof submission failed:', e); 
        return { success: false, error: e.message }; 
    } 
};