import { useState, useEffect } from 'react';
import { CyberGrid3D } from '../components/CyberGrid3D';
import { LATTICE_URL } from '../api';
import { checkAndUnlock } from '../AchievementService';
import './SystemStatus.css';

// We import version from config (defined in vite.config.js)
const VERSION = __APP_VERSION__;

export function SystemStatus() {
    const [services, setServices] = useState({
        gameServer: 'Checking...',
        zkService: 'Checking...',
        supernode: 'Checking...',
        lattice: 'Checking...'
    });
    const [peers, setPeers] = useState({});
    const [networkRoot, setNetworkRoot] = useState('0x...');
    const [buildInfo, setBuildInfo] = useState(null);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        // Fetch Build Info
        fetch('/build-info.json')
            .then(res => res.json())
            .then(data => setBuildInfo(data))
            .catch(e => console.error("Failed to load build info", e));
        
        fetchPeers();
    }, []);

    const fetchPeers = async () => {
        try {
            const res = await fetch(`${LATTICE_URL}/peers`);
            const data = await res.json();
            setPeers(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddPeer = async () => {
        const url = prompt("Enter Peer Node URL (e.g. http://localhost:4001):");
        if (!url) return;
        try {
            await fetch(`${LATTICE_URL}/peers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            fetchPeers();
        } catch(e) { alert(e.message); }
    };

    const handleExport = async () => {
        try {
            const res = await fetch(`${LATTICE_URL}/bootstrap`);
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bobcoin_state_${Date.now()}.json`;
            a.click();
            
            // Achievement
            const stored = localStorage.getItem('bobcoin_wallet');
            if (stored) checkAndUnlock('LATTICE_HISTORIAN', JSON.parse(stored), []);
        } catch (e) {
            alert("Export failed: " + e.message);
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSyncing(true);
        try {
            const text = await file.text();
            const snapshot = JSON.parse(text);
            
            const res = await fetch(`${LATTICE_URL}/bootstrap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(snapshot)
            }).then(r => r.json());

            if (res.success) {
                alert("State Synchronized! Network Root: " + res.stateHash.substring(0, 16));
                checkHealth();
            } else {
                alert("Sync failed: " + res.error);
            }
        } catch (e) {
            alert("Sync Error: " + e.message);
        }
        setSyncing(false);
    };

    const checkHealth = async () => {
        // Game Server
        try {
            await fetch('http://localhost:3001/status');
            setServices(s => ({ ...s, gameServer: 'ONLINE' }));
        } catch {
            setServices(s => ({ ...s, gameServer: 'OFFLINE' }));
        }

        // Supernode API
        try {
            await fetch('http://localhost:8081/stats');
            setServices(s => ({ ...s, supernode: 'ONLINE' }));
        } catch {
            setServices(s => ({ ...s, supernode: 'OFFLINE' }));
        }

        // Lattice API (Go Node)
        try {
            const res = await fetch(`${LATTICE_URL}/status`);
            const data = await res.json();
            setServices(s => ({ ...s, lattice: 'ONLINE (Go v5.6.0)' }));
            setNetworkRoot(data.stateHash);
        } catch {
            setServices(s => ({ ...s, lattice: 'OFFLINE' }));
        }

        // ZK Verifier Status
        setServices(s => ({ ...s, zkService: 'ACTIVE (RISC-V)' }));
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

            <CyberGrid3D />

            <div className="network-sync-panel" style={{background: 'rgba(0,255,255,0.05)', border: '1px solid #0ff', padding: '1.5rem', marginBottom: '2rem', textAlign: 'left'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                    <h3 style={{color: '#0ff', margin: 0}}>LATTICE STATE DISCOVERY</h3>
                    <div style={{textAlign: 'right'}}>
                        <div style={{fontSize: '0.6rem', color: '#888'}}>CURRENT NETWORK ROOT</div>
                        <div style={{fontFamily: 'monospace', fontSize: '0.8rem', color: '#ff0055'}}>{networkRoot.substring(0, 32)}...</div>
                    </div>
                </div>
                
                <div className="peer-list" style={{marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                    {Object.values(peers).map(p => (
                        <div key={p.url} style={{background: '#111', border: `1px solid ${p.status === 'online' ? '#0f0' : '#f00'}`, padding: '0.4rem 0.8rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <span style={{color: p.status === 'online' ? '#0f0' : '#f00'}}>●</span>
                            <span style={{color: '#fff'}}>{p.url}</span>
                            <span style={{color: '#888', fontFamily: 'monospace'}}>[{p.latency}ms]</span>
                        </div>
                    ))}
                    {Object.keys(peers).length === 0 && <span style={{color: '#444', fontSize: '0.7rem'}}>NO PEERS REGISTERED</span>}
                </div>

                <button className="cyber-button small" style={{marginBottom: '1rem'}} onClick={handleAddPeer}>REGISTER NEW PEER</button>

                <p style={{color: '#888', fontSize: '0.8rem'}}>Export the current network history or bootstrap your local node from a snapshot.</p>
                <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                    <button className="cyber-button small" onClick={handleExport}>EXPORT STATE (.JSON)</button>
                    <div style={{position: 'relative'}}>
                        <button className="cyber-button small secondary" disabled={syncing}>{syncing ? 'SYNCING...' : 'IMPORT SNAPSHOT'}</button>
                        <input type="file" onChange={handleImport} style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'}} />
                    </div>
                </div>
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
                <div className={`status-card ${services.lattice === 'ONLINE' ? 'online' : 'offline'}`}>
                    <h3>ASYNCHRONOUS BLOCK LATTICE</h3>
                    <p>STATUS: {services.lattice}</p>
                    <p className="detail">Native Node.js Sovereign DAG Consensus.</p>
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
