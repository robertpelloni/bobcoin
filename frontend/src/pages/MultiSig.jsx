import { useState, useEffect } from 'react';
import { submitLatticeBlock, getLatticeFrontier, getLatticeChain, LATTICE_URL } from '../api';
import { Block } from '../Block';
import './MultiSig.css';

export function MultiSig() {
    const [balance, setBalance] = useState(0);
    const [participants, setParticipants] = useState('');
    const [threshold, setThreshold] = useState(2);
    const [keypair, setKeypair] = useState(null);
    const [loading, setLoading] = useState(false);
    const [myMultisigs, setMyMultisigs] = useState([]);

    useEffect(() => {
        const storedKeys = localStorage.getItem('bobcoin_wallet');
        if (storedKeys) {
            const kp = JSON.parse(storedKeys);
            setKeypair(kp);
            fetchData(kp.publicKey);
        }
    }, []);

    const fetchData = async (pubkey) => {
        setLoading(true);
        try {
            const resBal = await getLatticeFrontier(pubkey);
            setBalance(resBal.balance || 0);

            const resAll = await fetch(`${LATTICE_URL}/multisigs`).then(r => r.json());
            const filtered = Object.entries(resAll.multisigs || {})
                .map(([addr, data]) => ({ addr, ...data }))
                .filter(m => m.participants.includes(pubkey));
            setMyMultisigs(filtered);
        } catch(e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        const partList = participants.split(',').map(p => p.trim()).filter(p => p.length > 0);
        if (partList.length < threshold) return alert("Participants must be >= threshold");
        if (balance < 100) return alert("Insufficient balance (100 BOB required)");

        setLoading(true);
        try {
            const frontier = await getLatticeFrontier(keypair.publicKey);
            const chain = await getLatticeChain(keypair.publicKey);
            
            const block = new Block({
                type: 'multisig_create',
                account: keypair.publicKey,
                previous: frontier.frontier,
                balance: balance - 100,
                staked_balance: frontier.staked_balance || 0,
                link: 'MULTISIG_GENESIS',
                payload: { participants: partList, threshold: Number(threshold) },
                height: chain.chain.length
            });

            await block.signBlock(keypair.privateKey);
            const res = await submitLatticeBlock(block);
            if (res.success) {
                alert("Multi-Sig Vault Created! Institutional security initialized.");
                setParticipants('');
                fetchData(keypair.publicKey);
            } else {
                alert("Creation failed: " + res.error);
            }
        } catch (e) {
            alert(e.message);
        }
        setLoading(false);
    };

    const handlePropose = async (vaultAddr) => {
        const recipient = prompt("Enter recipient public key:");
        const amount = Number(prompt("Enter amount to send (BOB):"));
        if (!recipient || isNaN(amount)) return;

        setLoading(true);
        try {
            const frontier = await getLatticeFrontier(keypair.publicKey);
            const chain = await getLatticeChain(keypair.publicKey);
            
            const block = new Block({
                type: 'multisig_propose',
                account: keypair.publicKey,
                previous: frontier.frontier,
                balance: balance, // Proposing is free for the individual
                staked_balance: frontier.staked_balance || 0,
                link: vaultAddr,
                payload: { vault: vaultAddr, recipient, amount },
                height: chain.chain.length
            });

            await block.signBlock(keypair.privateKey);
            const res = await submitLatticeBlock(block);
            if (res.success) {
                alert("Transaction Proposed! Collecting signatures...");
                fetchData(keypair.publicKey);
            }
        } catch(e) { alert(e.message); }
        setLoading(false);
    };

    const handleApprove = async (vaultAddr, proposalID) => {
        setLoading(true);
        try {
            const frontier = await getLatticeFrontier(keypair.publicKey);
            const chain = await getLatticeChain(keypair.publicKey);
            
            const block = new Block({
                type: 'multisig_approve',
                account: keypair.publicKey,
                previous: frontier.frontier,
                balance: balance,
                staked_balance: frontier.staked_balance || 0,
                link: vaultAddr,
                payload: { vault: vaultAddr, proposalID },
                height: chain.chain.length
            });

            await block.signBlock(keypair.privateKey);
            const res = await submitLatticeBlock(block);
            if (res.success) {
                alert("Approval Signed & Broadcasted!");
                fetchData(keypair.publicKey);
            }
        } catch(e) { alert(e.message); }
        setLoading(false);
    };

    return (
        <div className="multisig-container">
            <h1 className="glitch" data-text="SHARED VAULTS">SHARED VAULTS</h1>
            <p className="subtitle">MULTI-SIGNATURE INSTITUTIONAL SECURITY</p>

            <div className="multisig-grid">
                <div className="create-panel">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                        <h2 style={{margin: 0}}>INITIALIZE NEW VAULT</h2>
                        <button className="cyber-button small" onClick={() => fetchData(keypair.publicKey)}>REFRESH</button>
                    </div>
                    <p className="fee">CREATION FEE: 100.00 BOB</p>
                    <div className="field">
                        <label>PARTICIPANT PUBKEYS (COMMA SEPARATED)</label>
                        <textarea className="cyber-input" value={participants} onChange={e => setParticipants(e.target.value)} placeholder="Pubkey1, Pubkey2..." />
                    </div>
                    <div className="field">
                        <label>SIGNATURE THRESHOLD (M-of-N)</label>
                        <input type="number" className="cyber-input" value={threshold} onChange={e => setThreshold(e.target.value)} />
                    </div>
                    <button className="cyber-button" onClick={handleCreate} disabled={loading || balance < 100}>CREATE VAULT</button>
                </div>

                <div className="vault-list">
                    <h2>YOUR ACTIVE VAULTS ({myMultisigs.length})</h2>
                    <div className="scroll-area">
                        {myMultisigs.map(v => (
                            <div key={v.addr} className="vault-card">
                                <div className="vault-header">
                                    <span className="vault-addr">ADDR: {v.addr.substring(0, 16)}...</span>
                                    <span className="vault-threshold">{v.threshold}-of-{v.participants.length}</span>
                                </div>
                                
                                <div className="vault-proposals" style={{marginTop: '1rem', borderTop: '1px solid #222', paddingTop: '1rem'}}>
                                    <h4>PENDING PROPOSALS</h4>
                                    {Object.values(v.pendingProposals || {}).map(p => (
                                        <div key={p.id} className="proposal-row" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '0.5rem', marginBottom: '0.5rem'}}>
                                            <div style={{fontSize: '0.8rem'}}>
                                                <span style={{color: '#ff0055'}}>{p.amount} BOB</span> → {p.recipient.substring(0,8)}...
                                                <div style={{color: '#666', fontSize: '0.7rem'}}>SIGS: {p.signatures.length}/{v.threshold}</div>
                                            </div>
                                            {!p.signatures.includes(keypair.publicKey) && !p.executed && (
                                                <button className="cyber-button small" onClick={() => handleApprove(v.addr, p.id)}>APPROVE</button>
                                            )}
                                            {p.executed && <span style={{color: '#0f0', fontSize: '0.7rem'}}>EXECUTED</span>}
                                        </div>
                                    ))}
                                    <button className="cyber-button small secondary" style={{width: '100%', marginTop: '0.5rem'}} onClick={() => handlePropose(v.addr)}>NEW PROPOSAL</button>
                                </div>

                                <div className="vault-participants" style={{marginTop: '1rem', borderTop: '1px solid #222', paddingTop: '0.5rem'}}>
                                    {v.participants.map(p => (
                                        <div key={p} className="p-row">{p.substring(0, 8)}...</div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {myMultisigs.length === 0 && <p className="empty">NO SHARED VAULTS FOUND.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
