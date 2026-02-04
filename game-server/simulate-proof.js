
// Simulation script to test the Game Server
import fetch from 'node-fetch'; // Requires node-fetch or Node 18+ native fetch

async function runSimulation() {
    const SERVER_URL = 'http://localhost:3000/submit-proof';

    const mockProof = {
        playerId: 'PlayerOnePublicKey1111111111111111111111',
        publicValues: {
            perfects: 50,
            greats: 10,
            // 50 * 100 + 10 * 50 = 5000 + 500 = 5500
            score: 5500
        },
        proofBytes: 'mock_zk_proof_bytes_base64_etc'
    };

    console.log('Sending Proof:', mockProof);

    try {
        const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proof: mockProof })
        });

        const data = await response.json();
        console.log('Server Response:', data);
    } catch (e) {
        console.error('Simulation Failed:', e.message);
    }
}

// Check native fetch availability (Node 18+) or polyfill if needed
if (!global.fetch) {
    console.log('Native fetch not found. Please run with Node 18+.');
} else {
    runSimulation();
}
