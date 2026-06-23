export const SUPERNODE_URL = import.meta.env.VITE_SUPERNODE_URL || 'http://localhost:8000';
export const API_URL = import.meta.env.VITE_GAME_HTTP_URL || SUPERNODE_URL;
export const SIGNALING_URL = import.meta.env.VITE_GAME_SIGNALING_URL || SUPERNODE_URL || import.meta.env.VITE_GAME_SERVER_URL || 'http://localhost:3001';
export const LATTICE_URL = import.meta.env.VITE_LATTICE_URL || 'http://localhost:4001';
export const GO_LATTICE_URL = import.meta.env.VITE_GO_LATTICE_URL || 'http://localhost:4001';

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

export const getLatticeChain = async (publicKey) => {
    try {
        const res = await fetch(`${LATTICE_URL}/chain/${publicKey}`);
        return await res.json();
    } catch (e) {
        return { chain: [] };
    }
};

export const getLatticeFrontier = async (publicKey) => {
    try {
        const res = await fetch(`${LATTICE_URL}/frontier/${publicKey}`);
        const data = await res.json();
        return {
            frontier: data.frontier || null,
            balance: data.balance || 0,
            staked_balance: data.staked_balance || 0,
            height: data.height || 0
        };
    } catch (e) {
        return { frontier: null, balance: 0, staked_balance: 0, height: 0 };
    }
};

export const getGoLatticeFrontier = async (publicKey) => {
    try {
        const res = await fetch(`${GO_LATTICE_URL}/frontier/${publicKey}`);
        const data = await res.json();
        return {
            frontier: data.frontier || null,
            balance: data.balance || 0,
            staked_balance: data.staked_balance || 0,
            height: data.height || 0
        };
    } catch (e) {
        return { frontier: null, balance: 0, staked_balance: 0, height: 0 };
    }
};

export const getGoLatticeChain = async (publicKey) => {
    try {
        const res = await fetch(`${GO_LATTICE_URL}/chain/${publicKey}`);
        return await res.json();
    } catch (e) {
        return { chain: [] };
    }
};

export const submitGoLatticeBlock = async (block) => {
    try {
        const res = await fetch(`${GO_LATTICE_URL}/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ block })
        });
        return await res.json();
    } catch (e) {
        console.error('Go lattice block submission failed:', e);
        return { success: false, error: e.message };
    }
};

export const getManifestAnchors = async (account = null) => {
    try {
        const url = account ? `${GO_LATTICE_URL}/anchors/${account}` : `${GO_LATTICE_URL}/anchors`;
        const res = await fetch(url);
        return await res.json();
    } catch (e) {
        console.error('Failed to fetch manifest anchors:', e);
        return { anchors: [] };
    }
};

export const verifyAttestation = async (kind, url, account) => {
    try {
        const res = await fetch(`${SUPERNODE_URL}/verify-attestation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kind, url, account })
        });
        return await res.json();
    } catch (e) {
        return { success: false, message: e.message };
    }
};

// Market Bids from Lattice
export const getMarketBids = async () => {
    try {
        const res = await fetch(`${LATTICE_URL}/market/bids`);
        const data = await res.json();
        return data.bids || [];
    } catch (e) {
        console.error("Failed to fetch market bids:", e);
        return [];
    }
};

export const uploadStorageShard = async ({ hash, data }) => {
    try {
        const res = await fetch(`${SUPERNODE_URL}/upload-shard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hash, data })
        });
        if (!res.ok) {
            throw new Error(await res.text());
        }
        return await res.json();
    } catch (e) {
        console.error('Failed to upload shard:', e);
        throw e;
    }
};

export const publishStorageManifest = async (manifest) => {
    try {
        const res = await fetch(`${SUPERNODE_URL}/publish-manifest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ manifest })
        });
        if (!res.ok) {
            throw new Error(await res.text());
        }
        return await res.json();
    } catch (e) {
        console.error('Failed to publish manifest:', e);
        throw e;
    }
};

export const resolveManifestUrl = (reference) => {
    const ref = (reference || '').trim();
    if (!ref) throw new Error('Manifest reference is required.');

    if (ref.startsWith('bobtorrent://manifest/')) {
        const id = ref.replace('bobtorrent://manifest/', '');
        return `${SUPERNODE_URL}/manifests/${id}`;
    }
    if (ref.startsWith('http://') || ref.startsWith('https://')) {
        return ref;
    }
    return `${SUPERNODE_URL}/manifests/${ref}`;
};

export const getPublishedManifest = async (reference) => {
    try {
        const url = resolveManifestUrl(reference);
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(await res.text());
        }
        return await res.json();
    } catch (e) {
        console.error('Failed to fetch published manifest:', e);
        throw e;
    }
};

export const getPublishedShard = async (referenceOrUrl) => {
    try {
        const url = referenceOrUrl.startsWith('http://') || referenceOrUrl.startsWith('https://')
            ? referenceOrUrl
            : `${SUPERNODE_URL}/shards/${referenceOrUrl}`;
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(await res.text());
        }
        return new Uint8Array(await res.arrayBuffer());
    } catch (e) {
        console.error('Failed to fetch shard:', e);
        throw e;
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
        const storedKeys = localStorage.getItem('lattice_arcade_wallet');
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
    try {
        const res = await fetch(`${API_URL}/bankroll`);
        const data = await res.json();
        return data.balance;
    } catch(e) {
        return 1000000;
    }
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

export const submitProof = async (score, perfects, greats, replayLog = []) => { 
    let address = null;
    try {
        const storedKeys = localStorage.getItem('lattice_arcade_wallet');
        if (storedKeys) address = JSON.parse(storedKeys).publicKey;
    } catch(e) {}

    try { 
        const res = await fetch(`${API_URL}/submit-proof`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                proof: { 
                    playerId: 'player_' + Math.random().toString(36).substr(2, 6), 
                    publicValues: { score, perfects, greats, misses: 0, address, replayLog }, 
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
