import { useState, useEffect } from 'react';
import './Supernode.css';

export function Supernode() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Accessing localhost:8081 directly from browser (mapped port)
                const res = await fetch('http://localhost:8081/stats');
                if (!res.ok) throw new Error('Failed to fetch stats');
                const data = await res.json();
                setStats(data);
                setLoading(false);
                setError(null);
            } catch (err) {
                console.error(err);
                setError('Could not connect to Supernode API. Ensure Docker is running and port 8081 is accessible.');
                // Don't set loading false immediately to allow retries?
                // Actually show error but keep retrying.
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, []);

    if (error && !stats) return <div className="error">{error}</div>;
    if (loading) return <div className="loading">CONNECTING TO NODE...</div>;

    return (
        <div className="supernode-container">
            <h1 className="glitch" data-text="SUPERNODE CONTROL">SUPERNODE CONTROL</h1>

            <div className="node-status-panel">
                <div className="status-item">
                    <span className="label">VALIDATOR ADDRESS</span>
                    <span className="value address">{stats.address}</span>
                </div>
                <div className="status-item">
                    <span className="label">UPTIME</span>
                    <span className="value">{(stats.uptime / 60).toFixed(0)} MIN</span>
                </div>
                <div className="status-item">
                    <span className="label">NETWORK STATUS</span>
                    <span className="value online">ONLINE</span>
                </div>
            </div>

            <div className="storage-panel">
                <h2>STORAGE PROOFS</h2>
                <div className="storage-grid">
                    <div className="metric">
                        <span className="label">TOTAL STORAGE</span>
                        <span className="value big">{(stats.storage.totalSize / 1024 / 1024).toFixed(2)} MB</span>
                        <div className="tooltip">Total disk space allocated to the network for consensus.</div>
                    </div>
                    <div className="metric">
                        <span className="label">ACTIVE PEERS</span>
                        <span className="value big">{stats.network.peers}</span>
                        <div className="tooltip">Number of other nodes exchanging data with this peer.</div>
                    </div>
                     <div className="metric">
                        <span className="label">DL SPEED</span>
                        <span className="value big">{(stats.network.downloadSpeed / 1024).toFixed(1)} KB/s</span>
                    </div>
                     <div className="metric">
                        <span className="label">UL SPEED</span>
                        <span className="value big">{(stats.network.uploadSpeed / 1024).toFixed(1)} KB/s</span>
                    </div>
                </div>
            </div>

            <div className="torrents-list">
                <h2>ACTIVE SEEDS</h2>
                <table>
                    <thead>
                        <tr>
                            <th>NAME</th>
                            <th>PROGRESS</th>
                            <th>PEERS</th>
                            <th>SIZE</th>
                            <th>STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.storage.torrents.map(t => (
                            <tr key={t.infoHash}>
                                <td>{t.name || 'Fetching Metadata...'}</td>
                                <td>
                                    <div className="progress-bar">
                                        <div className="fill" style={{width: `${t.progress * 100}%`}}></div>
                                    </div>
                                    <span className="progress-text">{(t.progress * 100).toFixed(1)}%</span>
                                </td>
                                <td>{t.peers}</td>
                                <td>{(t.totalSize / 1024 / 1024).toFixed(2)} MB</td>
                                <td className={t.progress >= 1 ? 'status-seeding' : 'status-downloading'}>
                                    {t.progress >= 1 ? 'SEEDING' : 'DOWNLOADING'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="info-section">
                <h3>HOW IT WORKS</h3>
                <p>
                    This node downloads and seeds useful data (e.g., Open Source Movies, Scientific Data).
                    It generates <strong>Merkle Proofs</strong> of the stored data slices and submits them to the Solana blockchain.
                    The more data you seed, the higher your probability of earning validator rewards.
                </p>
            </div>
        </div>
    );
}
