import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import { getLatticeFrontier, LATTICE_URL } from '../api';
import { deriveKeypair } from '../cryptoUtils';
import { useNetwork } from '../NetworkContext';

export function Layout() {
    const [netWorth, setNetWorth] = useState(0);
    const { heartbeat } = useNetwork();

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

        return () => {
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="app-layout">
            <header className="sovereign-header" style={{display: 'flex', justifyContent: 'space-between', padding: '1rem 2rem', background: '#000', borderBottom: '1px solid #333'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
                    <span style={{color: '#ff0055', fontSize: '0.7rem', letterSpacing: '2px', fontWeight: 'bold'}}>NETWORK: MAINNET_V7</span>
                    {heartbeat && (
                        <div className="heartbeat-widget" style={{display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '1px solid #222', paddingLeft: '1.5rem'}}>
                            <div className="pulse-dot" style={{width: '6px', height: '6px', background: '#0f0', borderRadius: '50%', boxShadow: '0 0 8px #0f0'}}></div>
                            <span style={{color: '#0f0', fontSize: '0.65rem', fontFamily: 'monospace'}}>TPS: {heartbeat.tps.toFixed(2)}</span>
                            <span style={{color: '#888', fontSize: '0.65rem', fontFamily: 'monospace'}}>MERKLE: {heartbeat.merkleRoot.slice(0, 8)}...</span>
                        </div>
                    )}
                </div>
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
