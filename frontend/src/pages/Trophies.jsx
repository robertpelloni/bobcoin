import { useState, useEffect } from 'react';
import { ACHIEVEMENTS } from '../AchievementService';
import { getLatticeChain } from '../api';
import './Trophies.css';

export function Trophies() {
    const [keypair, setKeypair] = useState(null);
    const [unlocked, setUnlocked] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedKeys = localStorage.getItem('lattice_arcade_wallet');
        if (storedKeys) {
            const kp = JSON.parse(storedKeys);
            setKeypair(kp);
            fetchTrophies(kp.publicKey);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchTrophies = async (pubkey) => {
        try {
            const res = await getLatticeChain(pubkey);
            const chain = res.chain || [];
            
            // Filter achievement_unlock blocks
            const unlockedIds = chain
                .filter(b => b.type === 'achievement_unlock' && b.payload)
                .map(b => b.payload.id);
            
            setUnlocked(unlockedIds);
        } catch (e) {
            console.error('Trophies: Failed to fetch chain', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="trophy-container">LOADING TROPHY ROOM...</div>;
    if (!keypair) return <div className="trophy-container">INITIALIZE WALLET TO VIEW TROPHIES</div>;

    const totalAchievements = Object.keys(ACHIEVEMENTS).length;
    const progress = (unlocked.length / totalAchievements) * 100;

    return (
        <div className="trophy-container">
            <h1 className="glitch" data-text="TROPHY ROOM">TROPHY ROOM</h1>
            
            <div className="trophy-progress">
                <div className="progress-label">CRYPTOGRAPHIC COMPLETION: {unlocked.length}/{totalAchievements}</div>
                <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{width: `${progress}%`}}></div>
                </div>
            </div>

            <div className="trophy-grid">
                {Object.values(ACHIEVEMENTS).map((ach) => {
                    const isUnlocked = unlocked.includes(ach.id);
                    return (
                        <div 
                            key={ach.id} 
                            className={`trophy-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                            style={isUnlocked ? {borderColor: ach.color, boxShadow: `0 0 15px ${ach.color}33`} : {}}
                        >
                            <div className="trophy-icon" style={isUnlocked ? {color: ach.color} : {}}>{isUnlocked ? ach.icon : '🔒'}</div>
                            <h3 className="trophy-title">{ach.title}</h3>
                            <p className="trophy-desc">{isUnlocked ? ach.desc : '???'}</p>
                            {isUnlocked && <div className="unlocked-badge" style={{background: ach.color}}>UNLOCKED</div>}
                        </div>
                    );
                })}
            </div>

            <div className="trophy-footer">
                ALL ACHIEVEMENTS ARE PERMANENTLY SIGNED AND STORED ON THE BLOCK LATTICE.
            </div>
        </div>
    );
}
