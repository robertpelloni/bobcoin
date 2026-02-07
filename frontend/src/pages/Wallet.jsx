import { useState } from 'react';
import './Wallet.css';

export function Wallet() {
    const [privacyMode, setPrivacyMode] = useState(true);
    const [ringSize, setRingSize] = useState(16);
    const [balance, setBalance] = useState(1250.50); // Mock balance for demo

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
                    <h3>VIEW KEYS</h3>
                    <div className="control">
                        <button className="cyber-button" style={{fontSize: '0.8rem', padding: '0.5rem'}}>EXPORT VIEW KEY</button>
                    </div>
                    <p className="description">
                        Grant read-only access to your transaction history for auditing or compliance
                        without revealing your spend key.
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
        </div>
    );
}
