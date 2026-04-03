import { useState, useEffect } from 'react';
import { mintTokens } from '../api';
import './Mobile.css';

export function Mobile() {
    const [miningActive, setMiningActive] = useState(false);
    const [steps, setSteps] = useState(0);
    const [storageMined, setStorageMined] = useState(0); // in MB
    const [bobEarned, setBobEarned] = useState(0);

    // Simulate Step Counter (Proof of Walk)
    useEffect(() => {
        let interval;
        if (miningActive) {
            interval = setInterval(() => {
                setSteps(prev => {
                    const newSteps = prev + Math.floor(Math.random() * 3) + 1;
                    // Every 100 steps = 1 BOB minted (mock logic)
                    if (newSteps % 100 < prev % 100) {
                        mintTokens(1, 'Proof of Walk: 100 Steps').then(() => {
                            setBobEarned(b => b + 1);
                        });
                    }
                    return newSteps;
                });
                
                setStorageMined(prev => {
                    const newStorage = prev + (Math.random() * 0.5);
                    // Every 50 MB = 1 BOB minted (mock logic)
                    if (newStorage % 50 < prev % 50) {
                        mintTokens(1, 'Background Storage Mining: 50MB').then(() => {
                            setBobEarned(b => b + 1);
                        });
                    }
                    return newStorage;
                });
            }, 2000);
        }
        return () => clearInterval(interval);
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
                <h3>NETWORK SYNC</h3>
                <p>Node ID: <span>mob_{Math.random().toString(36).substr(2, 6)}</span></p>
                <p>Peers Connected: <span>{miningActive ? Math.floor(Math.random() * 5) + 1 : 0}</span></p>
                <p>Battery Temp: <span>{miningActive ? '34°C' : '28°C'}</span></p>
            </div>
        </div>
    );
}
