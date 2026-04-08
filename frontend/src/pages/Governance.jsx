import { useState, useEffect } from 'react';
import { getProposals, submitLatticeBlock, getLatticeFrontier, getSporaProof, LATTICE_URL } from '../api'; 
import { generateKeypair } from '../cryptoUtils';
import { checkAndUnlock } from '../AchievementService';
import { Block } from '../Block';
import './Governance.css';

export function Governance() {
    const [balance, setBalance] = useState(0);
    const [stakedBalance, setStakedBalance] = useState(0);
    const [votingPower, setVotingPower] = useState(0);
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [keypair, setKeypair] = useState(null);

    useEffect(() => {
        let kp;
        let storedKeys = localStorage.getItem('bobcoin_wallet');
        if (!storedKeys) {
            kp = generateKeypair();
            localStorage.setItem('bobcoin_wallet', JSON.stringify(kp));
            setKeypair(kp);
        } else {
            kp = JSON.parse(storedKeys);
            setKeypair(kp);
        }

        const loadProposals = async () => {
            try {
                const data = await getProposals();
                if (data && Array.isArray(data)) {
                    setProposals(data);
                }

                if (kp) {
                    const frontRes = await getLatticeFrontier(kp.publicKey);
                    const liquid = frontRes.balance || 0;
                    const staked = frontRes.staked_balance || 0;
                    setBalance(liquid);
                    setStakedBalance(staked);
                    
                    // Voting Power: SQRT(Staked * 2 + Liquid)
                    setVotingPower(Math.sqrt(staked * 2 + liquid));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        loadProposals();
        const interval = setInterval(loadProposals, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleVote = async (id, voteType) => {
        if (!confirm(`Cast vote ${voteType.toUpperCase()} on proposal ${id.slice(0, 8)}... with power ${votingPower.toFixed(2)}?`)) return;

        try {
            const frontRes = await getLatticeFrontier(keypair.publicKey);
            const previousHash = frontRes.frontier;
            if (!previousHash) throw new Error("Wallet not initialized on network (no frontier).");

            const expectedChallenge = parseInt(previousHash.substr(0, 8), 16);
            let sporaProof = null;
            try {
                sporaProof = await getSporaProof(expectedChallenge);
            } catch (e) {
                alert("SPoRA Failed: You must be running an active Supernode seeding the Bobtorrent Anchors to vote.");
                return;
            }

            const voteBlock = new Block({
                type: 'vote',
                account: keypair.publicKey,
                previous: previousHash,
                balance: balance, // Voting is free
                staked_balance: frontRes.staked_balance || 0,
                height: frontRes.frontier ? (frontRes.height + 1) : 0,
                link: id, // Link is the proposal hash
                spora: sporaProof,
                payload: { vote: voteType === 'yes' ? 'FOR' : 'AGAINST' }
            });

            await voteBlock.signBlock(keypair.privateKey);
            const res = await submitLatticeBlock(voteBlock);

            if (res.success) {
                alert(`Vote cast successfully! TX: ${res.hash}`);
                
                // Unlock Achievement
                try {
                    const stored = localStorage.getItem('bobcoin_wallet');
                    if (stored) {
                        const kp = JSON.parse(stored);
                        checkAndUnlock('QUADRATIC_CITIZEN', kp, []);
                    }
                } catch(e) {}
            } else {
                alert("Voting failed: " + res.error);
            }
        } catch (e) {
            console.error(e);
            alert("Error casting vote: " + e.message);
        }
    };

    const handleCreateProposal = async (e) => {
        e.preventDefault();
        const title = prompt("Enter proposal title (costs 10 BOB):");
        if (!title) return;
        
        const actionType = prompt("Action Type? (NONE, MINT_TREASURY, UPDATE_DEMURRAGE)", "NONE");
        let actionPayload = {};
        if (actionType === 'MINT_TREASURY') {
            const target = prompt("Target Address:");
            const amount = parseFloat(prompt("Amount to Mint:"));
            if (target && amount > 0) {
                actionPayload = { action: 'MINT_TREASURY', target, amount };
            }
        } else if (actionType === 'UPDATE_DEMURRAGE') {
            const rate = parseFloat(prompt("New Demurrage Rate (e.g. 0.0001):"));
            if (!isNaN(rate)) {
                actionPayload = { action: 'UPDATE_DEMURRAGE', rate };
            }
        }

        if (balance < 10) {
            alert("Insufficient funds! Proposals cost exactly 10 BOB.");
            return;
        }

        try {
            const frontRes = await getLatticeFrontier(keypair.publicKey);
            const previousHash = frontRes.frontier;
            if (!previousHash) throw new Error("Wallet not initialized on network (no frontier).");

            const expectedChallenge = parseInt(previousHash.substr(0, 8), 16);
            let sporaProof = null;
            try {
                sporaProof = await getSporaProof(expectedChallenge);
            } catch (err) {
                alert("SPoRA Failed: You must be running an active Supernode seeding the Bobtorrent Anchors.");
                return;
            }

            const endTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

            const proposalBlock = new Block({
                type: 'proposal',
                account: keypair.publicKey,
                previous: previousHash,
                balance: balance - 10,
                staked_balance: frontRes.staked_balance || 0,
                height: frontRes.frontier ? (frontRes.height + 1) : 0,
                link: 'DAO_PROPOSAL',
                spora: sporaProof,
                payload: { title, endTime, ...actionPayload }
            });

            await proposalBlock.signBlock(keypair.privateKey);
            const res = await submitLatticeBlock(proposalBlock);

            if (res.success) {
                alert(`Proposal Created with Action: ${actionType}! TX: ${res.hash}`);
            } else {
                alert("Proposal failed: " + res.error);
            }
        } catch (err) {
            console.error(err);
            alert("Error creating proposal: " + err.message);
        }
    };

    return (
        <div className="governance-container">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h1 className="glitch" data-text="DAO GOVERNANCE">DAO GOVERNANCE</h1>
                <button className="cyber-button" onClick={handleCreateProposal} title="Create a new DAO proposal on the Lattice. Costs 10 BOB.">NEW PROPOSAL</button>
            </div>

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
                            <span className="prop-id">#{prop.id.slice(0, 8)}...</span>
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
                                    <button className="vote-btn yes" onClick={() => handleVote(prop.id, 'yes')} title="Cast a quadratic vote in favor of this proposal.">VOTE YES</button>
                                    <button className="vote-btn no" onClick={() => handleVote(prop.id, 'no')} title="Cast a quadratic vote against this proposal.">VOTE NO</button>
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
