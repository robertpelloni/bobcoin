import { useState, useEffect } from 'react';
import { getContent } from '../api';
import './Leaderboard.css'; // Reuse Cyberpunk styles

export function Marketplace() {
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchContent() {
            const data = await getContent();
            setContent(data);
            setLoading(false);
        }
        fetchContent();
        const interval = setInterval(fetchContent, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleSeed = (magnet) => {
        console.log("Seeding intent:", magnet);
        alert("Transmission Initiated. Seeding Request sent to Node.");
    };

    if (loading && content.length === 0) return <div className="cyber-panel">LOADING MARKET DATA...</div>;

    return (
        <div className="cyber-panel leaderboard-panel">
            <h2 className="panel-title">PREMIUM CONTENT MARKET</h2>
            <div className="content-grid">
                {content.length === 0 ? (
                    <div className="empty-state">NO CONTENT REGISTERED</div>
                ) : (
                    <table className="cyber-table">
                        <thead>
                            <tr>
                                <th>BURN (COST)</th>
                                <th>FILE NAME</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {content.map((item, index) => (
                                <tr key={index} className="content-row">
                                    <td className="score-cell">🔥 {item.burnAmount}</td>
                                    <td className="player-cell">
                                        <div className="file-name">{item.name}</div>
                                        <div className="tx-hash" title={item.magnet}>{item.magnet.substring(0, 30)}...</div>
                                    </td>
                                    <td>
                                        <button
                                            className="cyber-button small"
                                            onClick={() => handleSeed(item.magnet)}
                                        >
                                            SEED
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <div className="market-footer">
                REGISTER CONTENT VIA CLI: <code>node scripts/upload.js [magnet]</code>
            </div>
        </div>
    );
}
