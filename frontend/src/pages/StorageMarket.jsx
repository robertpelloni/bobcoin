import { useState, useEffect } from 'react';
import { getManifestAnchors, getMarketBids, submitLatticeBlock, getLatticeFrontier, getSporaProof, LATTICE_URL } from '../api';
import { generateKeypair } from '../cryptoUtils';
import { Block } from '../Block';
import './StorageMarket.css';

export function StorageMarket() {
    const [bids, setBids] = useState([]);
    const [magnet, setMagnet] = useState('');
    const [amount, setAmount] = useState(50);
    const [loading, setLoading] = useState(true);
    const [keypair, setKeypair] = useState(null);
    const [balance, setBalance] = useState(0);
    const [myAnchors, setMyAnchors] = useState([]);

    const fetchAnchors = async (pubkey) => {
        try {
            const res = await getManifestAnchors(pubkey);
            setMyAnchors(res.anchors || []);
        } catch (e) {
            console.error("Failed to fetch anchors", e);
        }
    };

    const fetchBids = async () => {
        try {
            const data = await getMarketBids();
            setBids(data);
        } catch (e) {
            console.error("Failed to fetch bids", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let kp;
        const storedKeys = localStorage.getItem('bobcoin_wallet');
        if (!storedKeys) {
            kp = generateKeypair();
            localStorage.setItem('bobcoin_wallet', JSON.stringify(kp));
            setKeypair(kp);
        } else {
            kp = JSON.parse(storedKeys);
            setKeypair(kp);
        }

        const fetchBal = async () => {
            if (kp) {
                try {
                    const res = await fetch(`${LATTICE_URL}/balance/${kp.publicKey}`);
                    const data = await res.json();
                    setBalance(data.balance || 0);
                } catch(e) {}
            }
        };

        fetchBids();
        if (kp) {
            fetchBal();
            fetchAnchors(kp.publicKey);
        }
        const interval = setInterval(() => { 
            fetchBids(); 
            if (kp) {
                fetchBal();
                fetchAnchors(kp.publicKey);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateBid = async (e) => {
        e.preventDefault();
        if (!magnet || amount <= 0) return;
        if (balance < amount) {
            alert(`Insufficient funds. Your balance is ${balance} BOB.`);
            return;
        }
        if (!confirm(`Create Decentralized Storage Contract: Pay ${amount} BOB to host this file?`)) return;

        try {
            const frontRes = await getLatticeFrontier(keypair.publicKey);
            const previousHash = frontRes.frontier;
            if (!previousHash) throw new Error("Wallet not initialized on network (no frontier).");

            const expectedChallenge = parseInt(previousHash.substr(0, 8), 16);
            let sporaProof = null;
            try {
                sporaProof = await getSporaProof(expectedChallenge);
            } catch (err) {
                alert("SPoRA Failed: You must be running an active Supernode seeding the Bobtorrent Anchors.");
                return;
            }

            const bidBlock = new Block({
                type: 'market_bid',
                account: keypair.publicKey,
                previous: previousHash,
                balance: balance - amount,
                link: 'STORAGE_MARKET',
                spora: sporaProof,
                payload: { magnet }
            });

            await bidBlock.signBlock(keypair.privateKey);
            const res = await submitLatticeBlock(bidBlock);

            if (res.success) {
                alert(`Bid Placed on the Lattice! Hash: ${res.hash}`);
                setMagnet('');
                fetchBids();
            } else {
                alert("Failed to place bid: " + res.error);
            }
        } catch (err) {
            console.error(err);
            alert("Error creating bid: " + err.message);
        }
    };

    return (
        <div className="storage-market-container">
            <div className="market-header">
                <h1 className="glitch" data-text="STORAGE MARKET">STORAGE MARKET</h1>
                <div className="market-stats">
                    <span>ACTIVE BIDS: {bids.length}</span>
                </div>
            </div>

            <div className="create-bid-section">
                <h2>REQUEST HOSTING</h2>
                
                {myAnchors.length > 0 && (
                    <div className="archive-selector" style={{ marginBottom: '1.5rem', textAlign: 'left', background: 'rgba(0,255,255,0.05)', padding: '1rem', border: '1px solid #111' }}>
                        <label style={{ display: 'block', color: '#0ff', fontSize: '0.7rem', marginBottom: '0.5rem', letterSpacing: '1px' }}>USE ANCHORED MANIFEST</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select 
                                className="cyber-input" 
                                style={{ flex: 1, padding: '0.4rem' }}
                                onChange={(e) => {
                                    if (e.target.value) setMagnet(e.target.value);
                                }}
                                value={myAnchors.some(a => (a.locator || a.magnet) === magnet) ? magnet : ""}
                            >
                                <option value="">-- Select from your Archive --</option>
                                {myAnchors.map(a => (
                                    <option key={a.blockHash} value={a.locator || a.magnet}>
                                        {a.name || (a.locator || a.magnet).slice(0, 32) + '...'}
                                    </option>
                                ))}
                            </select>
                            <button 
                                type="button" 
                                className="cyber-button small" 
                                onClick={() => keypair && fetchAnchors(keypair.publicKey)}
                                style={{ padding: '0 1rem' }}
                            >
                                REFRESH
                            </button>
                        </div>
                    </div>
                )}

                <form onSubmit={handleCreateBid} className="bid-form">
                    <div className="form-group" style={{flex: 3}}>
                        <label>MAGNET LINK / INFO HASH</label>
                        <input
                            type="text"
                            className="cyber-input"
                            placeholder="magnet:?xt=urn:btih:..."
                            value={magnet}
                            onChange={(e) => setMagnet(e.target.value)}
                            title="Enter the magnet link or info hash of the file you want hosted."
                        />
                    </div>
                    <div className="form-group" style={{flex: 1}}>
                        <label>OFFER (BOB)</label>
                        <input
                            type="number"
                            className="cyber-input"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            min="10"
                            title="The amount of BOB tokens you are willing to burn/escrow for this hosting contract."
                        />
                    </div>
                    <button type="submit" className="cyber-button" title="Place a bid on the decentralized storage market.">PLACE BID</button>
                </form>
            </div>

            <div className="bids-list">
                <h2>ORDER BOOK</h2>
                {loading ? <p>Loading market data...</p> : (
                    <table className="bids-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>CONTENT</th>
                                <th>REWARD</th>
                                <th>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bids.map(bid => (
                                <tr key={bid.id}>
                                    <td>#{bid.id.slice(0, 8)}...</td>
                                    <td className="magnet-link">{bid.magnet}</td>
                                    <td className="bid-amount">{bid.amount} BOB</td>
                                    <td><span className={`bid-status ${bid.status.toLowerCase()}`}>{bid.status}</span></td>
                                </tr>
                            ))}
                            {bids.length === 0 && (
                                <tr>
                                    <td colSpan="4" style={{textAlign: 'center', color: '#555'}}>NO ACTIVE BIDS</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
