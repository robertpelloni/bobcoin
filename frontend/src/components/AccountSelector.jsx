import React, { useState, useEffect } from 'react';
import { getLatticeFrontier } from '../api';
import { useNetwork } from '../NetworkContext';

export function AccountSelector({ currentAccount, onAccountChange }) {
    const [activeAccounts, setActiveAccounts] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const { identities } = useNetwork();

    const scan = async () => {
        const stored = localStorage.getItem('bobcoin_wallet');
        if (!stored) return;
        setIsScanning(true);
        const master = JSON.parse(stored);
        const found = [];

        for (let i = 0; i < 5; i++) {
            const { deriveKeypair } = await import('../cryptoUtils');
            const kp = await deriveKeypair(master.mnemonic, i);
            const res = await getLatticeFrontier(kp.publicKey);
            found.push({ index: i, balance: res.balance || 0, address: kp.publicKey });
        }
        setActiveAccounts(found);
        setIsScanning(false);
    };

    useEffect(() => {
        scan();
    }, []);

    const getDisplayName = (acc) => {
        const id = identities?.[acc.address];
        if (id) {
            const provider = Object.keys(id)[0];
            return `${id[provider]} @${provider}`;
        }
        return `ACCOUNT #${acc.index} (${acc.address.slice(0, 6)}...)`;
    };

    return (
        <div className="account-selector-container" style={{ marginBottom: '2rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.7rem', color: '#666', letterSpacing: '1px' }}>ACTIVE SOVEREIGN ACCOUNT</label>
                <button className="cyber-button small" onClick={scan} disabled={isScanning} style={{ fontSize: '0.6rem' }}>
                    {isScanning ? 'SCANNING...' : 'SCAN PORTFOLIO'}
                </button>
            </div>
            <select
                className="cyber-input"
                value={currentAccount?.index || 0}
                onChange={(e) => onAccountChange(Number(e.target.value))}
                style={{ width: '100%', padding: '0.8rem', fontSize: '0.9rem', color: '#0ff', background: '#000' }}
            >
                {activeAccounts.map(acc => (
                    <option key={acc.index} value={acc.index}>
                        {getDisplayName(acc)} - {acc.balance.toFixed(2)} BOB
                    </option>
                ))}
            </select>
        </div>
    );
}
