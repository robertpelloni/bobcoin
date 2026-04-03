import React, { useState, useEffect } from 'react';
import './SplashScreen.css';

export function SplashScreen({ onComplete }) {
    const [status, setStatus] = useState('INITIALIZING...');
    const [progress, setProgress] = useState(0);

    const steps = [
        "DERIVING SOVEREIGN IDENTITY...",
        "SYNCING BLOCK LATTICE (GO_V5)...",
        "VERIFYING SPoRA ANCHORS...",
        "CALCULATING MERKLE ROOT...",
        "ESTABLISHING GOSSIP MESH...",
        "SYSTEM READY."
    ];

    useEffect(() => {
        let currentStep = 0;
        const interval = setInterval(() => {
            if (currentStep < steps.length) {
                setStatus(steps[currentStep]);
                setProgress((prev) => Math.min(prev + (100 / steps.length), 100));
                currentStep++;
            } else {
                clearInterval(interval);
                setTimeout(onComplete, 1000); // Wait for final ready
            }
        }, 800); // Cinematic timing

        return () => clearInterval(interval);
    }, [onComplete]);

    return (
        <div className="splash-screen">
            <div className="splash-content">
                <h1 className="glitch logo" data-text="BOBCOIN_NET">BOBCOIN_NET</h1>
                <div className="version-tag">SOVEREIGN_OS v8.0.0 // MAINNET_ALPHA</div>
                
                <div className="boot-terminal">
                    <div className="status-line">> {status}</div>
                    <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{width: `${progress}%`}}></div>
                    </div>
                </div>

                <div className="matrix-bg"></div>
            </div>
            <div className="scanline"></div>
        </div>
    );
}
