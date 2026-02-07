import { useState } from 'react';
import './Governance.css';

const PROPOSALS = [
    {
        id: 1,
        title: "BIP-001: Increase Ring Size to 24",
        status: "Active",
        votesFor: 15420,
        votesAgainst: 3200,
        endTime: "24h 12m"
    },
    {
        id: 2,
        title: "BIP-002: Whitelist 'Llama 3' for Storage Mining",
        status: "Active",
        votesFor: 8900,
        votesAgainst: 1200,
        endTime: "48h 05m"
    },
    {
        id: 3,
        title: "BIP-003: Reduce Block Time to 250ms",
        status: "Passed",
        votesFor: 50000,
        votesAgainst: 500,
        endTime: "Ended"
    }
];

export function Governance() {
    const [balance] = useState(1250); // Mock balance
    const votingPower = Math.floor(Math.sqrt(balance)); // Quadratic Voting

    return (
        <div className="governance-container">
            <h1 className="glitch" data-text="DAO GOVERNANCE">DAO GOVERNANCE</h1>

            <div className="stats-bar">
                <div className="stat">
                    <span className="label">YOUR STAKE</span>
                    <span className="value">{balance} BOB</span>
                </div>
                <div className="stat highlight">
                    <span className="label">VOTING POWER (QUADRATIC)</span>
                    <span className="value">{votingPower} VP</span>
                    <div className="tooltip">Calculated as SQRT(STAKE) to prevent whale dominance.</div>
                </div>
                <div className="stat">
                    <span className="label">ACTIVE PROPOSALS</span>
                    <span className="value">{PROPOSALS.filter(p => p.status === 'Active').length}</span>
                </div>
            </div>

            <div className="proposals-list">
                <h2>ACTIVE PROPOSALS</h2>
                {PROPOSALS.map(prop => (
                    <div key={prop.id} className={`proposal-card ${prop.status.toLowerCase()}`}>
                        <div className="prop-header">
                            <span className="prop-id">#{prop.id}</span>
                            <span className={`status-badge ${prop.status.toLowerCase()}`}>{prop.status}</span>
                        </div>
                        <h3>{prop.title}</h3>

                        <div className="vote-bar">
                            <div className="bar-for" style={{width: `${(prop.votesFor / (prop.votesFor + prop.votesAgainst)) * 100}%`}}></div>
                        </div>
                        <div className="vote-stats">
                            <span>YES: {prop.votesFor}</span>
                            <span>NO: {prop.votesAgainst}</span>
                        </div>

                        <div className="prop-actions">
                            {prop.status === 'Active' ? (
                                <>
                                    <button className="vote-btn yes">VOTE YES</button>
                                    <button className="vote-btn no">VOTE NO</button>
                                </>
                            ) : (
                                <span className="ended-msg">VOTING ENDED</span>
                            )}
                            <span className="time-left">{prop.endTime}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="info-panel">
                <h3>ABOUT THE DAO</h3>
                <p>
                    Bobcoin governance is decentralized. Supernodes and Token Holders vote on protocol upgrades
                    and <strong>Data Whitelists</strong> (deciding which datasets are eligible for mining rewards).
                    We use <strong>Quadratic Voting</strong> to ensure fair representation.
                </p>
            </div>
        </div>
    );
}
