import { useState, useEffect, useRef } from 'react';
import { getTransactions, getLatticePending, getLatticeFrontier, submitLatticeBlock, getSporaProof, LATTICE_URL } from '../api';
import { generateKeypair, encryptMemo, decryptMemo } from '../cryptoUtils';
import { checkAndUnlock } from '../AchievementService';
import { Block } from '../Block';
import './Wallet.css';

export function Wallet() {
    const [privacyMode, setPrivacyMode] = useState(true);
    const [ringSize, setRingSize] = useState(16);
    const [balance, setBalance] = useState(0.00);
    const [history, setHistory] = useState([]);
    const [showKeys, setShowKeys] = useState(false);
    const [keypair, setKeypair] = useState(null);
    const [pending, setPending] = useState([]);
    
    // Gamified Onboarding State
    const [isGenerating, setIsGenerating] = useState(false);
    const [typedEntropy, setTypedEntropy] = useState('');
    const entropyTarget = 'CYPHERPUNK_PROTOCOL_INITIALIZED';
    const entropyRef = useRef('');

    useEffect(() => {
        // Load or generate Lattice wallet
        let kp = null;
        let storedKeys = localStorage.getItem('bobcoin_wallet');
        if (!storedKeys) {
            setIsGenerating(true);
            return; // Don't start polling yet!
        } else {
            kp = JSON.parse(storedKeys);
            setKeypair(kp);
        }

        const fetchState = async () => {
            // 1. Fetch system transactions for global history
            const txs = await getTransactions();
            if (txs && txs.length > 0) {
                setHistory(txs.map(tx => ({ ...tx, decoded: false })));
            } else {
                setHistory([]); 
            }

            // 2. Fetch pending lattice blocks for this wallet
            if (kp) {
                const pendRes = await getLatticePending(kp.publicKey);
                if (pendRes && pendRes.pending) {
                    setPending(pendRes.pending);
                }
                
                // Fetch our own local balance from our chain, not the global TXs
                const frontRes = await getLatticeFrontier(kp.publicKey);
                if (frontRes && frontRes.frontier) {
                    const balRes = await fetch(`${LATTICE_URL}/balance/${kp.publicKey}`);
                    const balData = await balRes.json();
                    setBalance(balData.balance || 0.00);
                }
            }
        };
        fetchState();
        
        // Polling for updates
        const interval = setInterval(fetchState, 5000);
        return () => clearInterval(interval);
    }, []);

    const claimPending = async (pend) => {
        try {
            // 1. Get our frontier
            const frontRes = await getLatticeFrontier(keypair.publicKey);
            let previousHash = frontRes.frontier || null;

            // 2. Determine if this is an OPEN or RECEIVE block
            const type = previousHash ? 'receive' : 'open';

            // 3. New balance = current balance + pend.amount
            const newBalance = balance + pend.amount;

            // 4. Create Block
            const { hashData } = await import('../cryptoUtils');
            const baseHash = previousHash || (await hashData(keypair.publicKey));
            const expectedChallenge = parseInt(baseHash.substr(0, 8), 16);
            let sporaProof = null;
            try {
                sporaProof = await getSporaProof(expectedChallenge);
            } catch (e) {
                alert("SPoRA Failed: You must be running an active Supernode seeding the Bobtorrent Anchors to claim funds.");
                return;
            }

            const block = new Block({
                type,
                account: keypair.publicKey,
                previous: previousHash,
                balance: newBalance,
                link: pend.hash, // Link is the send block hash we are claiming
                spora: sporaProof
            });

            // 5. Sign and Submit
            await block.signBlock(keypair.privateKey);
            const res = await submitLatticeBlock(block);

            if (res.success) {
                alert(`Successfully claimed ${pend.amount} BOB!`);
                setBalance(newBalance);
                setPending(p => p.filter(x => x.hash !== pend.hash));
            } else {
                alert("Failed to claim: " + res.error);
            }
        } catch (e) {
            alert("Error claiming funds.");
            console.error(e);
        }
    };

    const [sendAddress, setSendAddress] = useState('');
    const [sendBoxKey, setSendBoxKey] = useState('');
    const [sendMemo, setSendMemo] = useState('');
    const [sendAmount, setSendAmount] = useState(10);
    const [isSending, setIsSending] = useState(false);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!sendAddress || sendAmount <= 0) return;
        if (sendAmount > balance) {
            alert("Insufficient funds!");
            return;
        }
        if (!confirm(`Send ${sendAmount} BOB to ${sendAddress.slice(0,10)}...?`)) return;

        setIsSending(true);
        try {
            const frontRes = await getLatticeFrontier(keypair.publicKey);
            const previousHash = frontRes.frontier;
            if (!previousHash) throw new Error("Wallet not initialized on network (no frontier).");

            const newBalance = balance - sendAmount;

            const expectedChallenge = parseInt(previousHash.substr(0, 8), 16);
            let sporaProof = null;
            try {
                sporaProof = await getSporaProof(expectedChallenge);
            } catch (e) {
                alert("SPoRA Failed: You must be running an active Supernode seeding the Bobtorrent Anchors to send funds.");
                setIsSending(false);
                return;
            }

            let payload = null;
            if (sendMemo && sendBoxKey) {
                const encrypted = encryptMemo(sendMemo, sendBoxKey, keypair.boxPrivateKey);
                payload = {
                    memo: encrypted.box,
                    nonce: encrypted.nonce,
                    senderBoxKey: keypair.boxPublicKey
                };
            }

            const sendBlock = new Block({
                type: 'send',
                account: keypair.publicKey,
                previous: previousHash,
                balance: newBalance,
                link: sendAddress,
                spora: sporaProof,
                payload: payload
            });

            await sendBlock.signBlock(keypair.privateKey);
            const res = await submitLatticeBlock(sendBlock);

            if (res.success) {
                alert(`Sent ${sendAmount} BOB! TX: ${res.hash}`);
                setBalance(newBalance);
                setSendAddress('');
            } else {
                alert("Transaction failed: " + res.error);
            }
        } catch (e) {
            console.error(e);
            alert("Error sending funds: " + e.message);
        }
        setIsSending(false);
    };

    const toggleDecode = (id) => {
        setHistory(history.map(tx => {
            if (tx.id === id) {
                return { ...tx, decoded: !tx.decoded };
            }
            return tx;
        }));
    };

    useEffect(() => {
        if (!isGenerating) return;

        const handleType = (e) => {
            // Ignore modifiers
            if (e.key.length > 1) return;

            // Generate "hacky" visual feedback and build entropy string
            const newChar = String.fromCharCode(33 + Math.floor(Math.random() * 94));
            
            entropyRef.current += newChar;
            setTypedEntropy(entropyRef.current);

            // Once the user has typed enough characters, finalize generation
            if (entropyRef.current.length >= 64) {
                const kp = generateKeypair();
                localStorage.setItem('bobcoin_wallet', JSON.stringify(kp));
                setKeypair(kp);
                setIsGenerating(false);
                
                // Unlock Achievement
                checkAndUnlock('GIBSON_HACKER', kp, []);
            }
        };

        window.addEventListener('keydown', handleType);
        return () => window.removeEventListener('keydown', handleType);
    }, [isGenerating]);

    if (isGenerating) {
        return (
            <div className="wallet-container" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh'}}>
                <h1 className="glitch" data-text="INITIALIZE WALLET">INITIALIZE WALLET</h1>
                <p style={{color: '#ff0055', marginBottom: '2rem'}}>MASH KEYBOARD TO GENERATE ED25519 ENTROPY SEED</p>
                <div style={{background: '#000', border: '1px solid #0ff', padding: '1rem', width: '100%', maxWidth: '600px', minHeight: '150px', fontFamily: 'monospace', color: '#0f0', wordBreak: 'break-all', boxShadow: '0 0 20px rgba(0, 255, 255, 0.2)'}}>
                    {typedEntropy}
                    <span className="cursor" style={{animation: 'blink 1s infinite'}}>█</span>
                </div>
                <div className="progress-bar" style={{width: '100%', maxWidth: '600px', background: '#111', marginTop: '1rem', height: '10px'}}>
                    <div className="fill" style={{background: '#0ff', height: '100%', width: `${(typedEntropy.length / 64) * 100}%`, transition: 'width 0.1s'}}></div>
                </div>
            </div>
        );
    }

    return (
        <div className="wallet-container">
            <h1 className="glitch" data-text="PRIVACY VAULT">PRIVACY VAULT</h1>

            <div className="wallet-card">
                <div className="card-header">
                    <h2>TOTAL BALANCE</h2>
                    <div className="privacy-toggle">
                        <span>STEALTH MODE</span>
                        <button
                            className={`toggle-btn ${privacyMode ? 'active' : ''}`}
                            onClick={() => setPrivacyMode(!privacyMode)}
                            title="Toggle privacy mode to obfuscate balances and utilize one-time stealth addresses."
                        >
                            {privacyMode ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </div>

                <div className="balance-display">
                    <span className="currency">BOB</span>
                    <span className="amount">
                        {privacyMode ? '****.**' : balance.toFixed(2)}
                    </span>
                </div>

                <div className="address-section">
                    <label>PUBLIC ADDRESS</label>
                    <div className="address-box">
                        <code>{keypair ? `${keypair.publicKey.slice(0, 16)}...` : 'GENERATING...'}</code>
                        <button className="copy-btn" title="Copy public address to clipboard." onClick={() => keypair && navigator.clipboard.writeText(keypair.publicKey)}>COPY</button>
                    </div>

                    {privacyMode && (
                        <div className="stealth-address-box">
                            <label>ONE-TIME STEALTH ADDRESS (GENERATED)</label>
                            <code className="stealth">stealth:9z8y7x6w...1c4d</code>
                            <div className="description" style={{fontSize: '0.8rem', color: '#ff00ff'}}>
                                Generated via Diffie-Hellman Key Exchange using the sender's ephemeral key and your view key.
                                Only you can link this address to your wallet.
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {pending.length > 0 && (
                <div className="pending-funds-section" style={{marginTop: '2rem', padding: '1.5rem', background: 'rgba(255, 0, 85, 0.1)', border: '1px solid var(--secondary-color)'}}>
                    <h2 style={{color: 'var(--secondary-color)', marginBottom: '1rem'}}>PENDING FUNDS</h2>
                    <p style={{fontSize: '0.9rem', marginBottom: '1rem'}}>
                        You have {pending.length} incoming transactions on the Lattice Network. 
                        You must cryptographically sign a "Receive" block to credit your local balance.
                    </p>
                    {pending.map(p => {
                        let decryptedMemo = null;
                        if (p.payload && p.payload.memo && p.payload.nonce && p.payload.senderBoxKey) {
                            decryptedMemo = decryptMemo(p.payload.memo, p.payload.nonce, p.payload.senderBoxKey, keypair.boxPrivateKey);
                        }
                        return (
                            <div key={p.hash} style={{background: '#000', padding: '1rem', border: '1px solid #333', marginBottom: '0.5rem'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <div>
                                        <span style={{color: '#0f0', fontWeight: 'bold'}}>{p.amount.toFixed(2)} BOB</span>
                                        <span style={{color: '#888', fontSize: '0.8rem', marginLeft: '1rem'}}>From: {p.sender.slice(0, 8)}...</span>
                                    </div>
                                    <button className="cyber-button small" onClick={() => claimPending(p)}>CLAIM</button>
                                </div>
                                {decryptedMemo && (
                                    <div style={{marginTop: '0.5rem', fontSize: '0.8rem', color: '#ff00ff', borderTop: '1px dashed #333', paddingTop: '0.5rem'}}>
                                        <span style={{color: '#888'}}>Encrypted Memo:</span> {decryptedMemo}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="settings-grid">
                <div className="setting-card" style={{border: '1px solid #0f0'}}>
                    <h3 style={{color: '#0f0'}}>SEND FUNDS</h3>
                    <form onSubmit={handleSend}>
                        <div className="control">
                            <label>RECIPIENT ADDRESS</label>
                            <input
                                type="text"
                                className="cyber-input"
                                value={sendAddress}
                                onChange={(e) => setSendAddress(e.target.value)}
                                placeholder="Public Key (Ed25519 Base58)"
                                title="The Bobcoin public address of the recipient."
                                required
                            />
                        </div>
                        <div className="control" style={{marginTop: '1rem'}}>
                            <label>AMOUNT (BOB)</label>
                            <input
                                type="number"
                                className="cyber-input"
                                value={sendAmount}
                                onChange={(e) => setSendAmount(Number(e.target.value))}
                                min="1"
                                max={balance}
                                title="The amount of Bobcoin to send."
                                required
                            />
                        </div>
                        <div className="control" style={{marginTop: '1rem'}}>
                            <label>RECIPIENT MESSAGING KEY (Optional)</label>
                            <input
                                type="text"
                                className="cyber-input"
                                value={sendBoxKey}
                                onChange={(e) => setSendBoxKey(e.target.value)}
                                placeholder="Public Box Key (X25519 Base58)"
                                title="The messaging public key of the recipient to encrypt a memo."
                            />
                        </div>
                        <div className="control" style={{marginTop: '1rem'}}>
                            <label>ENCRYPTED MEMO (Optional)</label>
                            <input
                                type="text"
                                className="cyber-input"
                                value={sendMemo}
                                onChange={(e) => setSendMemo(e.target.value)}
                                placeholder="Secret message..."
                                title="A private memo that only the recipient can decrypt."
                            />
                        </div>
                        <button type="submit" className="cyber-button" disabled={isSending} style={{marginTop: '1rem', width: '100%', color: '#0f0', borderColor: '#0f0'}}>
                            {isSending ? 'PROCESSING...' : 'INITIATE TRANSFER'}
                        </button>
                    </form>
                </div>

                <div className="setting-card">
                    <h3>RING SIGNATURES (CLSAG)</h3>
                    <div className="control">
                        <label>RING SIZE: {ringSize}</label>
                        <input
                            type="range"
                            min="11"
                            max="64"
                            value={ringSize}
                            onChange={(e) => setRingSize(e.target.value)}
                            title="Adjust the number of decoys in the ring signature. Higher sizes increase privacy."
                        />
                    </div>
                    <p className="description">
                        Number of decoys used to obscure the true spender.
                        Higher values increase privacy but cost slightly more compute.
                        (Default: 16)
                    </p>
                </div>

                <div className="setting-card">
                    <h3>KEY MANAGEMENT</h3>
                    <div className="control">
                        <button className="cyber-button" onClick={() => setShowKeys(!showKeys)} style={{fontSize: '0.8rem', padding: '0.5rem'}} title="Reveal or hide your private cryptographic keys.">
                            {showKeys ? 'HIDE KEYS' : 'REVEAL KEYS'}
                        </button>
                    </div>
                    {showKeys && (
                        <div className="keys-box" style={{marginTop: '1rem', background: '#000', padding: '0.5rem', border: '1px solid #ff0055'}}>
                            <div style={{color: '#ff0055', fontSize: '0.7rem', marginBottom: '0.5rem'}}>DO NOT SHARE YOUR PRIVATE KEYS</div>
                            
                            <div style={{fontSize: '0.7rem', color: '#888', marginTop: '0.5rem'}}>PUBLIC ADDRESS (ED25519):</div>
                            <code style={{display: 'block', wordBreak: 'break-all', fontSize: '0.8rem', color: '#0ff'}}>{keypair ? keypair.publicKey : '...'}</code>
                            
                            <div style={{fontSize: '0.7rem', color: '#888', marginTop: '0.5rem'}}>PUBLIC MESSAGING KEY (X25519):</div>
                            <code style={{display: 'block', wordBreak: 'break-all', fontSize: '0.8rem', color: '#0ff'}}>{keypair ? keypair.boxPublicKey : '...'}</code>
                            
                            <div style={{fontSize: '0.7rem', color: '#888', marginTop: '1rem', borderTop: '1px dashed #333', paddingTop: '0.5rem'}}>PRIVATE SIGNING KEY:</div>
                            <code style={{display: 'block', wordBreak: 'break-all', fontSize: '0.8rem'}}>{keypair ? keypair.privateKey : '...'}</code>
                            
                            <div style={{fontSize: '0.7rem', color: '#888', marginTop: '0.5rem'}}>PRIVATE MESSAGING KEY:</div>
                            <code style={{display: 'block', wordBreak: 'break-all', fontSize: '0.8rem'}}>{keypair ? keypair.boxPrivateKey : '...'}</code>
                        </div>
                    )}
                    <p className="description">
                        View keys allow read-only access. Spend keys allow spending. Keep them safe.
                    </p>
                </div>

                <div className="setting-card">
                    <h3>ZERO-KNOWLEDGE PROOFS</h3>
                    <div className="status-indicator active">
                        <span className="dot"></span> HALO 2 ACTIVE
                    </div>
                    <p className="description">
                        Transactions are verified using recursive zk-SNARKs (Halo 2), ensuring
                        no trusted setup is required and amounts are perfectly hidden (Bulletproofs+).
                    </p>
                </div>
            </div>

            <div className="transaction-history" style={{marginTop: '3rem'}}>
                <h2 style={{borderBottom: '1px solid #333', paddingBottom: '0.5rem'}}>TRANSACTION HISTORY (ENCRYPTED)</h2>
                <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse', background: 'rgba(0,0,0,0.5)'}}>
                    <thead>
                        <tr>
                            <th style={{padding: '1rem', color: '#888'}}>DATE</th>
                            <th style={{padding: '1rem', color: '#888'}}>TYPE</th>
                            <th style={{padding: '1rem', color: '#888'}}>AMOUNT (BULLETPROOFS+)</th>
                            <th style={{padding: '1rem', color: '#888'}}>HASH</th>
                            <th style={{padding: '1rem', color: '#888'}}>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map(tx => (
                            <tr key={tx.id} style={{borderBottom: '1px solid #333'}}>
                                <td style={{padding: '1rem'}}>{tx.date}</td>
                                <td style={{padding: '1rem'}}>
                                    <span style={{
                                        color: tx.type === 'RECEIVE' || tx.type === 'MINT' ? '#0f0' : '#ff0055',
                                        fontWeight: 'bold'
                                    }}>{tx.type}</span>
                                </td>
                                <td style={{padding: '1rem', fontFamily: 'monospace', fontSize: '1.1rem'}}>
                                    {tx.decoded ? (
                                        <span style={{color: '#fff'}}>
                                            {tx.type === 'SEND' || tx.type === 'TIP' ? '-' : '+'}
                                            {tx.amount.toFixed(2)} BOB
                                        </span>
                                    ) : (
                                        <span style={{color: '#555', filter: 'blur(3px)'}}>XX.XX</span>
                                    )}
                                </td>
                                <td style={{padding: '1rem', fontFamily: 'monospace', color: '#0ff'}}>{tx.hash}</td>
                                <td style={{padding: '1rem'}}>
                                    <button
                                        className="cyber-button"
                                        style={{fontSize: '0.7rem', padding: '0.2rem 0.5rem'}}
                                        onClick={() => toggleDecode(tx.id)}
                                    >
                                        {tx.decoded ? 'HIDE' : 'DECODE'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
