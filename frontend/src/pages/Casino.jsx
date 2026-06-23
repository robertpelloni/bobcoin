import { useState, useEffect } from 'react';
import { submitLatticeBlock, getLatticeFrontier, getLatticeChain } from '../api';
import { checkAndUnlock } from '../AchievementService';
import { Block } from '../Block';
import './Casino.css';

const CASINO_PUBKEY = '6FHYYQHZVfuaBHMMkvtcgJFacE9pJhzE7k8fDcJgiYVU'; // Placeholder Casino Supernode Key

export function Casino() {
    const [balance, setBalance] = useState(0);
    const [betAmount, setBetAmount] = useState(5);
    const [status, setStatus] = useState('READY');
    const [history, setHistory] = useState([]);
    const [keypair, setKeypair] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem('lattice_arcade_wallet');
        if (stored) {
            const kp = JSON.parse(stored);
            setKeypair(kp);
            fetchBalance(kp.publicKey);
        }
    }, []);

    const fetchBalance = async (pubkey) => {
        try {
            const res = await getLatticeChain(pubkey);
            const chain = res.chain || [];
            if (chain.length > 0) {
                setBalance(chain[chain.length - 1].balance);
            }
            
            // Filter casino blocks for history
            const casinoHistory = chain
                .filter(b => b.link === CASINO_PUBKEY || b.account === CASINO_PUBKEY)
                .slice(-5)
                .reverse();
            setHistory(casinoHistory);
        } catch(e) {}
    };

    const handleBet = async () => {
        if (balance < betAmount) return alert("Insufficient Balance");
        
        setStatus('BETTING');
        try {
            const frontierData = await getLatticeFrontier(keypair.publicKey);
            const block = new Block({
                type: 'send',
                account: keypair.publicKey,
                previous: frontierData.frontier,
                balance: balance - betAmount,
                staked_balance: frontierData.staked_balance || 0,
                height: frontierData.frontier ? (frontierData.height + 1) : 0,
                link: CASINO_PUBKEY,
                payload: { action: 'casino_bet', roll: Math.random() }
            });

            await block.signBlock(keypair.privateKey);
            const res = await submitLatticeBlock(block);

            if (res.success) {
                setStatus('WAITING_FOR_ROLL');
                // Poll for response block
                setTimeout(() => checkResult(), 5000);
            } else {
                setStatus('ERROR');
                alert("Bet failed: " + res.error);
            }
        } catch (e) {
            setStatus('ERROR');
            alert(e.message);
        }
    };

    const checkResult = async () => {
        await fetchBalance(keypair.publicKey);
        
        // If balance increased, we won!
        const res = await getLatticeChain(keypair.publicKey);
        const latest = res.chain[res.chain.length-1];
        
        if (latest.type === 'receive' && latest.balance > balance) {
            setStatus('WON');
            checkAndUnlock('LATTICE_SHARK', keypair, []);
        } else {
            setStatus('LOST');
        }
    };

    return (
        <div className="casino-container">
            <h1 className="glitch" data-text="LATTICE CASINO">LATTICE CASINO</h1>
            <p className="subtitle">AUTONOMOUS BLOCK LATTICE AMM — PROVABLY FAIR</p>

            <div className="casino-ui">
                <div className="balance-box">
                    <span className="label">WALLET BALANCE</span>
                    <span className="value neon-text">{balance.toFixed(4)} BOB</span>
                </div>

                <div className="bet-controls">
                    <input 
                        type="number" 
                        className="cyber-input" 
                        value={betAmount} 
                        onChange={(e) => setBetAmount(Number(e.target.value))}
                        disabled={status === 'BETTING' || status === 'WAITING_FOR_ROLL'}
                    />
                    <button 
                        className="cyber-button" 
                        onClick={handleBet}
                        disabled={status === 'BETTING' || status === 'WAITING_FOR_ROLL' || balance < betAmount}
                    >
                        PLACE BET (50/50)
                    </button>
                </div>

                <div className="status-display">
                    {status === 'READY' && <span className="ready">READY TO ROLL</span>}
                    {status === 'BETTING' && <span className="processing">BROADCASTING BET...</span>}
                    {status === 'WAITING_FOR_ROLL' && <span className="processing">WAITING FOR CASINO ROLL...</span>}
                    {status === 'WON' && <span className="won">🏆 JACKPOT! WINNER!</span>}
                    {status === 'LOST' && <span className="lost">💀 BUSTED! TRY AGAIN.</span>}
                </div>
            </div>

            <div className="casino-history">
                <h3>RECENT LATTICE BETS</h3>
                {history.map((b, i) => (
                    <div key={i} className="history-row">
                        <span>{b.type.toUpperCase()}</span>
                        <span className="hash">{b.hash.substring(0, 16)}...</span>
                        <span className={b.balance > balance ? 'won' : 'lost'}>{b.balance.toFixed(2)} BOB</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
