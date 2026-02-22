import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getQuests, claimQuest } from '../api';
import './DailyQuests.css';

export function DailyQuests() {
    const wallet = useWallet();
    const [quests, setQuests] = useState([]);
    const [claimed, setClaimed] = useState({});

    useEffect(() => {
        getQuests().then(setQuests);
    }, []);

    const handleClaim = async (questId) => {
        if (!wallet.publicKey) {
            alert("Connect Wallet to Claim!");
            return;
        }

        // Mock check logic
        // In real app, we check if user met criteria (score > 10000 etc)
        const res = await claimQuest(questId, wallet);
        if (res.success) {
            setClaimed(prev => ({ ...prev, [questId]: true }));
            alert("Quest Claimed! Rewards sent.");
        }
    };

    return (
        <div className="daily-quests-container">
            <h3>DAILY BOUNTIES</h3>
            <div className="quest-list">
                {quests.map(q => (
                    <div key={q.id} className={`quest-item ${claimed[q.id] ? 'completed' : ''}`}>
                        <div className="quest-info">
                            <span className="quest-title">{q.title}</span>
                            <span className="quest-reward">+{q.reward} BOB</span>
                        </div>
                        <button
                            className="cyber-button small"
                            onClick={() => handleClaim(q.id)}
                            disabled={claimed[q.id]}
                        >
                            {claimed[q.id] ? 'CLAIMED' : 'CLAIM'}
                        </button>
                    </div>
                ))}
                {quests.length === 0 && <div className="loading">LOADING TARGETS...</div>}
            </div>
        </div>
    );
}
