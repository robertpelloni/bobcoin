<<<<<<< HEAD
import './Marketplace.css';

export function Marketplace() {
=======
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { burnTokens } from '../api';
import { Tooltip } from './Tooltip';
import './Marketplace.css';

const DEFAULT_ITEMS = [
    {
        id: 'theme_neon',
        name: 'NEON THEME',
        type: 'THEME',
        price: 500,
        purchased: false,
        icon: '🎨',
        desc: "Applies a high-contrast neon theme to the dashboard."
    },
    {
        id: 'theme_matrix',
        name: 'MATRIX THEME',
        type: 'THEME',
        price: 1000,
        purchased: false,
        icon: '🖥️',
        desc: "Transforms the UI into a falling code matrix."
    },
    {
        id: 'music_dnb',
        name: 'DNB TRACK PACK',
        type: 'MUSIC',
        price: 750,
        purchased: false,
        icon: '🎵',
        desc: "Unlocks 3 new Drum & Bass tracks for the rhythm game."
    },
    {
        id: 'boost_2x',
        name: '2X SCORE BOOST',
        type: 'BOOST',
        price: 2000,
        purchased: false,
        icon: '⚡',
        desc: "Doubles all points earned for the next 1 hour."
    },
];

export function Marketplace() {
    const wallet = useWallet();
    const [items, setItems] = useState(DEFAULT_ITEMS);
    const [balance, setBalance] = useState(1250); // Mock balance for purchasing
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Load purchased state from localStorage
        const saved = JSON.parse(localStorage.getItem('marketplace_items'));
        if (saved && Array.isArray(saved) && saved.length > 0) {
            setItems(saved);
        } else {
            setItems(DEFAULT_ITEMS);
        }
    }, []);

    const handleBuy = async (item) => {
        if (item.purchased) return;
        if (balance < item.price) {
            alert("Insufficient Funds!");
            return;
        }

        if (confirm(`Buy ${item.name} for ${item.price} BOB? (This will burn tokens)`)) {
            setMessage('Processing Transaction...');

            // Call Backend Burn
            const result = await burnTokens(item.price, `Marketplace: ${item.name}`, wallet);

            if (result.success) {
                // Update items state
                const newItems = items.map(i =>
                    i.id === item.id ? { ...i, purchased: true } : i
                );
                setItems(newItems);

                // Deduct balance
                setBalance(prev => prev - item.price);

                // Save to localStorage
                localStorage.setItem('marketplace_items', JSON.stringify(newItems));

                // Apply effect immediately (mock)
                if (item.type === 'THEME') {
                    document.body.classList.add(item.id);
                }

                setMessage(`PURCHASED: ${item.name} (TX: ${result.tx.slice(0, 8)}...)`);
                setTimeout(() => setMessage(''), 3000);
            } else {
                alert("Transaction Failed: " + result.error);
                setMessage('');
            }
        }
    };

>>>>>>> feature/comprehensive-ui-spec
    return (
        <div className="marketplace-container">
            <h2>MARKETPLACE</h2>
            <div className="marketplace-grid">
                <div className="market-item">
                    <h3>CYBER THEME</h3>
                    <p>Unlock new UI colors</p>
                    <button className="cyber-button">BUY (50 BOB)</button>
                </div>
            </div>
<<<<<<< HEAD
=======

            <div className="items-grid">
                {items.map(item => (
                    <Tooltip key={item.id} text={item.desc}>
                        <div className={`market-item ${item.purchased ? 'purchased' : ''}`}>
                            <div className="item-icon">
                                {item.icon}
                            </div>
                            <div className="item-details">
                                <h3>{item.name}</h3>
                                <span className="item-type">{item.type}</span>
                            </div>
                            <button
                                className="cyber-button small"
                                onClick={(e) => { e.stopPropagation(); handleBuy(item); }}
                                disabled={item.purchased}
                                style={{
                                    fontSize: '0.8rem',
                                    padding: '0.5rem',
                                    opacity: item.purchased ? 0.5 : 1,
                                    cursor: item.purchased ? 'default' : 'pointer'
                                }}
                            >
                                {item.purchased ? 'OWNED' : `${item.price} BOB`}
                            </button>
                        </div>
                    </Tooltip>
                ))}
            </div>

            {message && <div className="market-status">{message}</div>}
>>>>>>> feature/comprehensive-ui-spec
        </div>
    );
}