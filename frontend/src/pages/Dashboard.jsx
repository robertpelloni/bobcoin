import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { RhythmGame } from '../components/RhythmGame';
import { LiveFeed } from '../components/LiveFeed';
import { Leaderboard } from '../components/Leaderboard';
import { Marketplace } from '../components/Marketplace';
import { submitProof, getBankroll, submitFHEOracle, getOracleAudits, SIGNALING_URL } from '../api';
import { checkAndUnlock } from '../AchievementService';
import { generateFHEKeys, encryptInt, decryptInt } from '../fheUtils';
import { useNetwork } from '../NetworkContext';
import { Link } from 'react-router-dom';

// Lazy-loaded submodules for Consolidated Command Center View
const DEX = lazy(() => import('./DEX').then(m => ({ default: m.DEX })));
const Staking = lazy(() => import('./Staking').then(m => ({ default: m.Staking })));
const Swap = lazy(() => import('./Swap').then(m => ({ default: m.Swap })));
const MultiSig = lazy(() => import('./MultiSig').then(m => ({ default: m.MultiSig })));
const StorageMarket = lazy(() => import('./StorageMarket').then(m => ({ default: m.StorageMarket })));
const Supernode = lazy(() => import('./Supernode').then(m => ({ default: m.Supernode })));
const Explorer = lazy(() => import('./Explorer').then(m => ({ default: m.Explorer })));
const SystemStatus = lazy(() => import('./SystemStatus').then(m => ({ default: m.SystemStatus })));
const Trophies = lazy(() => import('./Trophies').then(m => ({ default: m.Trophies })));
const Casino = lazy(() => import('./Casino').then(m => ({ default: m.Casino })));
const Mobile = lazy(() => import('./Mobile').then(m => ({ default: m.Mobile })));
const Manual = lazy(() => import('./Manual').then(m => ({ default: m.Manual })));

