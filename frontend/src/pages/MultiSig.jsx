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
        const resBal = await getLatticeFrontier(pubkey);
        setBalance(resBal.balance || 0);

        const resAll = await fetch(`${LATTICE_URL}/multisigs`).then(r => r.json());
        // Filter multisigs where I am a participant
        const filtered = Object.entries(resAll.multisigs || {})
            .map(([addr, data]) => ({ addr, ...data }))
            .filter(m => m.participants.includes(pubkey));
        setMyMultisigs(filtered);
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

    return (
        <div className="multisig-container">
            <h1 className="glitch" data-text="SHARED VAULTS">SHARED VAULTS</h1>
            <p className="subtitle">MULTI-SIGNATURE INSTITUTIONAL SECURITY</p>

            <div className="multisig-grid">
                <div className="create-panel">
                    <h2>INITIALIZE NEW VAULT</h2>
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
                                <div className="vault-participants">
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
