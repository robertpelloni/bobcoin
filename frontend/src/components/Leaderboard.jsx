import React, { useEffect, useState } from 'react';
import { getLeaderboard } from '../api';
import './Leaderboard.css';

export function Leaderboard({ refreshTrigger }) {
    const [scores, setScores] = useState([]);

    useEffect(() => {
        getLeaderboard().then(setScores);
    }, [refreshTrigger]);

    return (
        <div className="leaderboard-panel">
            <h3>/// NETWORK_TOP_MINERS</h3>
            <table>
                <thead>
                    <tr>
                        <th>RANK</th>
                        <th>PLAYER</th>
                        <th>SCORE</th>
                        <th>TS</th>
                    </tr>
                </thead>
                <tbody>
                    {scores.length === 0 ? (
                        <tr><td colSpan="4" className="loading">SCANNING_CHAIN...</td></tr>
                    ) : (
                        scores.map((s, i) => (
                            <tr key={s.signature}>
                                <td>{i + 1}</td>
                                <td className="player-id" title={s.player}>
                                    {s.player.substring(0, 4)}...{s.player.substring(s.player.length - 4)}
                                </td>
                                <td className="neon-text">{s.score}</td>
                                <td className="timestamp">{s.date.split(' ')[1]}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