export function Dashboard() {
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [mintStatus, setMintStatus] = useState(null);
    const [fheStatus, setFheStatus] = useState(null);
    const [txSignature, setTxSignature] = useState('');
    const [mintResult, setMintResult] = useState(null);
    const [bankroll, setBankroll] = useState(0);
    const [glitch, setGlitch] = useState(false);
    const [oracleStats, setOracleStats] = useState({ variance: 0, mad: 0, entropy: 0, status: 'STANDBY' });
    const [oracleAudits, setOracleAudits] = useState([]);
    const [selectedAudit, setSelectedAudit] = useState(null);

    // Command Center Active Sub-Module Tab (Eliminates fragmentation)
    const [commandTab, setCommandTab] = useState('arcade');

    const replayLog = useRef([]);
    const { heartbeat } = useNetwork();

    const handleLogEvent = (evt) => {
        replayLog.current.push(evt);
        if (replayLog.current.length > 5) {
            const diffs = [];
            for (let i = 1; i < replayLog.current.length; i++) {
                diffs.push(replayLog.current[i].time - replayLog.current[i - 1].time);
            }
            if (diffs.length > 0) {
                const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
                const variance = diffs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / diffs.length;
                const mad = diffs.reduce((a, b) => a + Math.abs(b - mean), 0) / diffs.length;

                // Shannon Entropy estimation of delta buckets (10ms)
                const freqs = {};
                diffs.forEach(d => {
                    const bucket = Math.floor(d / 10.0);
                    freqs[bucket] = (freqs[bucket] || 0) + 1;
                });
                let entropy = 0.0;
                Object.values(freqs).forEach(count => {
                    const p = count / diffs.length;
                    if (p > 0) entropy -= p * Math.log2(p);
                });

                setOracleStats({
                    variance: parseFloat(variance.toFixed(2)),
                    mad: parseFloat(mad.toFixed(2)),
                    entropy: parseFloat(entropy.toFixed(2)),
                    status: (variance >= 10.0 && mad >= 5.0 && entropy >= 1.0) ? 'HUMAN_VERIFIED' : 'CALCULATING'
                });
            }
        }
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [bal, audits] = await Promise.all([
                    getBankroll().catch(() => 0),
                    getOracleAudits().catch(() => [])
                ]);
                setBankroll(bal);
                setOracleAudits(audits);
            } catch (e) {
                console.warn("Failed to fetch bankroll or oracle audits", e);
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 6000);

        // Real-Time WebSocket Streaming for instant AI Oracle audit feed updates
        let ws;
        try {
            const wsTarget = SIGNALING_URL.replace(/^http/, 'ws');
            ws = new WebSocket(wsTarget);
            ws.onopen = () => {
                ws.send(JSON.stringify({ type: 'SUBSCRIBE_ORACLE' }));
            };
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'ORACLE_AUDIT' && data.audit) {
                        setOracleAudits(prev => [data.audit, ...prev.filter(a => a.id !== data.audit.id)].slice(0, 50));
                    }
                } catch (e) {
                    // Ignore non-json frames
                }
            };
        } catch (e) {
            console.warn("Real-time Oracle WebSocket connection failed:", e);
        }

        return () => {
            clearInterval(interval);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, []);

    const handleScoreUpdate = (points) => {
        if (points > 0) {
            setScore(s => s + points + (combo * 10));
            setCombo(c => c + 1);
            setGlitch(true);
            setTimeout(() => setGlitch(false), 100);
        } else {
            setCombo(0);
        }
    };

    const handleMint = async () => {
        if (score < 1000) {
            alert("Score must be over 1000 to mint!");
            return;
        }

        setMintStatus('minting');
        try {
            const result = await submitProof(score, 50, 10, replayLog.current);
            if (result.success) {
                setMintStatus('success');
                setTxSignature(result.tx);
                setMintResult(result);
                setTimeout(async () => setBankroll(await getBankroll()), 2000);
            } else {
                setMintStatus('error');
                alert(result.error || 'Minting failed');
            }
        } catch (e) {
            setMintStatus('error');
            console.error(e);
        }
    };

    const testFHE = async () => {
        setFheStatus('encrypting');
        try {
            const { secretKey, publicKey, context, seal } = await generateFHEKeys();
            const scoreToEncrypt = score > 0 ? score : 5000;
            const cipherText = await encryptInt(scoreToEncrypt, publicKey, context, seal);
            setFheStatus('sending');

            const oracleRes = await submitFHEOracle(cipherText);
            if (oracleRes.success) {
                setFheStatus('decrypting');
                const finalResult = await decryptInt(oracleRes.resultCipher, secretKey, context, seal);
                const expected = (scoreToEncrypt * 2) + 500;
                if (finalResult === expected) {
                    alert(`FHE Success! Server blindly computed: (${scoreToEncrypt} * 2) + 500 = ${finalResult}`);
                    try {
                        const stored = localStorage.getItem('lattice_arcade_wallet');
                        if (stored) {
                            const kp = JSON.parse(stored);
                            checkAndUnlock('FHE_PHANTOM', kp, []);
                        }
                    } catch(e) {}
                } else {
                    alert(`FHE Mismatch: Got ${finalResult} but expected ${expected}`);
                }
            } else {
                alert("Oracle Failed: " + oracleRes.error);
            }
        } catch (e) {
            console.error(e);
            alert("FHE Error: " + e.message);
        }
        setFheStatus(null);
    };

    return (
        <div className="game-container">
            {/* Real-time Network Metrics Telemetry */}
            <div className="network-live-bar" style={{background: '#000', borderBottom: '1px solid #ff0055', padding: '0.5rem 1.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#ff0055', fontFamily: 'monospace', letterSpacing: '1px', width: '100%'}}>
                <span title="Transactions per second on the Sovereign DAG">⚡ TPS: {heartbeat?.tps?.toFixed(2) || '0.00'}</span>
                <span title="Active P2P gossip peer connections">🌐 PEERS: {heartbeat?.peers || '0'}</span>
                <span title="Total confirmed lattice block height">🧱 BLOCKS: {heartbeat?.blocks || '0'}</span>
                <span title="Cumulative Merkle Patricia Trie root hash">🔗 MERKLE: {heartbeat?.merkleRoot?.slice(0, 16) || 'LOADING...'}</span>
                <span title="Ecosystem Demurrage rate applied every 60s">📉 DEMURRAGE: 0.01%/min</span>
            </div>

            {/* Sovereign Command Center Navigation Bar */}
            <div className="command-center-tabs" style={{display: 'flex', gap: '0.5rem', background: '#0a0a0a', padding: '0.75rem 1.5rem', borderBottom: '1px solid #222', flexWrap: 'wrap', alignItems: 'center'}}>
                <span style={{color: '#ff0055', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 'bold', marginRight: '0.5rem'}}>COMMAND CONSOLE:</span>
                <button
                    className={`cyber-button small ${commandTab === 'arcade' ? 'active' : 'secondary'}`}
                    onClick={() => setCommandTab('arcade')}
                    title="Switch to Arcade & Zero-Knowledge Minting Studio"
                >
                    🎮 ARCADE & MINT
                </button>
                <button
                    className={`cyber-button small ${commandTab === 'defi' ? 'active' : 'secondary'}`}
                    onClick={() => setCommandTab('defi')}
                    title="Switch to Sovereign DeFi Suite (Orderbook, Swaps, Staking)"
                >
                    📈 DEFI & EXCHANGE
                </button>
                <button
                    className={`cyber-button small ${commandTab === 'storage' ? 'active' : 'secondary'}`}
                    onClick={() => setCommandTab('storage')}
                    title="Switch to SPoRA Storage & Supernode WebTorrent"
                >
                    💾 STORAGE NETWORK
                </button>
                <button
                    className={`cyber-button small ${commandTab === 'network' ? 'active' : 'secondary'}`}
                    onClick={() => setCommandTab('network')}
                    title="Switch to DAG Explorer & Node Operations"
                >
                    🖥️ NODE & TOPOLOGY
                </button>
                <button
                    className={`cyber-button small ${commandTab === 'casino' ? 'active' : 'secondary'}`}
                    onClick={() => setCommandTab('casino')}
                    title="Switch to Provably Fair Casino & Trophies"
                >
                    🎰 CASINO & REWARDS
                </button>
                <button
                    className={`cyber-button small ${commandTab === 'manual' ? 'active' : 'secondary'}`}
                    onClick={() => setCommandTab('manual')}
                    title="Switch to Sovereign Protocol Manual"
                >
                    📖 MANUAL
                </button>
            </div>

            <div className="ui-layer">
                {/* 1. ARCADE & MINT TAB */}
                {commandTab === 'arcade' && (
                    <>
                        <header className="game-header">
                            <h1 className={glitch ? 'glitch' : ''} data-text="THE MINT">THE MINT</h1>
                            <div className="bankroll-display">
                                <span className="label" title="Reward treasury available for successful Proof-of-Play minting">SERVER BANKROLL:</span>
                                <span className={`value ${bankroll < 0.01 ? 'danger' : ''}`}>{bankroll ? bankroll.toFixed(4) : '0.0000'} SOL</span>
                            </div>
                        </header>

                        <div className="stats-box">
                            <p title="Current rhythm accuracy points">SCORE: <span className="neon-text">{score}</span></p>
                            <p title="Consecutive successful key hits multiplier">COMBO: <span className="neon-text-blue">x{combo}</span></p>
                            <p title="AI Oracle Real-time Anti-Bot Verifier status based on input entropy, variance, and MAD">
                                ORACLE ENTROPY: <span style={{color: oracleStats.status === 'HUMAN_VERIFIED' ? '#0f0' : '#ff0055', fontWeight: 'bold'}}>{oracleStats.status}</span>
                                <span style={{fontSize: '0.65rem', color: '#888', marginLeft: '0.5rem'}}>[VAR: {oracleStats.variance} | MAD: {oracleStats.mad} | H: {oracleStats.entropy || 0.0}]</span>
                            </p>
                        </div>

                        <div className="play-area-wrapper" style={{display: 'flex', justifyContent: 'center'}}>
                            <RhythmGame onScoreUpdate={handleScoreUpdate} onLogEvent={handleLogEvent} />
                        </div>

                        <div className="controls" style={{display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem'}}>
                            <button className="cyber-button" onClick={handleMint} disabled={mintStatus === 'minting'} title="Mint tokens using a Zero-Knowledge Proof (SP1 RISC-V) of your rhythm game score.">
                                {mintStatus === 'minting' ? 'PROVING & MINTING...' : 'MINT TOKENS (ZK PROOF)'}
                            </button>
                            <button className="cyber-button" onClick={testFHE} disabled={fheStatus !== null} style={{borderColor: '#f0f', color: '#f0f'}} title="Test Fully Homomorphic Encryption (FHE) with Microsoft SEAL by computing blindly on the server.">
                                {fheStatus ? `FHE: ${fheStatus.toUpperCase()}...` : 'TEST FHE COMPUTATION'}
                            </button>
                        </div>

                        {mintStatus === 'success' && (
                            <div className="modal success">
                                <h2>MINT SUCCESSFUL</h2>
                                <p>Tokens minted to your sovereign wallet using Succinct SP1 RISC-V verification.</p>
                                {mintResult?.oracle && (
                                    <div style={{background: '#0a0a0a', border: '1px solid #0f0', padding: '0.75rem', margin: '0.75rem 0', textAlign: 'left', fontFamily: 'monospace', fontSize: '0.75rem'}}>
                                        <div style={{color: '#0f0', fontWeight: 'bold', marginBottom: '0.25rem'}}>AI ORACLE AUDIT VERIFIED:</div>
                                        <div>CONFIDENCE: <span style={{color: '#0ff'}}>{(mintResult.oracle.confidenceScore * 100).toFixed(0)}%</span></div>
                                        <div>INPUT VARIANCE: <span style={{color: '#fff'}}>{mintResult.oracle.variance}</span> (threshold: &gt; 10.0)</div>
                                        <div>MEAN ABS DEV (MAD): <span style={{color: '#fff'}}>{mintResult.oracle.mad}</span> (threshold: &gt; 5.0)</div>
                                    </div>
                                )}
                                <a
                                    href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="tx-link"
                                >
                                    VIEW ON EXPLORER &rarr;
                                </a>
                                <button className="cyber-button small" onClick={() => { setMintStatus(null); setMintResult(null); }} style={{marginTop: '1rem'}}>CLOSE</button>
                            </div>
                        )}

                        <div className="arcade-auxiliary-grid" style={{marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', width: '100%'}}>
                            <div className="dashboard-section-card" style={{background: '#050505', border: '1px solid #222', padding: '1rem', borderRadius: '4px'}}>
                                <h3 style={{color: '#0ff', marginTop: 0, borderBottom: '1px solid #222', paddingBottom: '0.5rem'}}>HALL OF FAME</h3>
                                <Leaderboard mintStatus={mintStatus} />
                            </div>
                            <div className="dashboard-section-card" style={{background: '#050505', border: '1px solid #222', padding: '1rem', borderRadius: '4px'}}>
                                <h3 style={{color: '#0ff', marginTop: 0, borderBottom: '1px solid #222', paddingBottom: '0.5rem'}}>SPoRA STORAGE MARKET</h3>
                                <Marketplace />
                            </div>
                            <div className="dashboard-section-card" style={{background: '#050505', border: '1px solid #222', padding: '1rem', borderRadius: '4px'}}>
                                <h3 style={{color: '#0ff', marginTop: 0, borderBottom: '1px solid #222', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <span>AI ORACLE SECURITY FEED</span>
                                    <span style={{fontSize: '0.65rem', color: '#0f0'}}>ACTIVE</span>
                                </h3>
                                <div className="oracle-audit-feed" style={{maxHeight: '220px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.7rem'}}>
                                    {oracleAudits.length === 0 ? (
                                        <div style={{color: '#666', padding: '1rem 0'}}>NO RECENT AUDITS LOGGED</div>
                                    ) : (
                                        oracleAudits.slice(0, 8).map(audit => (
                                            <div
                                                key={audit.id}
                                                onClick={() => setSelectedAudit(audit)}
                                                className="oracle-audit-item"
                                                style={{padding: '0.4rem 0', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s'}}
                                                title="Click to inspect real-time cryptographic audit breakdown"
                                            >
                                                <div>
                                                    <span style={{color: audit.verified ? '#0f0' : '#ff0055', fontWeight: 'bold', marginRight: '6px'}}>
                                                        {audit.verified ? '✓ PASSED' : '⚠️ REJECTED'}
                                                    </span>
                                                    <span style={{color: '#aaa'}}>{audit.address?.slice(0, 10)}...</span>
                                                </div>
                                                <div style={{textAlign: 'right', color: '#555'}}>
                                                    <span style={{color: '#0ff'}}>H: {audit.entropy?.toFixed(1) || '0.0'}</span>
                                                    <span style={{marginLeft: '6px', color: '#888'}}>{(audit.confidenceScore * 100).toFixed(0)}%</span>
                                                    <span style={{marginLeft: '6px', color: '#0ff', fontSize: '0.65rem'}}>🔍</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{marginTop: '1.5rem', width: '100%'}}>
                            <LiveFeed />
                        </div>
                    </>
                )}

                {/* 2. DEFI & EXCHANGE TAB */}
                {commandTab === 'defi' && (
                    <Suspense fallback={<div className="tab-loading" style={{padding: '3rem', color: '#0ff'}}>LOADING DEFI MODULE...</div>}>
                        <div className="consolidated-tab-content" style={{width: '100%'}}>
                            <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #222', paddingBottom: '1rem'}}>
                                <Link to="/dex" className="cyber-button small" title="Open full DEX page">FULLSCREEN ORDERBOOK &rarr;</Link>
                                <Link to="/swap" className="cyber-button small" title="Open HTLC Atomic Swaps">ATOMIC SWAPS &rarr;</Link>
                                <Link to="/staking" className="cyber-button small" title="Open Staking Yield Validator">PoS STAKING &rarr;</Link>
                                <Link to="/multisig" className="cyber-button small" title="Open MultiSig Shared Vault">MULTISIG VAULT &rarr;</Link>
                            </div>
                            <DEX />
                        </div>
                    </Suspense>
                )}

                {/* 3. STORAGE NETWORK TAB */}
                {commandTab === 'storage' && (
                    <Suspense fallback={<div className="tab-loading" style={{padding: '3rem', color: '#0ff'}}>LOADING STORAGE ENGINE...</div>}>
                        <div className="consolidated-tab-content" style={{width: '100%'}}>
                            <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #222', paddingBottom: '1rem'}}>
                                <Link to="/supernode" className="cyber-button small">FULL SUPERNODE &rarr;</Link>
                                <Link to="/market" className="cyber-button small">STORAGE MARKETPLACE &rarr;</Link>
                                <Link to="/vault" className="cyber-button small">ENCRYPTED CLOAK VAULT &rarr;</Link>
                            </div>
                            <Supernode />
                        </div>
                    </Suspense>
                )}

                {/* 4. NODE & NETWORK TAB */}
                {commandTab === 'network' && (
                    <Suspense fallback={<div className="tab-loading" style={{padding: '3rem', color: '#0ff'}}>LOADING NETWORK TOPOLOGY...</div>}>
                        <div className="consolidated-tab-content" style={{width: '100%'}}>
                            <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #222', paddingBottom: '1rem'}}>
                                <Link to="/system" className="cyber-button small">SYSTEM STATUS &rarr;</Link>
                                <Link to="/explorer" className="cyber-button small">DAG EXPLORER &rarr;</Link>
                                <Link to="/mobile" className="cyber-button small">MOBILE MINING SDK &rarr;</Link>
                            </div>
                            <SystemStatus />
                        </div>
                    </Suspense>
                )}

                {/* 5. CASINO & REWARDS TAB */}
                {commandTab === 'casino' && (
                    <Suspense fallback={<div className="tab-loading" style={{padding: '3rem', color: '#0ff'}}>LOADING ARCADE CASINO...</div>}>
                        <div className="consolidated-tab-content" style={{width: '100%'}}>
                            <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #222', paddingBottom: '1rem'}}>
                                <Link to="/casino" className="cyber-button small">FULLSCREEN CASINO &rarr;</Link>
                                <Link to="/trophies" className="cyber-button small">ALL TROPHIES &rarr;</Link>
                            </div>
                            <Casino />
                            <div style={{marginTop: '2rem'}}>
                                <Trophies />
                            </div>
                        </div>
                    </Suspense>
                )}

                {/* 6. PROTOCOL MANUAL TAB */}
                {commandTab === 'manual' && (
                    <Suspense fallback={<div className="tab-loading" style={{padding: '3rem', color: '#0ff'}}>LOADING PROTOCOL MANUAL...</div>}>
                        <div className="consolidated-tab-content" style={{width: '100%'}}>
                            <Manual />
                        </div>
                    </Suspense>
                )}
            </div>

            {/* AI Oracle Telemetry & Audit Inspector Modal */}
            {selectedAudit && (
                <div className="modal-overlay" style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
                    <div className="modal-content" style={{background: '#0a0a0a', border: '1px solid #0ff', padding: '2rem', maxWidth: '550px', width: '90%', borderRadius: '6px', fontFamily: 'monospace'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '0.8rem', marginBottom: '1.2rem'}}>
                            <h3 style={{margin: 0, color: '#0ff', fontSize: '1.1rem'}}>AI ORACLE AUDIT INSPECTOR</h3>
                            <button className="cyber-button small" onClick={() => setSelectedAudit(null)} style={{padding: '0.2rem 0.6rem'}}>✕</button>
                        </div>

                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem', fontSize: '0.85rem'}}>
                            <div style={{background: '#111', padding: '0.8rem', borderRadius: '4px'}}>
                                <div style={{color: '#888', fontSize: '0.75rem'}}>VERIFICATION STATUS</div>
                                <div style={{color: selectedAudit.verified ? '#0f0' : '#ff0055', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '0.2rem'}}>
                                    {selectedAudit.verified ? '✓ PASSED (HUMAN)' : '⚠️ REJECTED (BOT)'}
                                </div>
                            </div>
                            <div style={{background: '#111', padding: '0.8rem', borderRadius: '4px'}}>
                                <div style={{color: '#888', fontSize: '0.75rem'}}>CONFIDENCE RATING</div>
                                <div style={{color: '#0ff', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '0.2rem'}}>
                                    {((selectedAudit.confidenceScore || 0) * 100).toFixed(1)}%
                                </div>
                            </div>
                        </div>

                        <div style={{background: '#111', padding: '1rem', borderRadius: '4px', marginBottom: '1.2rem', fontSize: '0.8rem', lineHeight: '1.6'}}>
                            <div><strong style={{color: '#888'}}>AUDIT ID:</strong> #{selectedAudit.id}</div>
                            <div><strong style={{color: '#888'}}>PROVER WALLET:</strong> <span style={{wordBreak: 'break-all', color: '#fff'}}>{selectedAudit.address}</span></div>
                            <div><strong style={{color: '#888'}}>SCORE / STEPS:</strong> <span style={{color: '#ff0'}}>{selectedAudit.score}</span></div>
                            <div><strong style={{color: '#888'}}>TIMESTAMP:</strong> {selectedAudit.timestamp}</div>
                        </div>

                        <h4 style={{color: '#0ff', fontSize: '0.85rem', marginBottom: '0.5rem'}}>BIOMETRIC & TIMING DELTA METRICS</h4>
                        <div style={{background: '#111', padding: '1rem', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center'}}>
                            <div>
                                <div style={{color: '#666', fontSize: '0.7rem'}}>VARIANCE (min 10.0)</div>
                                <div style={{color: selectedAudit.variance >= 10.0 ? '#0f0' : '#ff0055', fontWeight: 'bold'}}>
                                    {selectedAudit.variance?.toFixed(2) || '0.00'}
                                </div>
                            </div>
                            <div>
                                <div style={{color: '#666', fontSize: '0.7rem'}}>MAD (min 5.0)</div>
                                <div style={{color: selectedAudit.mad >= 5.0 ? '#0f0' : '#ff0055', fontWeight: 'bold'}}>
                                    {selectedAudit.mad?.toFixed(2) || '0.00'}
                                </div>
                            </div>
                            <div>
                                <div style={{color: '#666', fontSize: '0.7rem'}}>ENTROPY (min 1.0)</div>
                                <div style={{color: selectedAudit.entropy >= 1.0 ? '#0f0' : '#ff0055', fontWeight: 'bold'}}>
                                    {selectedAudit.entropy?.toFixed(2) || '0.00'}
                                </div>
                            </div>
                        </div>

                        <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                            <button className="cyber-button small" onClick={() => setSelectedAudit(null)}>DISMISS INSPECTOR</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
