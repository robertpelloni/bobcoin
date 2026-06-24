import { useState, useEffect } from 'react';
import { submitLatticeBlock, getLatticeFrontier, getLatticeChain } from '../api';
import { Block } from '../Block';
import { hashData } from '../cryptoUtils';
import './Swap.css';

export function Swap() {
    const [balance, setBalance] = useState(0);
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState(10);
    const [secret, setSecret] = useState('');
    const [secretHash, setSecretHash] = useState('');
    const [activeSwaps, setActiveSwaps] = useState([]);
    const [keypair, setKeypair] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('bobcoin_wallet');
        if (stored) {
            const kp = JSON.parse(stored);
            setKeypair(kp);
            fetchData(kp.publicKey);
        }
    }, []);

    const fetchData = async (pubkey) => {
        const res = await getLatticeChain(pubkey);
        if (res.chain?.length > 0) {
            setBalance(res.chain[res.chain.length - 1].balance);
        }
        
        // Fetch global swap state would go here in a real P2P system
        // For prototype, we'll just mock current swaps or scan chain
    };

    const handleGenerateSecret = async () => {
        const rand = Math.random().toString(36).substring(2, 15);
        setSecret(rand);
        const hashed = await hashData(rand);
        setSecretHash(hashed);
    };

    const handleLock = async () => {
        if (!recipient || amount <= 0 || !secretHash) return alert("Missing info: Recipient, Amount, and Secret Hash are required.");
        if (amount > balance) return alert("Insufficient liquid balance for swap lock.");
        setLoading(true);
        try {
            const frontier = await getLatticeFrontier(keypair.publicKey);
            
            // Hardening: Verify secret hash format
            if (secretHash.length !== 64) throw new Error("Invalid secret hash (must be SHA-256 hex)");

            const block = new Block({
                type: 'swap_lock',
                account: keypair.publicKey,
                previous: frontier.frontier,
                balance: balance - amount,
                staked_balance: frontier.staked_balance || 0,
                link: 'HTLC_LOCK',
                payload: { secretHash, recipient, amount, expiry: Date.now() + 3600000 },
                height: frontier.frontier ? (frontier.height + 1) : 0
            });

            await block.signBlock(keypair.privateKey);
            const res = await submitLatticeBlock(block);
            if (res.success) {
                alert("Funds Locked in HTLC! Secret: " + secret);
                fetchData(keypair.publicKey);
            } else {
                alert("Lock failed: " + res.error);
            }
        } catch (e) {
            alert(e.message);
        }
        setLoading(false);
    };

    const handleClaim = async () => {
        const claimSecret = prompt("Enter secret to claim swap:");
        const claimHash = prompt("Enter secret hash of the swap:");
        if (!claimSecret || !claimHash) return;

        setLoading(true);
        try {
            const frontier = await getLatticeFrontier(keypair.publicKey);
            const block = new Block({
                type: 'swap_claim',
                account: keypair.publicKey,
                previous: frontier.frontier,
                balance: balance + amount, // Simplified for proto
                staked_balance: frontier.staked_balance || 0,
                link: 'HTLC_CLAIM',
                payload: { secret: claimSecret, secretHash: claimHash },
                height: frontier.frontier ? (frontier.height + 1) : 0
            });

            await block.signBlock(keypair.privateKey);
            const res = await submitLatticeBlock(block);
            if (res.success) {
                alert("Funds Claimed Successfully!");
                fetchData(keypair.publicKey);
            } else {
                alert("Claim failed: " + res.error);
            }
        } catch (e) {
            alert(e.message);
        }
        setLoading(false);
    };

    return (
        <div className="swap-container">
            <h1 className="glitch" data-text="ATOMIC SWAPS">ATOMIC SWAPS</h1>
            <p className="subtitle">TRUSTLESS HASHED TIME-LOCK CONTRACTS (HTLC)</p>

            <div className="swap-grid">
                <div className="swap-panel">
                    <h2>INITIATE SWAP (LOCK)</h2>
                    <div className="field">
                        <label>RECIPIENT PUBKEY</label>
                        <input className="cyber-input" value={recipient} onChange={e => setRecipient(e.target.value)} />
                    </div>
                    <div className="field">
                        <label>AMOUNT (BOB)</label>
                        <input type="number" className="cyber-input" value={amount} onChange={e => setAmount(Number(e.target.value))} />
                    </div>
                    <div className="field">
                        <label>SECRET HASH (SHA-256)</label>
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                            <input className="cyber-input" value={secretHash} readOnly placeholder="Generate a secret..." />
                            <button className="cyber-button small" onClick={handleGenerateSecret}>GEN</button>
                        </div>
                        {secret && <p className="secret-reveal">YOUR SECRET: <span className="neon-text">{secret}</span> (SAVE THIS!)</p>}
                    </div>
                    <button className="cyber-button" onClick={handleLock} disabled={loading}>LOCK FUNDS ON-CHAIN</button>
                </div>

                <div className="swap-panel">
                    <h2>CLAIM SWAP</h2>
                    <p className="desc">If someone has locked funds for you, reveal the secret to claim them.</p>
                    <button className="cyber-button" onClick={handleClaim} disabled={loading}>REVEAL SECRET & CLAIM</button>
                </div>
            </div>

            <div className="swap-footer">
                LATTICE_ARCADE ATOMIC SWAPS ARE PEER-TO-PEER AND MATHEMATICALLY SECURED.
            </div>
        </div>
    );
}
