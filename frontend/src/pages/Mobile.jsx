import { useState, useEffect, useRef } from 'react';
import { mintTokens } from '../api';
import './Mobile.css';

// Utility for hashing in the browser
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function Mobile() {
    const [miningActive, setMiningActive] = useState(false);
    const [steps, setSteps] = useState(0);
    const [storageMined, setStorageMined] = useState(0); // in MB
    const [bobEarned, setBobEarned] = useState(0);
    const [plotCount, setPlotCount] = useState(0);
    const [currentChallenge, setCurrentChallenge] = useState('');
    
    // In-memory "hard drive" for Proof of Space
    const plotData = useRef(new Map());

    // Proof of Walk (Mocked step counter)
    useEffect(() => {
        let interval;
        if (miningActive) {
            interval = setInterval(() => {
                setSteps(prev => {
                    const newSteps = prev + Math.floor(Math.random() * 3) + 1;
                    if (newSteps % 200 < prev % 200) {
                        // Every 200 steps, simulate a small reward

// Replace with true vitality API call
fetch(`${import.meta.env.VITE_GAME_HTTP_URL || 'http://localhost:3001'}/sdk/v1/vitality`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        deviceId: 'mob_' + Math.random().toString(36).substr(2, 6),
        steps: newSteps, // passing the steps to the vitality API
        heartRateAvg: 85.5,
        signature: 'mock_sig',
        walletAddress: 'mock_wallet'
    })
}).then(res => res.json()).then(data => {
    if (data.success) {
        setBobEarned(b => b + data.reward);
    }
}).catch(console.error);

                    }
                    return newSteps;
                });
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [miningActive]);

    // Proof of Space (Chia-style Plotting & Farming)
    useEffect(() => {
        let isFarming = miningActive;
        let plotTimeout;
        
        const farm = async () => {
            if (!isFarming) return;

            // 1. PLOTTING: Generate new cryptographic plots in memory to simulate allocating storage
            for (let i = 0; i < 500; i++) {
                const newPlotSeed = Math.random().toString(36) + Date.now();
                const plotHash = await sha256(newPlotSeed);
                plotData.current.set(plotHash.substring(0, 3), plotHash);
            }
            
            setPlotCount(plotData.current.size);
            setStorageMined(plotData.current.size * 0.05); // Assume each plot chunk represents 50KB

            // 2. FARMING: Network broadcasts a random challenge
            const networkChallenge = await sha256(Date.now().toString());
            const challengePrefix = networkChallenge.substring(0, 3);
            setCurrentChallenge(challengePrefix);

            // 3. SCAN: Check if our hard drive (plotData) contains the winning hash
            if (plotData.current.has(challengePrefix)) {
                const proofOfSpace = plotData.current.get(challengePrefix);
                console.log(`[PoST] Bingo! Plot matched challenge ${challengePrefix} -> ${proofOfSpace}`);
                
                // We won the block! Submit the proof of space to the Oracle/Lattice
                // Clear the plot to prevent double-spending the same proof
                plotData.current.delete(challengePrefix);

                mintTokens(1, `Proof of Space Won: ${proofOfSpace.substring(0, 10)}...`).then((res) => {
                    if (res && res.success) {
                        setBobEarned(b => b + 1);
                    }
                });
            }

            // Loop
            plotTimeout = setTimeout(farm, 1000);
        };

        if (miningActive) {
            farm();
        }

        return () => {
            isFarming = false;
            clearTimeout(plotTimeout);
        };
    }, [miningActive]);

    return (
        <div className="mobile-container">
            <h1 className="glitch" data-text="MOBILE LIGHT NODE">MOBILE LIGHT NODE</h1>

            <div className="status-panel">
                <div className="status-header">
                    <h2>MINING STATUS: {miningActive ? <span className="online">ACTIVE</span> : <span className="offline">STANDBY</span>}</h2>
                    <button 
                        className={`cyber-button ${miningActive ? 'stop' : 'start'}`}
                        onClick={() => setMiningActive(!miningActive)}
                        title="Toggle the mobile background mining process (Proof of Walk & Storage Allocation)."
                    >
                        {miningActive ? 'HALT MINING' : 'START MINING'}
                    </button>
                </div>
            </div>

            <div className="mining-metrics">
                <div className="metric-card">
                    <div className="icon">👟</div>
                    <div className="metric-info">
                        <h3>PROOF OF WALK</h3>
                        <p className="value">{steps} STEPS</p>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="icon">💾</div>
                    <div className="metric-info">
                        <h3>STORAGE PROVISIONED</h3>
                        <p className="value">{storageMined.toFixed(2)} MB</p>
                    </div>
                </div>

                <div className="metric-card highlight">
                    <div className="icon">🪙</div>
                    <div className="metric-info">
                        <h3>BOB EARNED</h3>
                        <p className="value">{bobEarned} BOB</p>
                    </div>
                </div>
            </div>

            <div className="network-info">
                <h3>NETWORK SYNC (PoST)</h3>
                <p>Node ID: <span>mob_{Math.random().toString(36).substr(2, 6)}</span></p>
                <p>Current Challenge: <span style={{fontFamily: 'monospace', color: '#0ff'}}>{currentChallenge || 'WAITING...'}</span></p>
                <p>Local Plots (Hashes): <span style={{fontFamily: 'monospace'}}>{plotCount}</span></p>
                <p>Peers Connected: <span>{miningActive ? Math.floor(Math.random() * 5) + 1 : 0}</span></p>
                <p>Battery Temp: <span style={{color: miningActive ? '#ff0055' : '#0f0'}}>{miningActive ? '38°C' : '28°C'}</span></p>
            </div>
        </div>
    );
}
