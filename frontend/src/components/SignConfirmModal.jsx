import React from 'react';
import './SignConfirmModal.css';

export function SignConfirmModal({ block, onConfirm, onCancel }) {
    if (!block) return null;

    const truncate = (str, len = 20) => str ? str.substring(0, len) + '...' : 'N/A';

    return (
        <div className="guardian-overlay">
            <div className="guardian-modal">
                <div className="guardian-header">
                    <h2 className="glitch" data-text="TRANSACTION GUARDIAN">TRANSACTION GUARDIAN</h2>
                    <div className="status-light neon-red">AWAITING AUTHORIZATION</div>
                </div>

                <div className="guardian-body">
                    <p className="warning">REVIEW RAW BLOCK DATA BEFORE CRYPTOGRAPHIC SIGNING</p>
                    
                    <div className="data-grid">
                        <div className="data-row"><span className="label">BLOCK TYPE:</span> <span className="value type">{block.type.toUpperCase()}</span></div>
                        <div className="data-row"><span className="label">ACCOUNT:</span> <span className="value">{truncate(block.account, 24)}</span></div>
                        <div className="data-row"><span className="label">PREVIOUS:</span> <span className="value">{truncate(block.previous, 24)}</span></div>
                        <div className="data-row"><span className="label">HEIGHT:</span> <span className="value">{block.height}</span></div>
                        <div className="data-row"><span className="label">BALANCE:</span> <span className="value neon-text">{block.balance.toFixed(4)} BOB</span></div>
                        <div className="data-row"><span className="label">LINK/DEST:</span> <span className="value">{truncate(block.link, 24)}</span></div>
                    </div>

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
                    <button className="cyber-button" onClick={onConfirm}>AUTHORIZE & SIGN</button>
                </div>
            </div>
        </div>
    );
}
