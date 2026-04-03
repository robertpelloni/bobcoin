import { useState, useEffect } from 'react';
import { submitLatticeBlock, getLatticeFrontier, getLatticeChain, LATTICE_URL } from '../api';
import { checkAndUnlock } from '../AchievementService';
import { Block } from '../Block';
import { AccountSelector } from '../components/AccountSelector';
import { SignConfirmModal } from '../components/SignConfirmModal';
import { deriveKeypair } from '../cryptoUtils';
import './DEX.css';

export function DEX() {
    const [balance, setBalance] = useState(0);
    const [swapFrom, setSwapFrom] = useState('BOB');
    const [swapTo, setSwapTo] = useState('sSOL');
    const [amount, setAmount] = useState(10);
    const [pools, setPools] = useState({});
    const [keypair, setKeypair] = useState(null);
    const [pendingBlock, setPendingBlock] = useState(null);
    const [onGuardianConfirm, setOnGuardianConfirm] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const storedKeys = localStorage.getItem('bobcoin_wallet');
        if (storedKeys) {
            const kp = JSON.parse(storedKeys);
            setKeypair(kp);
            fetchData(kp.publicKey);
        }
    }, []);

    const handleAccountChange = async (index) => {
        const stored = localStorage.getItem('bobcoin_wallet');
        if (!stored) return;
        const master = JSON.parse(stored);
        const newKp = await deriveKeypair(master.mnemonic, index);
        setKeypair(newKp);
        fetchData(newKp.publicKey);
        checkAndUnlock('LATTICE_TREASURER', newKp, []);
    };

    const fetchData = async (pubkey) => {
        const resBal = await getLatticeFrontier(pubkey);
        setBalance(resBal.balance || 0);
        
        const resPools = await fetch(`${LATTICE_URL}/pools`).then(r => r.json());
        setPools(resPools);
    };

    const calculateReturn = () => {
        const pool = pools["BOB/sSOL"];
        if (!pool || !amount) return 0;
        const dy = (pool.reserveB * amount) / (pool.reserveA + amount);
        return dy;
    };

    const handleSwap = async () => {
        if (balance < amount) return alert("Insufficient BOB balance");
        setLoading(true);
        try {
            const frontier = await getLatticeFrontier(keypair.publicKey);
            const chain = await getLatticeChain(keypair.publicKey);
            const ret = calculateReturn();
            
            const block = new Block({
                type: 'amm_swap',
                account: keypair.publicKey,
                previous: frontier.frontier,
                balance: balance - amount,
                staked_balance: frontier.staked_balance || 0,
                link: 'AMM_SWAP',
                payload: { 
                    pair: `BOB/sSOL`, 
                    amountIn: amount,
                    expectedOut: ret
                },
                height: chain.chain.length
            });

            await block.signBlock(keypair.privateKey);
            
            // Trigger Guardian Review
            setPendingBlock(block);
            setOnGuardianConfirm(() => async () => {
                const res = await submitLatticeBlock(block);
                if (res.success) {
                    alert(`Swap Executed! You received ~${ret.toFixed(6)} sSOL.`);
                    fetchData(keypair.publicKey);
                    checkAndUnlock('LIQUIDITY_PROVIDER', keypair, []);
                    checkAndUnlock('LATTICE_SENTINEL', keypair, []);
                } else {
                    alert("Swap failed: " + res.error);
                }
                setPendingBlock(null);
            });
        } catch (e) {
            alert(e.message);
        }
        setLoading(false);
    };

    return (
        <div className="dex-container">
            <h1 className="glitch" data-text="SOVEREIGN DEX">SOVEREIGN DEX</h1>
            <p className="subtitle">LATTICE-NATIVE AUTOMATED MARKET MAKER</p>

            <div className="dex-card">
                <AccountSelector currentAccount={keypair} onAccountChange={handleAccountChange} />
                
                <div className="swap-box">
                    <div className="token-input">
                        <label>FROM</label>
                        <div className="input-row">
                            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="cyber-input" />
                            <span className="token-label">BOB</span>
                        </div>
                    </div>

                    <div className="swap-icon">⬇️</div>

                    <div className="token-input">
                        <label>TO (ESTIMATED)</label>
                        <div className="input-row">
                            <input type="text" value={calculateReturn().toFixed(6)} readOnly className="cyber-input" />
                            <span className="token-label">sSOL</span>
                        </div>
                    </div>

                    <div className="price-info">
                        POOL DEPTH: {pools["BOB/sSOL"]?.reserveA.toFixed(0)} BOB / {pools["BOB/sSOL"]?.reserveB.toFixed(2)} sSOL
                    </div>

                    <button className="cyber-button large" onClick={handleSwap} disabled={loading || balance < amount}>
                        {loading ? 'PROCESSING...' : 'SWAP ASSETS'}
                    </button>
                </div>
            </div>

            <div className="dex-footer">
                ALL SWAPS ARE EXECUTED VIA ON-CHAIN HASHED TIME-LOCK CONTRACTS.
            </div>

            <SignConfirmModal 
                block={pendingBlock} 
                onConfirm={onGuardianConfirm} 
                onCancel={() => setPendingBlock(null)} 
            />
        </div>
    );
}
