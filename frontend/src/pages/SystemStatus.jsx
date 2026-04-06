import { useState, useEffect, Suspense, lazy } from 'react';
import { API_URL, LATTICE_URL, SIGNALING_URL, SUPERNODE_URL } from '../api';
import { checkAndUnlock } from '../AchievementService';
import { probeStorageWasmAvailability } from '../lib/storageWasm';
import './SystemStatus.css';

const CyberGrid3D = lazy(() => import('../components/CyberGrid3D').then(m => ({ default: m.CyberGrid3D })));

// We import version from config (defined in vite.config.js)
const VERSION = __APP_VERSION__;

export function SystemStatus() {
    const [services, setServices] = useState({
        gameServer: 'Checking...',
        zkService: 'Checking...',
        supernode: 'Checking...',
        lattice: 'Checking...',
        storageWasm: 'Checking...'
    });
    const [peers, setPeers] = useState({});
    const [networkRoot, setNetworkRoot] = useState('0x...');
    const [merkleRoot, setMerkleRoot] = useState('0x...');
    const [localBlocks, setLocalBlocks] = useState(0);
    const [networkHeight, setNetworkHeight] = useState(0);
    const [buildInfo, setBuildInfo] = useState(null);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        fetch('/build-info.json')
            .then(res => res.json())
            .then(data => setBuildInfo(data))
            .catch(e => console.error('Failed to load build info', e));
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
        const url = prompt('Enter Peer Node URL (e.g. http://localhost:4001):');
        if (!url) return;
        try {
            await fetch(`${LATTICE_URL}/peers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            fetchPeers();
        } catch (e) {
            alert(e.message);
        }
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

            const stored = localStorage.getItem('bobcoin_wallet');
            if (stored) checkAndUnlock('LATTICE_HISTORIAN', JSON.parse(stored), []);
        } catch (e) {
            alert('Export failed: ' + e.message);
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
                alert('State Synchronized! Network Root: ' + res.stateHash.substring(0, 16));
                checkHealth();
            } else {
                alert('Sync failed: ' + res.error);
            }
        } catch (e) {
            alert('Sync Error: ' + e.message);
        }
        setSyncing(false);
    };

    const checkHealth = async () => {
        try {
            await fetch(`${API_URL}/status`);
            setServices(s => ({ ...s, gameServer: `ONLINE (${API_URL === SUPERNODE_URL ? 'GO HTTP' : 'LEGACY HTTP'})` }));
        } catch {
            setServices(s => ({ ...s, gameServer: 'OFFLINE' }));
        }

        try {
            const wsScheme = SIGNALING_URL.startsWith('https://') ? 'wss://' : 'ws://';
            const wsTarget = SIGNALING_URL.replace(/^https?:\/\//, wsScheme);
            const ws = new WebSocket(wsTarget);
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    ws.close();
                    reject(new Error('signaling timeout'));
                }, 3000);
                ws.onopen = () => {
                    clearTimeout(timeout);
                    ws.close();
                    resolve();
                };
                ws.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('signaling unavailable'));
                };
            });
            setServices(s => ({ ...s, zkService: 'ACTIVE (RISC-V)', gameServer: `${s.gameServer} / SIGNALING ONLINE (${SIGNALING_URL === SUPERNODE_URL ? 'GO WS' : 'LEGACY WS'})` }));
        } catch {
            setServices(s => ({ ...s, zkService: 'ACTIVE (RISC-V)', gameServer: `${s.gameServer} / SIGNALING OFFLINE (${SIGNALING_URL === SUPERNODE_URL ? 'GO WS' : 'LEGACY WS'})` }));
        }

        try {
            await fetch(`${SUPERNODE_URL}/stats`);
            setServices(s => ({ ...s, supernode: 'ONLINE' }));
        } catch {
            setServices(s => ({ ...s, supernode: 'OFFLINE' }));
        }

        try {
            const wasm = await probeStorageWasmAvailability();
            setServices(s => ({ ...s, storageWasm: wasm.available ? 'READY' : 'MISSING ARTIFACTS' }));
        } catch {
            setServices(s => ({ ...s, storageWasm: 'OFFLINE' }));
        }

        try {
            const res = await fetch(`${LATTICE_URL}/status`);
            const data = await res.json();
            setServices(s => ({ ...s, lattice: 'ONLINE (Zenith v7.0.0)' }));
            setNetworkRoot(data.stateHash);
            setMerkleRoot(data.merkleRoot || data.stateHash || '0x...');

            const localH = data.accounts || data.blocks || 0;
            setLocalBlocks(localH);

            const pRes = await fetch(`${LATTICE_URL}/peers`);
            const pData = await pRes.json();
            setPeers(pData);

            let maxH = localH;
            Object.values(pData).forEach(p => {
                if (p.blocks > maxH) maxH = p.blocks;
            });
            setNetworkHeight(maxH);
        } catch {
            setServices(s => ({ ...s, lattice: 'OFFLINE' }));
        }

    };

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 10000);
        return () => clearInterval(interval);
    }, []);

    const syncProgress = networkHeight > 0 ? (localBlocks / networkHeight) * 100 : 100;

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    };

    return (
        <div className="system-container">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h1 className="glitch" data-text="SYSTEM STATUS">SYSTEM STATUS</h1>
                <button className="cyber-button small" onClick={toggleFullScreen}>TOGGLE FULLSCREEN</button>
            </div>

            <div className="version-display">
                PROTOCOL VERSION: <span className="neon-text">{VERSION}</span>
            </div>

            <Suspense fallback={<div style={{height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ff', borderBottom: '1px solid #333', background: '#050505'}}>INITIALIZING 3D TOPOLOGY...</div>}>
                <CyberGrid3D />
            </Suspense>

            <div className="network-sync-panel" style={{background: 'rgba(0,255,255,0.05)', border: '1px solid #0ff', padding: '1.5rem', marginBottom: '2rem', textAlign: 'left'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                    <h3 style={{color: '#0ff', margin: 0}}>LATTICE STATE DISCOVERY</h3>
                    <div style={{textAlign: 'right'}}>
                        <div style={{fontSize: '0.6rem', color: '#888'}}>NETWORK STATE HASH</div>
                        <div style={{fontFamily: 'monospace', fontSize: '0.8rem', color: '#ff0055'}}>{networkRoot.substring(0, 32)}...</div>
                    </div>
                </div>

                <div style={{background: '#000', border: '1px solid #0f0', padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                        <div style={{fontSize: '0.6rem', color: '#0f0', letterSpacing: '1px'}}>STATE MERKLE ROOT (MPT)</div>
                        <div style={{fontFamily: 'monospace', fontSize: '1rem', color: '#fff'}}>{merkleRoot.substring(0, 32)}...</div>
                    </div>
                    <div style={{color: '#0f0', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #0f0', padding: '0.2rem 0.5rem'}}>VERIFIED</div>
                </div>

                <div className="sync-status" style={{marginBottom: '1.5rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#888', marginBottom: '0.5rem'}}>
                        <span>CONSENSUS PROGRESS</span>
                        <span>{localBlocks} / {networkHeight} BLOCKS</span>
                    </div>
                    <div style={{height: '8px', background: '#111', border: '1px solid #333', overflow: 'hidden'}}>
                        <div style={{height: '100%', background: '#0f0', width: `${syncProgress}%`, transition: 'width 0.5s', boxShadow: '0 0 10px #0f0'}}></div>
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

                <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                    <button className="cyber-button small" onClick={handleExport}>EXPORT STATE (.JSON)</button>
                    <div style={{position: 'relative'}}>
                        <button className="cyber-button small secondary" disabled={syncing}>{syncing ? 'SYNCING...' : 'IMPORT SNAPSHOT'}</button>
                        <input type="file" onChange={handleImport} style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'}} />
                    </div>
                    <button className="cyber-button small" onClick={handleAddPeer}>REGISTER NEW PEER</button>
                </div>

                <p style={{color: '#888', fontSize: '0.8rem', marginTop: '1.5rem'}}>Export the current network history or bootstrap your local node from a snapshot.</p>
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
                <div className={`status-card ${services.lattice.startsWith('ONLINE') ? 'online' : 'offline'}`}>
                    <h3>ASYNCHRONOUS BLOCK LATTICE</h3>
                    <p>STATUS: {services.lattice}</p>
                    <p className="detail">Go-compatible sovereign DAG consensus service.</p>
                </div>
                <div className={`status-card ${services.storageWasm === 'READY' ? 'online' : 'offline'}`}>
                    <h3>GO STORAGE WASM KERNEL</h3>
                    <p>STATUS: {services.storageWasm}</p>
                    <p className="detail">Browser-side encryption and erasure coding runtime for zero-trust upload preprocessing.</p>
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
