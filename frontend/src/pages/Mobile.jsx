import { useState, useEffect, useRef } from 'react';
import { mintTokens, submitVitalityProof } from '../api';
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
    const [activityType, setActivityType] = useState('WALK');
    const [caloriesBurned, setCaloriesBurned] = useState(0);
    const [vitals, setVitals] = useState({ heartRate: 72, cadence: 128, calories: 0, activity: 'WALK', verified: false });
    
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
                        mintTokens(0.1, 'Proof of Walk: 200 Steps').then(() => {
                            setBobEarned(b => b + 0.1);
                        });
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

    // Proof of Vitality (Wearable HealthKit / Google Fit API connection)
    const handleSyncHealthData = async () => {
        const simulatedSteps = Math.floor(Math.random() * 5000) + 1200;
        const hr = activityType === 'RUN'
            ? Math.floor(135 + Math.random() * 35)
            : Math.floor(80 + Math.random() * 30);
        const cadence = activityType === 'RUN'
            ? Math.floor(155 + Math.random() * 25)
            : Math.floor(110 + Math.random() * 30);
        const durationSec = Math.max(60, Math.floor(simulatedSteps / (cadence / 60)));
        // Approximate caloric burn: METs * weight (70kg) * time
        const mets = activityType === 'RUN' ? 9.5 : 3.8;
        const calculatedKcal = Math.round((mets * 3.5 * 70 / 200) * (durationSec / 60));

        setSteps(prev => prev + simulatedSteps);
        setCaloriesBurned(prev => prev + calculatedKcal);

        const payload = {
            deviceId: 'wearable_' + Math.random().toString(36).substring(2, 10),
            steps: simulatedSteps,
            heartRateAvg: hr,
            cadence: cadence,
            durationSec: durationSec,
            caloriesBurned: calculatedKcal,
            activityType: activityType,
            signature: 'sig_' + Math.random().toString(36).substring(2, 16),
            wallet: localStorage.getItem('lattice_arcade_wallet') ? JSON.parse(localStorage.getItem('lattice_arcade_wallet')).publicKey : 'anon_wearable_wallet'
        };

        try {
            const res = await submitVitalityProof(payload);
            if (res && res.success) {
                const reward = res.reward || 1.5;
                setBobEarned(b => b + reward);
                setVitals({ heartRate: hr, cadence: cadence, calories: calculatedKcal, activity: activityType, verified: true });
                alert(`Proof of Vitality Accepted! Synced ${simulatedSteps} steps (${cadence} spm, ${hr} bpm, ${calculatedKcal} kcal) and earned ${reward} BOB.`);
            } else {
                alert(`Proof of Vitality Rejected: ${res.error || 'Failed'}`);
            }
        } catch (e) {
            alert(`Proof of Vitality submission error: ${e.message}`);
        }
    };

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
                    <div style={{display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem'}}>
                        <select
                            value={activityType}
                            onChange={(e) => setActivityType(e.target.value)}
                            className="cyber-select"
                            style={{background: '#0a0a0a', border: '1px solid #333', color: '#0ff', padding: '0.4rem 0.8rem', borderRadius: '4px', fontFamily: 'monospace'}}
                            title="Select physical activity modality for biometric verification"
                        >
                            <option value="WALK">WALK</option>
                            <option value="RUN">RUN</option>
                            <option value="HIKE">HIKE</option>
                        </select>
                        <button
                            className="cyber-button"
                            onClick={handleSyncHealthData}
                            title="Sync pedometer data from Apple Health / Google Fit to generate a Proof of Vitality."
                            style={{borderColor: '#0f0', color: '#0f0'}}
                        >
                            SYNC HEALTH DATA
                        </button>
                    </div>
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

                <div className="metric-card">
                    <div className="icon">🔥</div>
                    <div className="metric-info">
                        <h3>METABOLIC BURN</h3>
                        <p className="value">{caloriesBurned} KCAL</p>
                        <span style={{fontSize: '0.65rem', color: '#0ff'}}>ACTIVE EXPENDITURE</span>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="icon">❤️</div>
                    <div className="metric-info">
                        <h3>BIOMETRIC VITALS</h3>
                        <p className="value" style={{fontSize: '0.85rem'}}>
                            {vitals.heartRate} BPM | {vitals.cadence} SPM
                        </p>
                        <span style={{fontSize: '0.65rem', color: vitals.verified ? '#0f0' : '#888'}}>
                            {vitals.verified ? `✓ ${vitals.activity} VERIFIED (${vitals.calories} kcal)` : 'READY TO SYNC'}
                        </span>
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
