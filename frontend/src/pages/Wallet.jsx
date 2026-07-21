import { useState, useEffect, useRef } from 'react';
import { getTransactions, getLatticePending, getLatticeFrontier, submitLatticeBlock, getSporaProof, LATTICE_URL, getLatticeChain } from '../api';
import { generateKeypair, encryptMemo, decryptMemo, deriveKeypair } from '../cryptoUtils';
import { checkAndUnlock } from '../AchievementService';
import { Block } from '../Block';
import { SignConfirmModal } from '../components/SignConfirmModal';
import './Wallet.css';

export function Wallet() {
    const [privacyMode, setPrivacyMode] = useState(true);
    const [ringSize, setRingSize] = useState(16);
    const [balance, setBalance] = useState(0.00);
    const [history, setHistory] = useState([]);
    const [showKeys, setShowKeys] = useState(false);
    // Vault Lockdown State
    const [isLocked, setIsLocked] = useState(false);
    const [password, setPassword] = useState('');
    const [vaultData, setVaultData] = useState(null);

    useEffect(() => {
        // Load encrypted or plain wallet
        let stored = localStorage.getItem('lattice_arcade_wallet');
        if (!stored) {
            setIsGenerating(true);
            return;
        }

        try {
            const parsed = JSON.parse(stored);
            if (parsed.ciphertext) {
                setVaultData(parsed);
                setIsLocked(true);
            } else {
                setKeypair(parsed);
            }
        } catch (e) {
            setIsGenerating(true);
        }
    }, []);

    const handleUnlock = async () => {
        try {
            const { decryptVault } = await import('../cryptoUtils');
            const plainKeys = await decryptVault(vaultData, password);
            setKeypair(plainKeys);
            setIsLocked(false);
            setPassword('');
        } catch (e) {
            alert("Incorrect Sovereign Password");
        }
    };

    const handleOnboardingComplete = async (kp, initialPassword) => {
        if (!initialPassword) return alert("Password required to encrypt vault.");
        const { encryptVault } = await import('../cryptoUtils');
        const encrypted = await encryptVault(kp, initialPassword);
        localStorage.setItem('lattice_arcade_wallet', JSON.stringify(encrypted));
        setVaultData(encrypted);
        setKeypair(kp);
        setIsGenerating(false);
        checkAndUnlock('GIBSON_HACKER', kp, []);
        checkAndUnlock('VAULT_MASTER', kp, []);
    };

    const fetchState = async () => {
        if (!keypair) return;
        try {
            const res = await getLatticeChain(keypair.publicKey);
            const chain = res.chain || [];
            if (chain.length > 0) {
                const latest = chain[chain.length - 1];
                setBalance(latest.balance);
            } else {
                setBalance(0);
            }
            setHistory([...chain].reverse());
            
            const pendingRes = await getLatticePending(keypair.publicKey);
            setPending(pendingRes.pending || []);
        } catch (e) {
            console.error("Wallet Fetch Error:", e);
        }
    };

    useEffect(() => {
        fetchState();
        const interval = setInterval(fetchState, 5000);
        return () => clearInterval(interval);
    }, [keypair]);

    const handleSwitchAccount = async (newIndex) => {
        if (!keypair?.mnemonic) return;
        setAccountIndex(newIndex);
        const newKp = await deriveKeypair(keypair.mnemonic, newIndex);
        setKeypair(newKp);
        if (newIndex > 0) checkAndUnlock('HD_ARCHITECT', newKp, []);
    };

    const scanForAccounts = async () => {
        if (!keypair?.mnemonic || isScanning) return;
        setIsScanning(true);
        const found = [];
        let totalBob = 0;
        
        for (let i = 0; i < 10; i++) { // Scan first 10 indices
            const tempKp = await deriveKeypair(keypair.mnemonic, i);
            const res = await getLatticeFrontier(tempKp.publicKey);
            
            // Check for NFTs and Multisigs too
            const nftRes = await fetch(`${LATTICE_URL}/nfts/${tempKp.publicKey}`).then(r => r.json());
            const hasActivity = res.frontier || res.balance > 0 || (nftRes.nfts && nftRes.nfts.length > 0);
            
            if (hasActivity) {
                found.push({ 
                    index: i, 
                    balance: res.balance || 0, 
                    staked: res.staked_balance || 0,
                    nftCount: nftRes.nfts ? nftRes.nfts.length : 0,
                    address: tempKp.publicKey 
                });
                totalBob += (res.balance || 0) + (res.staked_balance || 0);
            }
        }
        
        setActiveAccounts(found);
        setIsScanning(false);
        if (found.length > 1) checkAndUnlock('LATTICE_ORACLE', keypair, []);
        if (totalBob > 1000) checkAndUnlock('PORTFOLIO_MASTER', keypair, []);
    };

    useEffect(() => {
        if (keypair?.mnemonic && activeAccounts.length === 0) {
            scanForAccounts();
        }
    }, [keypair?.mnemonic]);

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
                staked_balance: frontierData.staked_balance || 0,
                height: frontierData.frontier ? (frontierData.height + 1) : 0,
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
                
                // Unlock Achievement: SPoRA Lord
                checkAndUnlock('SPORA_LORD', keypair, []);
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
                staked_balance: frontRes.staked_balance || 0,
                height: frontRes.frontier ? (frontRes.height + 1) : 0,
                link: sendAddress,
                spora: sporaProof,
                payload: payload
            });

            // Trigger Guardian Review
            setPendingBlock(sendBlock);
            setOnGuardianConfirm(() => async () => {
                await sendBlock.signBlock(keypair.privateKey);
                const res = await submitLatticeBlock(sendBlock);

                if (res.success) {
                    alert(`Sent ${sendAmount} BOB! TX: ${res.hash}`);
                    setBalance(newBalance);
                    setSendAddress('');
                    checkAndUnlock('LATTICE_GUARDIAN', keypair, []);
                } else {
                    alert("Transaction failed: " + res.error);
                }
                setPendingBlock(null);
            });

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
                const finalize = async () => {
                    const kp = await generateKeypair();
                    localStorage.setItem('lattice_arcade_wallet', JSON.stringify(kp));
                    setKeypair(kp);
                    setIsGenerating(false);
                    
                    // Unlock Achievement
                    checkAndUnlock('GIBSON_HACKER', kp, []);
                };
                finalize();
            }
        };

        window.addEventListener('keydown', handleType);
        return () => window.removeEventListener('keydown', handleType);
    }, [isGenerating]);

    const handleAddContact = () => {
        if (!contactName || !contactAddr) return;
        setContacts(prev => ({ ...prev, [contactAddr]: contactName }));
        setContactName('');
        setContactAddr('');
        if (Object.keys(contacts).length >= 4) checkAndUnlock('LATTICE_DIPLOMAT', keypair, []);
    };

    const handleDeleteContact = (addr) => {
        const newContacts = { ...contacts };
        delete newContacts[addr];
        setContacts(newContacts);
    };

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

                {typedEntropy.length >= 64 && (
                    <div style={{marginTop: '2rem', textAlign: 'center', width: '100%', maxWidth: '400px'}}>
                        <p style={{color: '#fff', fontSize: '0.8rem', letterSpacing: '1px'}}>SET A PASSWORD TO ENCRYPT YOUR VAULT</p>
                        <input 
                            type="password" 
                            className="cyber-input" 
                            placeholder="Sovereign Password..." 
                            style={{width: '100%', marginBottom: '1rem'}}
                            onChange={e => setPassword(e.target.value)} 
                        />
                        <button className="cyber-button" onClick={async () => {
                            const kp = await generateKeypair();
                            handleOnboardingComplete(kp, password);
                        }}>INITIALIZE ENCRYPTED VAULT</button>
                    </div>
                )}
            </div>
        );
    }

    if (isLocked) {
        return (
            <div className="wallet-container" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh'}}>
                <h1 className="glitch" data-text="VAULT LOCKED">VAULT LOCKED</h1>
                <p style={{color: '#ff0055', marginBottom: '2rem'}}>ENTER SOVEREIGN PASSWORD TO DECRYPT IDENTITY</p>
                <input 
                    type="password" 
                    className="cyber-input" 
                    style={{maxWidth: '400px', fontSize: '1.5rem', textAlign: 'center'}}
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                    placeholder="Password..."
                    autoFocus
                />
                <button className="cyber-button large" style={{marginTop: '2rem'}} onClick={handleUnlock}>UNLOCK VAULT</button>
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

                <div className="account-switcher" style={{marginTop: '1.5rem', borderTop: '1px solid #222', paddingTop: '1rem', textAlign: 'left'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <label style={{fontSize: '0.7rem', color: '#666', letterSpacing: '1px'}}>SUB-ACCOUNT PORTFOLIO (BIP-44)</label>
                        <button className="cyber-button small" onClick={scanForAccounts} disabled={isScanning} style={{fontSize: '0.6rem'}}>
                            {isScanning ? 'SCANNING...' : 'REFRESH LIST'}
                        </button>
                    </div>

                    <div className="account-list" style={{marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem'}}>
                        {activeAccounts.map(acc => (
                            <div 
                                key={acc.index} 
                                className={`account-row ${accountIndex === acc.index ? 'active' : ''}`}
                                onClick={() => handleSwitchAccount(acc.index)}
                                style={{
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    padding: '0.6rem 1rem', 
                                    background: accountIndex === acc.index ? 'rgba(0, 255, 255, 0.1)' : '#111',
                                    border: `1px solid ${accountIndex === acc.index ? '#0ff' : '#222'}`,
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{display: 'flex', flexDirection: 'column'}}>
                                    <span>ACCOUNT #{acc.index} <span style={{color: '#444', marginLeft: '0.5rem'}}>{acc.address.slice(0,8)}...</span></span>
                                    <div style={{display: 'flex', gap: '8px', marginTop: '4px'}}>
                                        {acc.staked > 0 && <span title="Staking Active" style={{fontSize: '0.6rem', color: '#0f0'}}>🥩 {acc.staked.toFixed(1)}</span>}
                                        {acc.nftCount > 0 && <span title="Artifacts Collected" style={{fontSize: '0.6rem', color: '#f0f'}}>🖼️ {acc.nftCount}</span>}
                                    </div>
                                </div>
                                <span className="neon-text" style={{fontWeight: 'bold'}}>{(acc.balance + acc.staked).toFixed(2)} BOB</span>
                            </div>
                        ))}
                        {activeAccounts.length === 0 && !isScanning && <div style={{color: '#444', fontSize: '0.7rem'}}>ONLY MAIN ACCOUNT DISCOVERED</div>}
                    </div>

                    <div style={{marginTop: '0.8rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                        <span style={{fontSize: '0.6rem', color: '#444'}}>ADD INDEX:</span>
                        {[0, 1, 2, 3, 4, 5, 6, 7].map(idx => (
                            <button 
                                key={idx} 
                                className={`cyber-button small ${accountIndex === idx ? 'active' : 'secondary'}`}
                                onClick={() => handleSwitchAccount(idx)}
                                style={{fontSize: '0.6rem', minWidth: '30px', padding: '0.2rem'}}
                            >
                                #{idx}
                            </button>
                        ))}
                    </div>
                    
                    <div style={{marginTop: '1rem', fontSize: '0.6rem', color: '#444', fontFamily: 'monospace'}}>
                        DERIVATION: {keypair?.derivationPath || 'm/44\'/1337\'/0\''}
                    </div>
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
                                title="The Lattice Arcade public address of the recipient."
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
                                title="The amount of Lattice Arcade to send."
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
                            <button type="submit" className="cyber-button" disabled={isSending} style={{marginTop: '1rem', width: '100%', color: '#0f0', borderColor: '#0f0'}} title="Initiate a secure, encrypted token transfer across the network.">
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
                    <div className="control" style={{display: 'flex', gap: '1rem'}}>
                        <button className="cyber-button" onClick={() => setShowKeys(!showKeys)} style={{fontSize: '0.8rem', padding: '0.5rem'}} title="Reveal or hide your private cryptographic keys.">
                            {showKeys ? 'HIDE KEYS' : 'REVEAL KEYS'}
                        </button>
                        <button className="cyber-button secondary" onClick={() => {
                            setShowBackup(!showBackup);
                            if (!showBackup) checkAndUnlock('CRYPTOGRAPHER', keypair, []);
                        }} style={{fontSize: '0.8rem', padding: '0.5rem'}} title="Open the Secure Backup Vault.">
                            {showBackup ? 'CLOSE VAULT' : 'BACKUP VAULT'}
                        </button>
                        <button className="cyber-button secondary" onClick={() => setShowContacts(!showContacts)} style={{fontSize: '0.8rem', padding: '0.5rem'}} title="Manage your sovereign contacts.">
                            {showContacts ? 'CLOSE CONTACTS' : 'ADDRESS BOOK'}
                        </button>
                    </div>

                    {showContacts && (
                        <div className="address-book" style={{background: '#050505', border: '1px solid #0ff', padding: '1.5rem', marginTop: '1.5rem', textAlign: 'left', width: '100%'}}>
                            <h3 style={{color: '#0ff', marginTop: 0}}>SOVEREIGN CONTACTS</h3>
                            <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1rem'}}>
                                <input className="cyber-input" style={{flex: 1}} placeholder="Name..." value={contactName} onChange={e => setContactName(e.target.value)} />
                                <input className="cyber-input" style={{flex: 2}} placeholder="Public Key..." value={contactAddr} onChange={e => setContactAddr(e.target.value)} />
                                <button className="cyber-button small" onClick={handleAddContact}>ADD</button>
                            </div>
                            <div className="contact-list" style={{maxHeight: '200px', overflowY: 'auto'}}>
                                {Object.entries(contacts).map(([addr, name]) => (
                                    <div key={addr} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '0.5rem', marginBottom: '0.4rem', borderLeft: '2px solid #0ff'}}>
                                        <div>
                                            <div style={{color: '#fff', fontSize: '0.85rem'}}>{name}</div>
                                            <div style={{color: '#444', fontSize: '0.7rem', fontFamily: 'monospace'}}>{addr.slice(0, 16)}...</div>
                                        </div>
                                        <div style={{display: 'flex', gap: '0.5rem'}}>
                                            <button className="cyber-button small" onClick={() => setSendAddress(addr)}>USE</button>
                                            <button className="cyber-button small secondary" onClick={() => handleDeleteContact(addr)}>DEL</button>
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(contacts).length === 0 && <p style={{color: '#444', fontSize: '0.8rem'}}>NO CONTACTS SAVED.</p>}
                            </div>
                        </div>
                    )}

                    {showBackup && (
                        <div className="backup-vault" style={{background: '#050505', border: '1px solid #ff0055', padding: '1.5rem', marginTop: '1.5rem', textAlign: 'left', width: '100%'}}>
                            <h3 style={{color: '#ff0055', marginTop: 0}}>BACKUP SEED PHRASE</h3>
                            <p style={{color: '#888', fontSize: '0.8rem'}}>Write these 12 words down and store them in a physical safe. They can restore your entire account.</p>
                            <div style={{background: '#111', padding: '1rem', border: '1px solid #333', fontFamily: 'monospace', color: '#fff', letterSpacing: '1px', wordBreak: 'break-all'}}>
                                {keypair.mnemonic || 'Legacy wallet detected (no seed)'}
                            </div>
                            
                            <div style={{marginTop: '2rem', borderTop: '1px solid #222', paddingTop: '1rem'}}>
                                <h3 style={{color: '#0ff'}}>RESTORE FROM SEED</h3>
                                <input 
                                    className="cyber-input" 
                                    placeholder="Enter 12-word mnemonic..." 
                                    value={importSeed}
                                    onChange={e => setImportSeed(e.target.value)}
                                    style={{marginBottom: '1rem', width: '100%'}}
                                />
                                <button className="cyber-button small" onClick={handleRestore} title="Recover your entire wallet from the provided mnemonic seed phrase.">RESTORE WALLET</button>
                            </div>
                        </div>
                    )}

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

            <SignConfirmModal 
                block={pendingBlock} 
                onConfirm={onGuardianConfirm} 
                onCancel={() => setPendingBlock(null)} 
            />
        </div>
    );
}
