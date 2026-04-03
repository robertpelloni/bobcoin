import { useState, useEffect } from 'react';
import { burnTokens, API_URL } from '../api';
import './StorageMarket.css';

export function StorageMarket() {
    const [bids, setBids] = useState([]);
    const [magnet, setMagnet] = useState('');
    const [amount, setAmount] = useState(50);
    const [loading, setLoading] = useState(true);

    const fetchBids = async () => {
        try {
            const res = await fetch(`${API_URL}/market/bids`);
            const data = await res.json();
            if (data.bids) setBids(data.bids);
        } catch (e) {
            console.error("Failed to fetch bids", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBids();
        const interval = setInterval(fetchBids, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateBid = async (e) => {
        e.preventDefault();
        if (!magnet || amount <= 0) return;

        if (!confirm(`Create Bid: Pay ${amount} BOB to host this file?`)) return;

        try {
            // 1. Burn tokens (Simulate escrow/payment)
            const burnRes = await burnTokens(amount, `Bid Creation: ${magnet.slice(0, 15)}...`);
            if (!burnRes.success) {
                alert("Payment Failed: " + burnRes.error);
                return;
            }

            // 2. Create Bid in DB
            const res = await fetch(`${API_URL}/market/bid`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ magnet, amount })
            });

            if (res.ok) {
                alert("Bid Placed Successfully!");
                setMagnet('');
                fetchBids();
            } else {
                alert("Failed to place bid");
            }
        } catch (e) {
            console.error(e);
            alert("Error creating bid");
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
                                    <td>#{bid.id}</td>
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
