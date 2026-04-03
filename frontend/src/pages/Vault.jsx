import { useState, useEffect } from 'react';
import { submitLatticeBlock, getLatticeFrontier, getLatticeChain, LATTICE_URL, SUPERNODE_URL } from '../api';
import { checkAndUnlock } from '../AchievementService';
import { Block } from '../Block';
import './Vault.css';

export function Vault() {
    const [balance, setBalance] = useState(0);
    const [anchors, setAnchors] = useState([]);
    const [file, setFile] = useState(null);
    const [keypair, setKeypair] = useState(null);
    const [uploading, setUploading] = useState(false);

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

        const resAnchors = await fetch(`${LATTICE_URL}/anchors`).then(r => r.json());
        setAnchors(resAnchors.anchors || []);
    };

    const handleUpload = async () => {
        if (!file) return alert("Select a file first");
        if (balance < 10) return alert("Insufficient balance for storage fee (10 BOB)");

        setUploading(true);
        try {
            // 1. Upload to Supernode
            const formData = new FormData();
            formData.append('file', file);
            
            const upRes = await fetch(`${SUPERNODE_URL}/upload`, {
                method: 'POST',
                body: formData
            }).then(r => r.json());

            if (!upRes.success) throw new Error("Supernode upload failed");

            // 2. Anchor to Lattice
            const frontier = await getLatticeFrontier(keypair.publicKey);
            const chain = await getLatticeChain(keypair.publicKey);
            
            const block = new Block({
                type: 'data_anchor',
                account: keypair.publicKey,
                previous: frontier.frontier,
                balance: balance - 10,
                staked_balance: frontier.staked_balance || 0,
                link: 'DATA_ANCHOR',
                payload: { name: file.name, magnet: upRes.magnet, size: upRes.size },
                height: chain.chain.length
            });

            await block.signBlock(keypair.privateKey);
            const res = await submitLatticeBlock(block);

            if (res.success) {
                alert("Data Anchored Forever! Your file is now permanent on the Bobcoin network.");
                setFile(null);
                fetchData(keypair.publicKey);
                checkAndUnlock('DATA_ARCHITECT', keypair, []);
            } else {
                alert("Anchoring failed: " + res.error);
            }
        } catch (e) {
            alert(e.message);
        }
        setUploading(false);
    };

    return (
        <div className="vault-container">
            <h1 className="glitch" data-text="CYBER VAULT">CYBER VAULT</h1>
            <p className="subtitle">SPoRA-BACKED DECENTRALIZED PERMANENT STORAGE</p>

            <div className="upload-section">
                <h2>ANCHOR NEW DATA</h2>
                <p className="fee">STORAGE FEE: 10.00 BOB</p>
                <div className="drop-zone">
                    <input type="file" onChange={e => setFile(e.target.files[0])} />
                    <p>{file ? file.name : 'DRAG & DROP OR CLICK TO UPLOAD'}</p>
                </div>
                <button className="cyber-button" onClick={handleUpload} disabled={uploading || !file}>
                    {uploading ? 'ANCHORING...' : 'ANCHOR TO LATTICE'}
                </button>
            </div>

            <div className="anchors-list">
                <h2>NETWORK ARCHIVE</h2>
                <div className="anchor-grid">
                    {anchors.map(a => (
                        <div key={a.id} className="anchor-card">
                            <span className="file-icon">📄</span>
                            <div className="file-info">
                                <span className="file-name">{a.name}</span>
                                <span className="file-meta">{(a.size / 1024).toFixed(2)} KB | ID: {a.id.substring(0,8)}</span>
                            </div>
                            <a href={a.magnet} className="cyber-button small">MAGNET</a>
                        </div>
                    ))}
                    {anchors.length === 0 && <p className="empty">NO DATA HAS BEEN ANCHORED YET.</p>}
                </div>
            </div>
        </div>
    );
}
