import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { RhythmGame } from '../components/RhythmGame';
import { submitProof, getBankroll } from '../api';
import { Leaderboard } from '../components/Leaderboard';
import { Marketplace } from '../components/Marketplace';

export function Dashboard() {
    const wallet = useWallet();
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [mintStatus, setMintStatus] = useState(null);
    const [txSignature, setTxSignature] = useState('');
    const [bankroll, setBankroll] = useState(0);
    const [glitch, setGlitch] = useState(false);

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
            const result = await submitProof(score, 50, 10, wallet);
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

    return (
        <div className="game-container">
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
                    <RhythmGame onScoreUpdate={handleScoreUpdate} />
                </div>

                <div className="controls">
                    <button className="cyber-button" onClick={handleMint} disabled={mintStatus === 'minting'}>
                        {mintStatus === 'minting' ? 'MINTING...' : 'MINT TOKENS'}
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
            </div>
        </div>
    );
}
