import { useState, useEffect } from 'react';
import { submitLatticeBlock, getLatticeFrontier, getLatticeChain, LATTICE_URL } from '../api';
import { Block } from '../Block';
import './Gallery.css';

export function Gallery() {
    const [balance, setBalance] = useState(0);
    const [ownedNfts, setOwnedNfts] = useState([]);
    const [nftName, setNftName] = useState('');
    const [nftMagnet, setNftMagnet] = useState('');
    const [nftDesc, setNftDesc] = useState('');
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
        try {
            // Fetch Balance
            const resBal = await getLatticeChain(pubkey);
            if (resBal.chain?.length > 0) {
                setBalance(resBal.chain[resBal.chain.length - 1].balance);
            }

            // Fetch NFTs
            const resNft = await fetch(`${LATTICE_URL}/nfts/${pubkey}`).then(r => r.json());
            setOwnedNfts(resNft.nfts || []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleMint = async (e) => {
        e.preventDefault();
        if (balance < 50) return alert("Insufficient balance! Minting costs 50 BOB.");
        if (!nftName || !nftMagnet) return alert("Missing metadata");

        setLoading(true);
        try {
            const frontier = await getLatticeFrontier(keypair.publicKey);
            const chain = await getLatticeChain(keypair.publicKey);
            
            const block = new Block({
                type: 'mint_nft',
                account: keypair.publicKey,
                previous: frontier.frontier,
                balance: balance - 50,
                link: 'NFT_MINT',
                payload: { name: nftName, magnet: nftMagnet, description: nftDesc },
                height: chain.chain.length
            });

            await block.signBlock(keypair.privateKey);
            const res = await submitLatticeBlock(block);

            if (res.success) {
                alert("NFT Minted Successfully! Your digital asset is now on the lattice.");
                setNftName(''); setNftMagnet(''); setNftDesc('');
                fetchData(keypair.publicKey);
            } else {
                alert("Minting failed: " + res.error);
            }
        } catch (e) {
            alert(e.message);
        }
        setLoading(false);
    };

    const handleTransfer = async (nftId) => {
        const recipient = prompt("Enter recipient public key:");
        if (!recipient) return;

        setLoading(true);
        try {
            const frontier = await getLatticeFrontier(keypair.publicKey);
            const chain = await getLatticeChain(keypair.publicKey);
            
            const block = new Block({
                type: 'transfer_nft',
                account: keypair.publicKey,
                previous: frontier.frontier,
                balance: balance - 1, // Transfer fee
                link: nftId,
                payload: { recipient },
                height: chain.chain.length
            });

            await block.signBlock(keypair.privateKey);
            const res = await submitLatticeBlock(block);

            if (res.success) {
                alert("NFT Transferred!");
                fetchData(keypair.publicKey);
            } else {
                alert("Transfer failed: " + res.error);
            }
        } catch (e) {
            alert(e.message);
        }
        setLoading(false);
    };

    return (
        <div className="gallery-container">
            <h1 className="glitch" data-text="DIGITAL GALLERY">DIGITAL GALLERY</h1>
            <p className="subtitle">LATTICE-NATIVE COLLECTIBLES & ARTIFACTS</p>

            <div className="gallery-layout">
                {/* Minting Form */}
                <div className="mint-panel">
                    <h2>MINT NEW ARTIFACT</h2>
                    <p className="fee-notice">COST: 50 BOB</p>
                    <form onSubmit={handleMint}>
                        <div className="field">
                            <label>ARTIFACT NAME</label>
                            <input className="cyber-input" value={nftName} onChange={e => setNftName(e.target.value)} placeholder="Cyber Katana #01..." />
                        </div>
                        <div className="field">
                            <label>ASSET MAGNET LINK</label>
                            <input className="cyber-input" value={nftMagnet} onChange={e => setNftMagnet(e.target.value)} placeholder="magnet:?xt=urn:btih:..." />
                        </div>
                        <div className="field">
                            <label>DESCRIPTION</label>
                            <textarea className="cyber-input" value={nftDesc} onChange={e => setNftDesc(e.target.value)} placeholder="A rare digital relic..." />
                        </div>
                        <button className="cyber-button" disabled={loading || balance < 50}>MINT ARTIFACT</button>
                    </form>
                </div>

                {/* Display Grid */}
                <div className="nft-grid-section">
                    <h2>YOUR COLLECTION ({ownedNfts.length})</h2>
                    <div className="nft-grid">
                        {ownedNfts.map(nft => (
                            <div key={nft.id} className="nft-card">
                                <div className="nft-visual">
                                    <div className="visual-glitch"></div>
                                    <span className="nft-icon">💎</span>
                                </div>
                                <h3 className="nft-name">{nft.name}</h3>
                                <p className="nft-desc">{nft.description}</p>
                                <div className="nft-id">ID: {nft.id.substring(0, 12)}...</div>
                                <button className="cyber-button small" onClick={() => handleTransfer(nft.id)}>TRANSFER</button>
                            </div>
                        ))}
                        {ownedNfts.length === 0 && <p className="empty">NO ARTIFACTS FOUND IN YOUR CHAIN.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
