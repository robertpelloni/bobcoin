import { useState, useEffect } from 'react';
import './Explorer.css';

const MOCK_BLOCKS = Array.from({ length: 15 }, (_, i) => ({
    height: 102450 - i,
    hash: '0x' + Math.random().toString(16).substr(2, 64),
    miner: '0x' + Math.random().toString(16).substr(2, 40),
    txs: Math.floor(Math.random() * 50),
    size: Math.floor(Math.random() * 2000) + ' KB',
    time: new Date(Date.now() - i * 5000).toLocaleTimeString()
}));

export function Explorer() {
    const [searchTerm, setSearchTerm] = useState('');
    const [blocks, setBlocks] = useState(MOCK_BLOCKS);

    const handleSearch = (e) => {
        e.preventDefault();
        alert(`Searching for ${searchTerm} (Mocked)`);
    };

    return (
        <div className="explorer-container">
            <h1 className="glitch" data-text="BLOCK EXPLORER">BLOCK EXPLORER</h1>

            <form onSubmit={handleSearch} className="search-bar">
                <input
                    type="text"
                    placeholder="Search by Address / Tx Hash / Block"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="submit" className="cyber-button">SEARCH</button>
            </form>

            <div className="stats-row">
                <div className="stat-card">
                    <span className="label">LATEST BLOCK</span>
                    <span className="value">#{blocks[0].height}</span>
                </div>
                <div className="stat-card">
                    <span className="label">AVG BLOCK TIME</span>
                    <span className="value">400ms</span>
                </div>
                <div className="stat-card">
                    <span className="label">DIFFICULTY</span>
                    <span className="value">42.5 T</span>
                </div>
            </div>

            <div className="blocks-table-container">
                <h3>LATEST BLOCKS</h3>
                <table className="cyber-table">
                    <thead>
                        <tr>
                            <th>HEIGHT</th>
                            <th>HASH</th>
                            <th>MINER</th>
                            <th>TXS</th>
                            <th>SIZE</th>
                            <th>TIME</th>
                        </tr>
                    </thead>
                    <tbody>
                        {blocks.map(b => (
                            <tr key={b.height}>
                                <td className="highlight">#{b.height}</td>
                                <td className="hash" title={b.hash}>{b.hash.substr(0, 10)}...</td>
                                <td className="address" title={b.miner}>{b.miner.substr(0, 10)}...</td>
                                <td>{b.txs}</td>
                                <td>{b.size}</td>
                                <td>{b.time}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
