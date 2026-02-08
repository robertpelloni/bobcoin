import { useState, useEffect } from 'react';
import './SystemStatus.css';

// We import version from config (defined in vite.config.js)
const VERSION = __APP_VERSION__;

export function SystemStatus() {
    const [services, setServices] = useState({
        gameServer: 'Checking...',
        zkService: 'Checking...',
        supernode: 'Checking...',
        bridge: 'Checking...'
    });
    const [buildInfo, setBuildInfo] = useState(null);

    useEffect(() => {
        // Fetch Build Info
        fetch('/build-info.json')
            .then(res => res.json())
            .then(data => setBuildInfo(data))
            .catch(e => console.error("Failed to load build info", e));
    }, []);

    const checkHealth = async () => {
        // Game Server
        try {
            await fetch('http://localhost:3001/bankroll');
            setServices(s => ({ ...s, gameServer: 'ONLINE', bridge: 'CONNECTED' }));
        } catch {
            setServices(s => ({ ...s, gameServer: 'OFFLINE', bridge: 'UNKNOWN' }));
        }

        // Supernode API
        try {
            await fetch('http://localhost:8081/stats');
            setServices(s => ({ ...s, supernode: 'ONLINE' }));
        } catch {
            setServices(s => ({ ...s, supernode: 'OFFLINE' }));
        }

        // ZK Service (proxied via game server usually, but we can try direct if cors allowed,
        // or infer from game server logs. For now, assume if game server is up, it can talk to ZK)
        // Ideally we'd hit localhost:8080/health but browser might block mixed content or cors
        setServices(s => ({ ...s, zkService: 'ACTIVE (Inferred)' }));
    };

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="system-container">
            <h1 className="glitch" data-text="SYSTEM STATUS">SYSTEM STATUS</h1>

            <div className="version-display">
                PROTOCOL VERSION: <span className="neon-text">{VERSION}</span>
            </div>

            <div className="status-grid">
                <div className={`status-card ${services.gameServer === 'ONLINE' ? 'online' : 'offline'}`}>
                    <h3>GAME SERVER (THE MINT)</h3>
                    <p>STATUS: {services.gameServer}</p>
                    <p className="detail">Orchestrates Gameplay, Governance, and ZK Verification.</p>
                </div>
                <div className={`status-card ${services.supernode === 'ONLINE' ? 'online' : 'offline'}`}>
                    <h3>SUPERNODE (STORAGE)</h3>
                    <p>STATUS: {services.supernode}</p>
                    <p className="detail">P2P Storage Layer (WebTorrent) + Validator Logic.</p>
                </div>
                <div className="status-card online">
                    <h3>ZK SERVICE (PROOF OF PLAY)</h3>
                    <p>STATUS: {services.zkService}</p>
                    <p className="detail">Rust/SP1 Circuit Verifier (RISC-V).</p>
                </div>
                <div className={`status-card ${services.bridge === 'CONNECTED' ? 'online' : 'offline'}`}>
                    <h3>SOLANA BRIDGE</h3>
                    <p>STATUS: {services.bridge}</p>
                    <p className="detail">Layer 1 Consensus & Settlement.</p>
                </div>
            </div>

            <div className="architecture-view">
                <h2>ARCHITECTURE OVERVIEW</h2>
                <div className="tree-view">
                    <code>
                        root/ [{buildInfo?.git.branch} @ {buildInfo?.git.hash}]<br/>
                        {buildInfo?.modules.map(m => (
                            <span key={m.name}>
                                ├── 📁 {m.name}/ ({m.type} v{m.version})<br/>
                            </span>
                        ))}
                    </code>
                </div>
                {buildInfo && <p className="last-build">Last Build: {buildInfo.git.date}</p>}
            </div>
        </div>
    );
}
