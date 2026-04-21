import React from 'react';
import { useNetwork } from '../NetworkContext';

export function Leaderboard({ mintStatus }) {
    const { heartbeat, identities, trustScores } = useNetwork();
    
    // In a real app, this would come from a leaderboard API.
    // For now, we simulate by showing some stats from heartbeat.
    const players = heartbeat?.accounts ? Object.keys(heartbeat.accounts).map((addr, i) => {
        const id = identities?.[addr];
        const provider = id ? Object.keys(id)[0] : null;
        const name = id ? `${id[provider]} @${provider}` : `${addr.slice(0, 8)}...`;
        return {
            rank: i + 1,
            name: name,
            score: Number(heartbeat.accounts[addr].balance || 0).toFixed(0),
            trust: trustScores?.[addr] || 100
        };
    }).sort((a,b) => b.score - a.score).slice(0, 5) : [
        { rank: 1, name: 'player_x84...', score: 14500, trust: 100 },
        { rank: 2, name: 'player_9z2...', score: 12200, trust: 100 },
        { rank: 3, name: 'player_1a9...', score: 9800, trust: 100 }
    ];
<<<<<<< Updated upstream
=======

    const getBadge = (index, score) => {
        if (index < 3) return BADGES[index];
        if (score > 10000) return '⚡';
        return '';
    };
>>>>>>> Stashed changes

    return (
        <div className="leaderboard-container" style={{ marginTop: '2rem' }}>
            <h2>GLOBAL LEADERBOARD</h2>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--primary-color)' }}>
                        <th>RANK</th>
                        <th>PLAYER</th>
                        <th>BOB</th>
                        <th>TRUST</th>
                    </tr>
                </thead>
                <tbody>
                    {players.map(p => (
                        <tr key={p.rank}>
                            <td>{p.rank}</td>
                            <td style={{color: p.trust < 100 ? '#f00' : 'inherit'}}>{p.name}</td>
                            <td>{p.score}</td>
                            <td>{p.trust}%</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
