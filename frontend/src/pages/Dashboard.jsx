import { useState, useEffect, useRef } from 'react';
import { RhythmGame } from '../components/RhythmGame';
import { LiveFeed } from '../components/LiveFeed';
import { SignConfirmModal } from '../components/SignConfirmModal';
import { submitProof, getBankroll, submitFHEOracle } from '../api';
import { checkAndUnlock } from '../AchievementService';
import { Leaderboard } from '../components/Leaderboard';
import { Marketplace } from '../components/Marketplace';
import { generateFHEKeys, encryptInt, decryptInt } from '../fheUtils';
import { useNetwork } from '../NetworkContext';

export function Dashboard() {
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [mintStatus, setMintStatus] = useState(null);
    const [fheStatus, setFheStatus] = useState(null);
    const [txSignature, setTxSignature] = useState('');
    const [pendingBlock, setPendingBlock] = useState(null);
    const [bankroll, setBankroll] = useState(0);
    const [glitch, setGlitch] = useState(false);
    const replayLog = useRef([]);
    const { heartbeat } = useNetwork();

    const handleLogEvent = (evt) => {
        replayLog.current.push(evt);
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
            // 1. Setup SEAL and Keys
            const { secretKey, publicKey, context, seal } = await generateFHEKeys();
            
            // 2. Encrypt current score
            const scoreToEncrypt = score > 0 ? score : 5000;
            const cipherText = await encryptInt(scoreToEncrypt, publicKey, context, seal);
            setFheStatus('sending');

            // 3. Send to Game Server Oracle
            const oracleRes = await submitFHEOracle(cipherText);
            if (oracleRes.success) {
                setFheStatus('decrypting');
                // 4. Decrypt resulting ciphertext
                const finalResult = await decryptInt(oracleRes.resultCipher, secretKey, context, seal);
                
                // The server should have applied: (score * 2) + 500
                const expected = (scoreToEncrypt * 2) + 500;
                if (finalResult === expected) {
                    alert(`FHE Success! Server blindly computed: (${scoreToEncrypt} * 2) + 500 = ${finalResult}`);
                    
                    // Unlock Achievement
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
            <div className="network-live-bar" style={{background: '#000', borderBottom: '1px solid #ff0055', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#ff0055', fontFamily: 'monospace', letterSpacing: '1px', width: '100%'}}>
                <span>TPS: {heartbeat?.tps?.toFixed(2) || '0.00'}</span>
                <span>PEERS: {heartbeat?.peers || '0'}</span>
                <span>BLOCKS: {heartbeat?.blocks || '0'}</span>
                <span>MERKLE: {heartbeat?.merkleRoot?.slice(0, 16) || 'LOADING...'}</span>
            </div>
            <div className="ui-layer">
                <header className="game-header">
                    <h1 className={glitch ? 'glitch' : ''} data-text="THE MINT">THE MINT</h1>
                    <div className="bankroll-display">
                        <span className="label">SERVER BANKROLL:</span>
                        <span className={`value ${bankroll < 0.01 ? 'danger' : ''}`}>{bankroll ? bankroll.toFixed(4) : '0.0000'} SOL</span>
                    </div>
                </header>

                <div className="stats-box">
                    <p>SCORE: <span className="neon-text">{score}</span></p>
                    <p>COMBO: <span className="neon-text-blue">x{combo}</span></p>
                </div>

                <div className="play-area-wrapper" style={{display: 'flex', justifyContent: 'center'}}>
                    <RhythmGame onScoreUpdate={handleScoreUpdate} onLogEvent={handleLogEvent} />
                </div>

                <div className="controls" style={{display: 'flex', gap: '1rem'}}>
                    <button className="cyber-button" onClick={handleMint} disabled={mintStatus === 'minting'} title="Mint tokens using a Zero-Knowledge Proof of your rhythm game score.">
                        {mintStatus === 'minting' ? 'MINTING...' : 'MINT TOKENS'}
                    </button>
                    <button className="cyber-button" onClick={testFHE} disabled={fheStatus !== null} style={{borderColor: '#f0f', color: '#f0f'}} title="Test Fully Homomorphic Encryption (FHE) by computing on encrypted data blindly on the server.">
                        {fheStatus ? `FHE: ${fheStatus.toUpperCase()}...` : 'TEST FHE COMPUTATION'}
                    </button>
                </div>

                {mintStatus === 'success' && (
                    <div className="modal success">
                        <h2>MINT SUCCESSFUL</h2>
                        <p>Tokens minted to wallet.</p>
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

                <Leaderboard mintStatus={mintStatus} />
                <Marketplace />
                <LiveFeed />
            </div>
        </div>
    );
}
