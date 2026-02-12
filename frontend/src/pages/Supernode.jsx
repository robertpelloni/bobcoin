import { useState, useEffect } from 'react';
import { SupernodeControls } from '../components/SupernodeControls';
import { burnTokens } from '../api';
import { Tooltip } from '../components/Tooltip';
import './Supernode.css';

const API_URL = import.meta.env.VITE_SUPERNODE_API_URL || 'http://localhost:8081';

export function Supernode() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URL}/stats`);
            if (!res.ok) throw new Error('Failed to fetch stats');
            const data = await res.json();
            setStats(data);
            setLoading(false);
            setError(null);
        } catch (err) {
            console.warn("Failed to connect to Supernode API, using mock data for demo.");
            // Mock data for UI demonstration
            setStats({
                address: '0xDEMO...NODE',
                uptime: 3600 * 24, // 1 day
                storage: {
                    totalSize: 1024 * 1024 * 1024 * 2.5, // 2.5 GB
                    torrents: [
                         { infoHash: '123', name: 'ubuntu-22.04-desktop-amd64.iso', progress: 1.0, peers: 45, totalSize: 1024*1024*1024*2.5 }
                    ]
                },
                network: {
                    peers: 8,
                    downloadSpeed: 1024 * 50,
                    uploadSpeed: 1024 * 1200
                }
            });
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleAddTorrent = async (magnet) => {
        const FEE = 100;
        if (!confirm(`Seeding a new file requires burning ${FEE} BOB. Proceed?`)) return;

        try {
            // 1. Pay Fee
            const burnRes = await burnTokens(FEE, `Storage Request: ${magnet.slice(0, 20)}...`);
            if (!burnRes.success) {
                alert("Payment failed: " + burnRes.error);
                return;
            }
            console.log(`Burn Confirmed: ${burnRes.tx}`);

            // 2. Add Torrent
            const res = await fetch(`${API_URL}/add-torrent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ magnet })
            });
            if (res.ok) {
                alert(`Torrent added! (TX: ${burnRes.tx.slice(0,8)}...)`);
                fetchStats();
            } else {
                alert("Failed to add torrent to node (Mock Mode).");
            }
        } catch (e) {
            console.error(e);
            alert("Error processing request (Mock Mode)");
        }
    };

    const handleRemoveTorrent = async (infoHash) => {
        if (!confirm("Stop seeding this file? This will reduce your validator probability.")) return;
        try {
            const res = await fetch(`${API_URL}/remove-torrent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ infoHash })
            });
            if (res.ok) {
                fetchStats();
            } else {
                alert("Failed to remove torrent (Mock Mode)");
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (error && !stats) return <div className="error">{error}</div>;
    if (loading) return <div className="loading">CONNECTING TO NODE...</div>;

    return (
        <div className="supernode-container">
            <h1 className="glitch" data-text="SUPERNODE CONTROL">SUPERNODE CONTROL</h1>

            <div className="node-status-panel">
                <div className="status-item">
                    <Tooltip text="The public address of your Validator Node.">
                        <span className="label">VALIDATOR ADDRESS ⓘ</span>
                    </Tooltip>
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
                        <Tooltip text="Total disk space allocated to the network for consensus.">
                            <span className="label">TOTAL STORAGE ⓘ</span>
                        </Tooltip>
                        <span className="value big">{(stats.storage.totalSize / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <div className="metric">
                        <Tooltip text="Number of other nodes exchanging data with this peer.">
                            <span className="label">ACTIVE PEERS ⓘ</span>
                        </Tooltip>
                        <span className="value big">{stats.network.peers}</span>
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

            <div className="controls-panel" style={{marginBottom: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.6)', border: '1px solid #333'}}>
                <SupernodeControls onAdd={handleAddTorrent} />
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
                            <th>ACTION</th>
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
                                <td>
                                    <button
                                        className="cyber-button"
                                        style={{fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderColor: '#ff0055', color: '#ff0055'}}
                                        onClick={() => handleRemoveTorrent(t.infoHash)}
                                    >
                                        STOP
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {stats.storage.torrents.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{textAlign: 'center', padding: '2rem', color: '#555'}}>
                                    NO ACTIVE SEEDS. ADD A MAGNET LINK TO START MINING.
                                </td>
                            </tr>
                        )}
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
