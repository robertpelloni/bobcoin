import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { RhythmGame } from '../components/RhythmGame';
import { LiveFeed } from '../components/LiveFeed';
import { Leaderboard } from '../components/Leaderboard';
import { Marketplace } from '../components/Marketplace';
import { submitProof, getBankroll, submitFHEOracle } from '../api';
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
    const [bankroll, setBankroll] = useState(0);
    const [glitch, setGlitch] = useState(false);
    const [oracleStats, setOracleStats] = useState({ variance: 0, mad: 0, status: 'STANDBY' });

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
                setOracleStats({
                    variance: parseFloat(variance.toFixed(2)),
                    mad: parseFloat(mad.toFixed(2)),
                    status: (variance >= 10.0 && mad >= 5.0) ? 'HUMAN_VERIFIED' : 'CALCULATING'
                });
            }
        }
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const bal = await getBankroll();
                setBankroll(bal);
            } catch (e) {
                console.warn("Failed to fetch bankroll", e);
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 10000);
        return () => clearInterval(interval);
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
                            <p title="AI Oracle Real-time Anti-Bot Verifier status based on input entropy variance and MAD">
                                ORACLE ENTROPY: <span style={{color: oracleStats.status === 'HUMAN_VERIFIED' ? '#0f0' : '#ff0055', fontWeight: 'bold'}}>{oracleStats.status}</span>
                                <span style={{fontSize: '0.65rem', color: '#888', marginLeft: '0.5rem'}}>[VAR: {oracleStats.variance} | MAD: {oracleStats.mad}]</span>
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
                                <a
                                    href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="tx-link"
                                >
                                    VIEW ON EXPLORER &rarr;
                                </a>
                                <button className="cyber-button small" onClick={() => setMintStatus(null)} style={{marginTop: '1rem'}}>CLOSE</button>
                            </div>
                        )}

                        <div className="arcade-auxiliary-grid" style={{marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', width: '100%'}}>
                            <div className="dashboard-section-card" style={{background: '#050505', border: '1px solid #222', padding: '1rem', borderRadius: '4px'}}>
                                <h3 style={{color: '#0ff', marginTop: 0, borderBottom: '1px solid #222', paddingBottom: '0.5rem'}}>HALL OF FAME</h3>
                                <Leaderboard mintStatus={mintStatus} />
                            </div>
                            <div className="dashboard-section-card" style={{background: '#050505', border: '1px solid #222', padding: '1rem', borderRadius: '4px'}}>
                                <h3 style={{color: '#0ff', marginTop: 0, borderBottom: '1px solid #222', paddingBottom: '0.5rem'}}>SPoRA STORAGE MARKET</h3>
                                <Marketplace />
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
        </div>
    );
}
