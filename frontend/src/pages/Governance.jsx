import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getProposals, castVote } from '../api'; // This must point to the api.js file we just updated
import './Governance.css';

export function Governance() {
    const wallet = useWallet();
    const [balance] = useState(1250); // Mock balance
    const votingPower = Math.floor(Math.sqrt(balance)); // Quadratic Voting
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadProposals = async () => {
        try {
            const data = await getProposals();
            if (data && Array.isArray(data)) {
                setProposals(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProposals();
        // Poll for updates
        const interval = setInterval(loadProposals, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleVote = async (id, voteType) => {
        // Optimistic update
        setProposals(prev => prev.map(p => {
            if (p.id === id) {
                return {
                    ...p,
                    votesFor: voteType === 'yes' ? p.votesFor + votingPower : p.votesFor,
                    votesAgainst: voteType === 'no' ? p.votesAgainst + votingPower : p.votesAgainst
                };
            }
            return p;
        }));

        const result = await castVote(id, voteType, votingPower, wallet);
        if (result && result.success) {
            console.log("Vote confirmed!");
            loadProposals();
        } else {
            alert("Vote failed or server unreachable");
        }
    };

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
                    <span className="value">{proposals.filter(p => p.status === 'Active').length}</span>
                </div>
            </div>

            <div className="proposals-list">
                <h2>ACTIVE PROPOSALS</h2>
                {loading ? <div className="loading">LOADING DAO...</div> : proposals.map(prop => (
                    <div key={prop.id} className={`proposal-card ${prop.status.toLowerCase()}`}>
                        <div className="prop-header">
                            <span className="prop-id">#{prop.id}</span>
                            <span className={`status-badge ${prop.status.toLowerCase()}`}>{prop.status}</span>
                        </div>
                        <h3>{prop.title}</h3>

                        <div className="vote-bar">
                            <div className="bar-for" style={{width: `${(prop.votesFor / (prop.votesFor + prop.votesAgainst + 0.0001)) * 100}%`}}></div>
                        </div>
                        <div className="vote-stats">
                            <span>YES: {prop.votesFor}</span>
                            <span>NO: {prop.votesAgainst}</span>
                        </div>

                        <div className="prop-actions">
                            {prop.status === 'Active' ? (
                                <>
                                    <button className="vote-btn yes" onClick={() => handleVote(prop.id, 'yes')}>VOTE YES</button>
                                    <button className="vote-btn no" onClick={() => handleVote(prop.id, 'no')}>VOTE NO</button>
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
