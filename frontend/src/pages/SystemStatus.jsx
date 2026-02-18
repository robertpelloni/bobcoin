import { useState, useEffect } from 'react';
import { getBankroll } from '../api'; // Use centralized API
import './SystemStatus.css';

export function SystemStatus() {
    const [tps, setTps] = useState(0);
    const [blocks, setBlocks] = useState([]);
    const [bankroll, setBankroll] = useState(0);

    // Mock TPS and Block generation
    useEffect(() => {
        const interval = setInterval(() => {
            // Update TPS (Mocked ~10k)
            const currentTps = Math.floor(Math.random() * 500) + 9500;
            setTps(currentTps);

            // Add new mock blocks for visualizer
            const newBlock = {
                id: Math.floor(Math.random() * 1000000),
                type: Math.random() > 0.5 ? 'PLAY' : 'STORE',
                miner: '0x' + Math.random().toString(16).substring(2, 6),
                timestamp: new Date().toLocaleTimeString()
            };

            setBlocks(prev => [newBlock, ...prev].slice(0, 8));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Fetch real bankroll via API
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const bal = await getBankroll();
                setBankroll(bal);
            } catch (e) {
                console.error(e);
            }
        };
        fetchStats();
        // Refresh periodically
        const interval = setInterval(fetchStats, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="system-status-container">
            <h1 className="glitch" data-text="BLOCK LATTICE STATUS">BLOCK LATTICE STATUS</h1>

            <div className="status-grid">
                <div className="status-card tps-card">
                    <h3>NETWORK TPS</h3>
                    <div className="big-number" style={{color: '#0ff'}}>{tps.toLocaleString()}</div>
                    <div className="progress-bar-thin">
                        <div className="fill" style={{width: `${(tps / 12000) * 100}%`, background: '#0ff'}}></div>
                    </div>
                    <span className="subtext">Target: 10,000+</span>
                </div>

                <div className="status-card bankroll-card">
                    <h3>TREASURY</h3>
                    <div className="big-number" style={{color: '#ff00ff'}}>{bankroll ? bankroll.toFixed(4) : '---'} <span className="unit">BOB</span></div>
                    <span className="subtext">Circulating Supply</span>
                </div>

                <div className="status-card consensus-card">
                    <h3>CONSENSUS</h3>
                    <div className="status-indicator active">
                        <span className="dot"></span> ACTIVE (SNOWBALL)
                    </div>
                    <div className="details">
                        <p>Validators: <span className="highlight">128</span></p>
                        <p>Finality: <span className="highlight">~400ms</span></p>
                    </div>
                </div>
            </div>

            <div className="visualizer">
                <h3>LIVE LATTICE VISUALIZER</h3>
                <div className="lattice-grid">
                    {/* Visual representation of async blocks */}
                    {blocks.map(b => (
                        <div key={b.id} className={`block-node ${b.type.toLowerCase()}`}>
                            <span className="block-type">{b.type}</span>
                            <span className="block-miner">{b.miner}</span>
                        </div>
                    ))}
                    {/* Filler nodes */}
                    {new Array(12).fill(0).map((_, i) => (
                        <div key={`fill-${i}`} className="block-node placeholder"></div>
                    ))}
                </div>
            </div>

            <div className="recent-blocks">
                <h3>RECENT BLOCKS</h3>
                <table>
                    <thead>
                        <tr>
                            <th>BLOCK ID</th>
                            <th>TYPE</th>
                            <th>MINER</th>
                            <th>TIME</th>
                        </tr>
                    </thead>
                    <tbody>
                        {blocks.map(b => (
                            <tr key={b.id} className="fade-in">
                                <td>#{b.id}</td>
                                <td style={{color: b.type === 'PLAY' ? '#0ff' : '#ff00ff'}}>{b.type}</td>
                                <td>{b.miner}...</td>
                                <td>{b.timestamp}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
