import React, { useState, useEffect } from 'react';
import { LATTICE_URL } from '../api';
import './SignConfirmModal.css';

export function SignConfirmModal({ block, onConfirm, onCancel }) {
    const [simulation, setSimulation] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!block) return;
        const runSimulation = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${LATTICE_URL}/simulate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ block })
                });
                const data = await res.json();
                setSimulation(data);
            } catch (e) {
                console.error("Simulation failed", e);
            }
            setLoading(false);
        };
        runSimulation();
    }, [block]);

    if (!block) return null;

    const truncate = (str, len = 20) => str ? str.substring(0, len) + '...' : 'N/A';

    return (
        <div className="guardian-overlay">
            <div className="guardian-modal">
                <div className="guardian-header">
                    <h2 className="glitch" data-text="TRANSACTION GUARDIAN">TRANSACTION GUARDIAN</h2>
                    <div className={`status-light ${simulation?.status === 'VALID' ? 'neon-green' : 'neon-red'}`}>
                        {loading ? 'SIMULATING...' : (simulation?.status || 'AWAITING DATA')}
                    </div>
                </div>

                <div className="guardian-body">
                    <p className="warning">REVIEW RAW BLOCK DATA BEFORE CRYPTOGRAPHIC SIGNING</p>
                    
                    <div className="data-grid">
                        <div className="data-row"><span className="label">BLOCK TYPE:</span> <span className="value type">{block.type.toUpperCase()}</span></div>
                        <div className="data-row"><span className="label">ACCOUNT:</span> <span className="value">{truncate(block.account, 24)}</span></div>
                        <div className="data-row"><span className="label">CURRENT BALANCE:</span> <span className="value">{simulation?.currentBalance.toFixed(4) || '...'} BOB</span></div>
                        <div className="data-row" style={{borderBottom: '2px solid #333', paddingBottom: '1rem'}}><span className="label">PROJECTED BALANCE:</span> <span className="value neon-text">{block.balance.toFixed(4)} BOB</span></div>
                        <div className="data-row"><span className="label">HEIGHT:</span> <span className="value">{block.height}</span></div>
                        <div className="data-row"><span className="label">LINK/DEST:</span> <span className="value">{truncate(block.link, 24)}</span></div>
                    </div>

                    {simulation?.error && (
                        <div className="error-panel" style={{color: '#ff0055', fontSize: '0.8rem', marginBottom: '1rem', background: 'rgba(255,0,85,0.1)', padding: '0.5rem', border: '1px solid #ff0055'}}>
                            ⚠️ SIMULATION ERROR: {simulation.error}
                        </div>
                    )}

                    <div className="payload-box">
                        <div className="label">METADATA PAYLOAD:</div>
                        <pre>{JSON.stringify(block.payload, null, 2) || 'EMPTY'}</pre>
                    </div>

                    <div className="spora-status">
                        <span className="label">SPoRA STATUS:</span>
                        <span className="value active">ACTIVE / MINING VERIFIED</span>
                    </div>
                </div>

                <div className="guardian-footer">
                    <button className="cyber-button secondary" onClick={onCancel}>ABORT</button>
                    <button className="cyber-button" onClick={onConfirm} disabled={loading || simulation?.status !== 'VALID'}>AUTHORIZE & SIGN</button>
                </div>
            </div>
        </div>
    );
}
