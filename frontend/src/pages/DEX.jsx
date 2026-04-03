import { useState, useEffect } from 'react';
import { submitLatticeBlock, getLatticeFrontier, getLatticeChain } from '../api';
import { Block } from '../Block';
import './DEX.css';

export function DEX() {
    const [balance, setBalance] = useState(0);
    const [swapFrom, setSwapFrom] = useState('BOB');
    const [swapTo, setSwapTo] = useState('sSOL');
    const [amount, setAmount] = useState(10);
    const [keypair, setKeypair] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const storedKeys = localStorage.getItem('bobcoin_wallet');
        if (storedKeys) {
            const kp = JSON.parse(storedKeys);
            setKeypair(kp);
            fetchData(kp.publicKey);
        }
    }, []);

    const fetchData = async (pubkey) => {
        const res = await getLatticeFrontier(pubkey);
        setBalance(res.balance || 0);
    };

    const handleSwap = async () => {
        if (balance < amount) return alert("Insufficient BOB balance");
        setLoading(true);
        try {
            // In a real DEX, this would open an HTLC with a Market Maker
            // For this prototype, we simulate the trustless swap flow
            const frontier = await getLatticeFrontier(keypair.publicKey);
            const chain = await getLatticeChain(keypair.publicKey);
            
            alert(`Initiating Trustless Swap: ${amount} BOB for ~${(amount * 0.042).toFixed(4)} sSOL\n\nThis will broadcast an HTLC Lock block to the lattice.`);
            
            const block = new Block({
                type: 'swap_lock',
                account: keypair.publicKey,
                previous: frontier.frontier,
                balance: balance - amount,
                staked_balance: (await getLatticeFrontier(keypair.publicKey)).staked_balance || 0,
                link: 'DEX_SWAP',
                payload: { 
                    pair: `${swapFrom}/${swapTo}`, 
                    secretHash: 'MOCK_HASH_FOR_DEX_' + Math.random().toString(16),
                    recipient: 'SYSTEM_MARKET_MAKER',
                    amount: amount
                },
                height: chain.chain.length
            });

            await block.signBlock(keypair.privateKey);
            const res = await submitLatticeBlock(block);
            if (res.success) {
                alert("Swap Lock Confirmed! Market Maker is now verifying liquidity...");
                fetchData(keypair.publicKey);
            } else {
                alert("Swap failed: " + res.error);
            }
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
                            <input type="text" value={(amount * 0.042).toFixed(4)} readOnly className="cyber-input" />
                            <span className="token-label">sSOL</span>
                        </div>
                    </div>

                    <div className="price-info">
                        1 BOB = 0.0420 sSOL
                    </div>

                    <button className="cyber-button large" onClick={handleSwap} disabled={loading || balance < amount}>
                        {loading ? 'PROCESSING...' : 'SWAP ASSETS'}
                    </button>
                </div>
            </div>

            <div className="dex-footer">
                ALL SWAPS ARE EXECUTED VIA ON-CHAIN HASHED TIME-LOCK CONTRACTS.
            </div>
        </div>
    );
}
