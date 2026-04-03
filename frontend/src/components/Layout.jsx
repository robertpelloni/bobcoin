import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import { getLatticeFrontier } from '../api';
import { deriveKeypair } from '../cryptoUtils';

export function Layout() {
    const [netWorth, setNetWorth] = useState(0);

    const calculateNetWorth = async () => {
        const stored = localStorage.getItem('bobcoin_wallet');
        if (!stored) return;
        const master = JSON.parse(stored);
        let total = 0;
        for (let i = 0; i < 5; i++) { 
            const kp = await deriveKeypair(master.mnemonic, i);
            const res = await getLatticeFrontier(kp.publicKey);
            total += (res.balance || 0) + (res.staked_balance || 0);
        }
        setNetWorth(total);
    };

    useEffect(() => {
        calculateNetWorth();
        const interval = setInterval(calculateNetWorth, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="app-layout">
            <header className="sovereign-header" style={{display: 'flex', justifyContent: 'space-between', padding: '1rem 2rem', background: '#000', borderBottom: '1px solid #333'}}>
                <span style={{color: '#ff0055', fontSize: '0.7rem', letterSpacing: '2px', fontWeight: 'bold'}}>NETWORK: MAINNET_V7</span>
                <div style={{textAlign: 'right'}}>
                    <span style={{color: '#666', fontSize: '0.6rem', marginRight: '10px'}}>TOTAL PORTFOLIO:</span>
                    <span className="neon-text" style={{fontWeight: 'bold', fontSize: '1.1rem'}}>{netWorth.toFixed(2)} BOB</span>
                </div>
            </header>
            <Navigation />
            <main className="content-container">
                <Outlet />
            </main>
            <footer className="cyber-footer">
                <div className="scanline"></div>
                <p>BOBCOIN PROTOCOL v{__APP_VERSION__} // SYSTEM READY</p>
            </footer>
        </div>
    );
}
