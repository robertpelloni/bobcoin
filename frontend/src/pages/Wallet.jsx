import { useState } from 'react';
import './Wallet.css';

const MOCK_HISTORY = [
    { id: 'tx_1', date: '2026-02-07 10:45', amount: 50.00, type: 'MINT', hash: 'e5a1...8f2d', decoded: false },
    { id: 'tx_2', date: '2026-02-07 09:30', amount: 12.50, type: 'SEND', hash: 'b3c4...9a1b', decoded: false },
    { id: 'tx_3', date: '2026-02-06 14:20', amount: 100.00, type: 'RECEIVE', hash: 'd7e8...2f5c', decoded: false },
    { id: 'tx_4', date: '2026-02-06 10:00', amount: 5.00, type: 'TIP', hash: 'f9a0...3b6d', decoded: false },
];

export function Wallet() {
    const [privacyMode, setPrivacyMode] = useState(true);
    const [ringSize, setRingSize] = useState(16);
    const [balance, setBalance] = useState(1250.50);
    const [history, setHistory] = useState(MOCK_HISTORY);
    const [showKeys, setShowKeys] = useState(false);

    const toggleDecode = (id) => {
        setHistory(history.map(tx => {
            if (tx.id === id) {
                return { ...tx, decoded: !tx.decoded };
            }
            return tx;
        }));
    };

    return (
        <div className="wallet-container">
            <h1 className="glitch" data-text="PRIVACY VAULT">PRIVACY VAULT</h1>

            <div className="wallet-card">
                <div className="card-header">
                    <h2>TOTAL BALANCE</h2>
                    <div className="privacy-toggle">
                        <span>STEALTH MODE</span>
                        <button
                            className={`toggle-btn ${privacyMode ? 'active' : ''}`}
                            onClick={() => setPrivacyMode(!privacyMode)}
                        >
                            {privacyMode ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </div>

                <div className="balance-display">
                    <span className="currency">BOB</span>
                    <span className="amount">
                        {privacyMode ? '****.**' : balance.toFixed(2)}
                    </span>
                </div>

                <div className="address-section">
                    <label>PUBLIC ADDRESS</label>
                    <div className="address-box">
                        <code>8x7f49c2...3a2b</code>
                        <button className="copy-btn">COPY</button>
                    </div>

                    {privacyMode && (
                        <div className="stealth-address-box">
                            <label>ONE-TIME STEALTH ADDRESS (GENERATED)</label>
                            <code className="stealth">stealth:9z8y7x6w...1c4d</code>
                            <div className="description" style={{fontSize: '0.8rem', color: '#ff00ff'}}>
                                Generated via Diffie-Hellman Key Exchange using the sender's ephemeral key and your view key.
                                Only you can link this address to your wallet.
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="settings-grid">
                <div className="setting-card">
                    <h3>RING SIGNATURES (CLSAG)</h3>
                    <div className="control">
                        <label>RING SIZE: {ringSize}</label>
                        <input
                            type="range"
                            min="11"
                            max="64"
                            value={ringSize}
                            onChange={(e) => setRingSize(e.target.value)}
                        />
                    </div>
                    <p className="description">
                        Number of decoys used to obscure the true spender.
                        Higher values increase privacy but cost slightly more compute.
                        (Default: 16)
                    </p>
                </div>

                <div className="setting-card">
                    <h3>KEY MANAGEMENT</h3>
                    <div className="control">
                        <button className="cyber-button" onClick={() => setShowKeys(!showKeys)} style={{fontSize: '0.8rem', padding: '0.5rem'}}>
                            {showKeys ? 'HIDE KEYS' : 'REVEAL KEYS'}
                        </button>
                    </div>
                    {showKeys && (
                        <div className="keys-box" style={{marginTop: '1rem', background: '#000', padding: '0.5rem', border: '1px solid #ff0055'}}>
                            <div style={{color: '#ff0055', fontSize: '0.7rem', marginBottom: '0.5rem'}}>DO NOT SHARE THESE KEYS</div>
                            <div style={{fontSize: '0.7rem', color: '#888'}}>PRIVATE VIEW KEY:</div>
                            <code style={{display: 'block', wordBreak: 'break-all', fontSize: '0.8rem', marginBottom: '0.5rem'}}>vk_secret_12345...</code>
                            <div style={{fontSize: '0.7rem', color: '#888'}}>PRIVATE SPEND KEY:</div>
                            <code style={{display: 'block', wordBreak: 'break-all', fontSize: '0.8rem'}}>sk_secret_67890...</code>
                        </div>
                    )}
                    <p className="description">
                        View keys allow read-only access. Spend keys allow spending. Keep them safe.
                    </p>
                </div>

                <div className="setting-card">
                    <h3>ZERO-KNOWLEDGE PROOFS</h3>
                    <div className="status-indicator active">
                        <span className="dot"></span> HALO 2 ACTIVE
                    </div>
                    <p className="description">
                        Transactions are verified using recursive zk-SNARKs (Halo 2), ensuring
                        no trusted setup is required and amounts are perfectly hidden (Bulletproofs+).
                    </p>
                </div>
            </div>

            <div className="transaction-history" style={{marginTop: '3rem'}}>
                <h2 style={{borderBottom: '1px solid #333', paddingBottom: '0.5rem'}}>TRANSACTION HISTORY (ENCRYPTED)</h2>
                <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse', background: 'rgba(0,0,0,0.5)'}}>
                    <thead>
                        <tr>
                            <th style={{padding: '1rem', color: '#888'}}>DATE</th>
                            <th style={{padding: '1rem', color: '#888'}}>TYPE</th>
                            <th style={{padding: '1rem', color: '#888'}}>AMOUNT (BULLETPROOFS+)</th>
                            <th style={{padding: '1rem', color: '#888'}}>HASH</th>
                            <th style={{padding: '1rem', color: '#888'}}>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map(tx => (
                            <tr key={tx.id} style={{borderBottom: '1px solid #333'}}>
                                <td style={{padding: '1rem'}}>{tx.date}</td>
                                <td style={{padding: '1rem'}}>
                                    <span style={{
                                        color: tx.type === 'RECEIVE' || tx.type === 'MINT' ? '#0f0' : '#ff0055',
                                        fontWeight: 'bold'
                                    }}>{tx.type}</span>
                                </td>
                                <td style={{padding: '1rem', fontFamily: 'monospace', fontSize: '1.1rem'}}>
                                    {tx.decoded ? (
                                        <span style={{color: '#fff'}}>
                                            {tx.type === 'SEND' || tx.type === 'TIP' ? '-' : '+'}
                                            {tx.amount.toFixed(2)} BOB
                                        </span>
                                    ) : (
                                        <span style={{color: '#555', filter: 'blur(3px)'}}>XX.XX</span>
                                    )}
                                </td>
                                <td style={{padding: '1rem', fontFamily: 'monospace', color: '#0ff'}}>{tx.hash}</td>
                                <td style={{padding: '1rem'}}>
                                    <button
                                        className="cyber-button"
                                        style={{fontSize: '0.7rem', padding: '0.2rem 0.5rem'}}
                                        onClick={() => toggleDecode(tx.id)}
                                    >
                                        {tx.decoded ? 'HIDE' : 'DECODE'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
