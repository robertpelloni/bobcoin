import { useState, useEffect, useRef } from 'react';
import { LATTICE_URL } from '../api';
import { playBlockConfirmedSound } from '../audio/AudioEngine';

const MAX_FEED_ITEMS = 50;

const TYPE_COLORS = {
    open: '#0f0',
    send: '#ff0055',
    receive: '#0ff',
    proposal: '#f0f',
    vote: '#ff0',
    market_bid: '#f80',
    accept_bid: '#8f0',
};

export function LiveFeed() {
    const [feed, setFeed] = useState([]);
    const [connected, setConnected] = useState(false);
    const [stats, setStats] = useState({ accounts: 0, totalBlocks: 0 });
    const [soundEnabled, setSoundEnabled] = useState(true);
    const wsRef = useRef(null);
    const soundRef = useRef(true);

    useEffect(() => {
        soundRef.current = soundEnabled;
    }, [soundEnabled]);

    useEffect(() => {
        const wsUrl = LATTICE_URL.replace('http', 'ws');
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnected(true);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'STATS') {
                setStats({ accounts: data.accounts, totalBlocks: data.totalBlocks });
            } else if (data.type === 'NEW_BLOCK') {
                const block = data.block;
                setFeed(prev => [{
                    id: block.hash,
                    type: block.type,
                    account: block.account,
                    hash: block.hash,
                    balance: block.balance,
                    time: new Date(block.timestamp).toLocaleTimeString(),
                    timestamp: block.timestamp
                }, ...prev].slice(0, MAX_FEED_ITEMS));

                setStats(prev => ({ ...prev, totalBlocks: prev.totalBlocks + 1 }));

                if (soundRef.current) {
                    playBlockConfirmedSound();
                }
            }
        };

        ws.onclose = () => {
            setConnected(false);
        };

        return () => ws.close();
    }, []);

    const truncate = (str, len = 8) => str ? str.substring(0, len) + '...' : '???';

    return (
        <div className="live-feed" style={{border: '1px solid #333', padding: '1rem', marginTop: '2rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                <h3 style={{color: '#0ff', margin: 0, letterSpacing: '2px'}}>
                    <span style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: connected ? '#0f0' : '#f00',
                        marginRight: '8px',
                        boxShadow: connected ? '0 0 10px #0f0' : '0 0 10px #f00'
                    }}></span>
                    LIVE BLOCK FEED
                </h3>
                <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                    <span style={{color: '#888', fontSize: '0.75rem'}}>
                        {stats.accounts} ACCTS / {stats.totalBlocks} BLOCKS
                    </span>
                    <label style={{color: '#888', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer'}}
                           title="Toggle block confirmation sound effects">
                        <input type="checkbox" checked={soundEnabled} onChange={() => setSoundEnabled(!soundEnabled)} 
                               style={{accentColor: '#0ff'}} />
                        🔊
                    </label>
                </div>
            </div>

            <div style={{maxHeight: '300px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#0ff #111'}}>
                {feed.length === 0 && (
                    <div style={{color: '#555', textAlign: 'center', padding: '2rem', fontSize: '0.8rem'}}>
                        {connected ? 'WAITING FOR BLOCKS...' : 'CONNECTING TO LATTICE...'}
                    </div>
                )}
                {feed.map((item) => (
                    <div key={item.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.4rem 0.5rem',
                        borderBottom: '1px solid #1a1a1a',
                        fontSize: '0.8rem',
                        animation: 'fadeIn 0.3s ease-in'
                    }}>
                        <span style={{
                            color: TYPE_COLORS[item.type] || '#888',
                            fontWeight: 'bold',
                            fontSize: '0.7rem',
                            letterSpacing: '1px',
                            minWidth: '80px'
                        }}>
                            {item.type?.toUpperCase()}
                        </span>
                        <span style={{color: '#0ff', fontFamily: 'monospace'}} title={item.account}>
                            {truncate(item.account)}
                        </span>
                        <span style={{color: '#666', fontFamily: 'monospace'}} title={item.hash}>
                            {truncate(item.hash, 10)}
                        </span>
                        <span style={{color: '#888', fontSize: '0.7rem'}}>
                            {item.time}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
