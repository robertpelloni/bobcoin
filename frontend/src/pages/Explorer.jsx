import { useState, useEffect, useRef } from 'react';
import { LATTICE_URL } from '../api';
import './Explorer.css';

export function Explorer() {
    const [frontier, setFrontier] = useState({});
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [accountChain, setAccountChain] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({ accounts: 0, totalBlocks: 0, totalValue: 0 });
    const [autoRefresh, setAutoRefresh] = useState(true);
    const intervalRef = useRef(null);

    const fetchFrontier = async () => {
        try {
            const res = await fetch(`${LATTICE_URL}/frontier`);
            const data = await res.json();
            setFrontier(data);

            // Compute stats
            const accounts = Object.keys(data).length;
            let totalBlocks = 0;
            let totalValue = 0;
            for (const [, info] of Object.entries(data)) {
                totalBlocks += (info.height || 0);
                totalValue += (info.balance || 0);
            }
            setStats({ accounts, totalBlocks, totalValue: totalValue.toFixed(4) });
        } catch (e) {
            console.error('Explorer: Failed to fetch frontier', e);
        }
    };

    const fetchAccountChain = async (pubkey) => {
        try {
            const res = await fetch(`${LATTICE_URL}/chain/${pubkey}`);
            const data = await res.json();
            setAccountChain(data.chain || []);
            setSelectedAccount(pubkey);
        } catch (e) {
            console.error('Explorer: Failed to fetch chain', e);
            setAccountChain([]);
        }
    };

    useEffect(() => {
        fetchFrontier();
        if (autoRefresh) {
            intervalRef.current = setInterval(fetchFrontier, 5000);
        }
        return () => clearInterval(intervalRef.current);
    }, [autoRefresh]);

    const filteredAccounts = Object.entries(frontier).filter(([key]) =>
        key.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const truncate = (str, len = 12) => str ? str.substring(0, len) + '...' : '???';
    const formatTime = (ts) => ts ? new Date(ts).toLocaleString() : 'N/A';

    return (
        <div className="explorer-container">
            <h1 className="glitch" data-text="BLOCK EXPLORER">BLOCK EXPLORER</h1>

            {/* Network Stats Banner */}
            <div className="explorer-stats">
                <div className="stat-card">
                    <span className="stat-label">ACCOUNTS</span>
                    <span className="stat-value neon-text">{stats.accounts}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">TOTAL BLOCKS</span>
                    <span className="stat-value neon-text">{stats.totalBlocks}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">TOTAL VALUE LOCKED</span>
                    <span className="stat-value neon-text">{stats.totalValue} BOB</span>
                </div>
            </div>

            {/* Search + Controls */}
            <div className="explorer-controls">
                <input
                    type="text"
                    className="cyber-input"
                    placeholder="Search by public key..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    title="Filter accounts by public key prefix"
                />
                <label className="auto-refresh-toggle" title="Toggle automatic 5-second refresh">
                    <input type="checkbox" checked={autoRefresh} onChange={() => setAutoRefresh(!autoRefresh)} />
                    AUTO-REFRESH
                </label>
                <button className="cyber-button small" onClick={fetchFrontier} title="Manually refresh the frontier">
                    REFRESH
                </button>
            </div>

            {/* Account List */}
            <div className="explorer-grid">
                <div className="account-list">
                    <h2>LATTICE ACCOUNTS ({filteredAccounts.length})</h2>
                    <div className="account-scroll">
                        {filteredAccounts.map(([pubkey, info]) => (
                            <div
                                key={pubkey}
                                className={`account-row ${selectedAccount === pubkey ? 'selected' : ''}`}
                                onClick={() => fetchAccountChain(pubkey)}
                                title={`Click to inspect account chain: ${pubkey}`}
                            >
                                <span className="account-key">{truncate(pubkey, 16)}</span>
                                <span className="account-balance">{(info.balance || 0).toFixed(4)} BOB</span>
                                <span className="account-height">H:{info.height || 0}</span>
                            </div>
                        ))}
                        {filteredAccounts.length === 0 && (
                            <div className="no-results">NO ACCOUNTS FOUND</div>
                        )}
                    </div>
                </div>

                {/* Block Chain Detail */}
                <div className="chain-detail">
                    <h2>
                        {selectedAccount
                            ? `CHAIN: ${truncate(selectedAccount, 20)}`
                            : 'SELECT AN ACCOUNT'}
                    </h2>
                    {selectedAccount && (
                        <div className="block-scroll">
                            {accountChain.length === 0 && (
                                <div className="no-results">NO BLOCKS IN CHAIN</div>
                            )}
                            {accountChain.map((block, idx) => (
                                <div key={block.hash || idx} className="block-card">
                                    <div className="block-header">
                                        <span className={`block-type type-${block.type}`}>{(block.type || 'unknown').toUpperCase()}</span>
                                        <span className="block-index">#{idx}</span>
                                    </div>
                                    <div className="block-field">
                                        <span className="field-label">HASH</span>
                                        <span className="field-value hash" title={block.hash}>{truncate(block.hash, 24)}</span>
                                    </div>
                                    {block.previous && (
                                        <div className="block-field">
                                            <span className="field-label">PREVIOUS</span>
                                            <span className="field-value" title={block.previous}>{truncate(block.previous, 24)}</span>
                                        </div>
                                    )}
                                    {block.link && (
                                        <div className="block-field">
                                            <span className="field-label">LINK</span>
                                            <span className="field-value" title={block.link}>{truncate(block.link, 24)}</span>
                                        </div>
                                    )}
                                    {block.balance !== undefined && (
                                        <div className="block-field">
                                            <span className="field-label">BALANCE</span>
                                            <span className="field-value neon-text">{block.balance} BOB</span>
                                        </div>
                                    )}
                                    {block.amount !== undefined && block.amount > 0 && (
                                        <div className="block-field">
                                            <span className="field-label">AMOUNT</span>
                                            <span className="field-value" style={{color: '#ff0055'}}>{block.amount} BOB</span>
                                        </div>
                                    )}
                                    {block.payload && (
                                        <div className="block-field">
                                            <span className="field-label">PAYLOAD</span>
                                            <span className="field-value payload">{JSON.stringify(block.payload).substring(0, 80)}...</span>
                                        </div>
                                    )}
                                    {block.spora && (
                                        <div className="block-field">
                                            <span className="field-label">SPoRA</span>
                                            <span className="field-value spora" title={block.spora.chunkHash}>{truncate(block.spora.chunkHash, 20)}</span>
                                        </div>
                                    )}
                                    <div className="block-field">
                                        <span className="field-label">TIME</span>
                                        <span className="field-value">{formatTime(block.timestamp)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
