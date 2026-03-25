import { useState } from 'react';
import './Manual.css';

const SECTIONS = {
    INTRO: {
        title: "0. PROTOCOL MANIFESTO",
        icon: "⚡",
        content: (
            <>
                <h2 className="glitch" data-text="BOBCOIN: The Protocol of Useful Work">BOBCOIN: The Protocol of Useful Work</h2>
                <p className="highlight">"Data is the Currency. Seeding is Mining. Play is Work."</p>
                <div className="terminal-box">
                    <p>
                        Bobcoin is a next-generation cryptocurrency designed for arcade gaming economies and micro-tip transactions.
                        Unlike traditional blockchains that rely on wasteful hashing (PoW) or capital dominance (PoS),
                        Bobcoin introduces <strong>Proof-of-Useful-Stake (PoUS)</strong>.
                    </p>
                </div>
                <h3>CORE PILLARS</h3>
                <div className="pillar-grid">
                    <div className="pillar-card">
                        <div className="pillar-icon">💾</div>
                        <h4>Storage = Power</h4>
                        <p>To mine, you must seed useful data (Scientific Archives, Open Source Media).</p>
                    </div>
                    <div className="pillar-card">
                        <div className="pillar-icon">🕹️</div>
                        <h4>Play = Work</h4>
                        <p>Gamers mint tokens by generating ZK-Proofs of their skill ("Proof of Play").</p>
                    </div>
                    <div className="pillar-card">
                        <div className="pillar-icon">🕵️</div>
                        <h4>Privacy Default</h4>
                        <p>Stealth addresses and Ring Signatures protect user data and transaction history.</p>
                    </div>
                </div>
            </>
        )
    },
    PRIVACY: {
        title: "1. PRIVACY & ANONYMITY",
        icon: "🕵️",
        content: (
            <>
                <h2>THE ANONYMITY SET</h2>
                <p>Bobcoin implements a multi-layered privacy stack inspired by Monero and Zcash.</p>
                <div className="tech-stack">
                    <div className="tech-item">
                        <h4>STEALTH ADDRESSES (P0)</h4>
                        <p>Every transaction uses a unique one-time address, decoupling your public identity from your payments.</p>
                    </div>
                    <div className="tech-item">
                        <h4>RING SIGNATURES (CLSAG)</h4>
                        <p>Your spend is mixed with 16+ decoys from the blockchain, making the true origin mathematically ambiguous.</p>
                    </div>
                    <div className="tech-item">
                        <h4>BULLETPROOFS+</h4>
                        <p>Zero-knowledge range proofs hide the transaction amount while verifying it is positive.</p>
                    </div>
                </div>
            </>
        )
    },
    SPEED: {
        title: "2. HIGH-SPEED LATTICE",
        icon: "🚀",
        content: (
            <>
                <h2>BLOCK LATTICE ARCHITECTURE</h2>
                <p>
                    Instead of a single global chain, every account has its own blockchain.
                    This allows for <strong>asynchronous updates</strong> and massive parallel throughput.
                </p>
                <div className="terminal-box">
                    <h3>PERFORMANCE TARGETS</h3>
                    <ul>
                        <li><strong>Finality:</strong> &lt; 500ms (via Avalanche Snowball consensus)</li>
                        <li><strong>Throughput:</strong> 10,000+ TPS</li>
                        <li><strong>Fees:</strong> ZERO for tips, minimal for large transfers.</li>
                    </ul>
                </div>
            </>
        )
    },
    MINING: {
        title: "3. SUPERNODE (MINING)",
        icon: "🖥️",
        content: (
            <>
                <h2>SUPERNODE MINING</h2>
                <p>Mining in Bobcoin is not about solving useless hashes. It is about providing utility to the network.</p>

                <h3>REQUIREMENTS</h3>
                <div className="terminal-box warning">
                    <ul>
                        <li><strong>Disk Space:</strong> At least 1TB recommended for seeding data.</li>
                        <li><strong>Bandwidth:</strong> High upload speed for serving data chunks to peers.</li>
                        <li><strong>Stake:</strong> A minimum collateral is required to become a validator.</li>
                    </ul>
                </div>

                <h3>INSTRUCTIONS</h3>
                <ol className="cyber-list">
                    <li>Go to the <strong>SUPERNODE</strong> page.</li>
                    <li>Click <strong>START MINING</strong> to initialize your node.</li>
                    <li>The node will automatically bid on storage contracts available in the Marketplace.</li>
                    <li>Once a contract is accepted, your node will download and seed the data.</li>
                    <li>You earn rewards periodically as long as you maintain &gt;99% uptime.</li>
                </ol>
            </>
        )
    },
    MARKET: {
        title: "4. STORAGE MARKETPLACE",
        icon: "🛒",
        content: (
            <>
                <h2>DECENTRALIZED STORAGE MARKET</h2>
                <p>
                    The Marketplace is where users post data they want stored, and Supernodes bid to store it.
                </p>
                <div className="market-split">
                    <div className="market-side">
                        <h3>FOR USERS</h3>
                        <p>Post a bid with the data size, duration, and price you are willing to pay.</p>
                    </div>
                    <div className="market-side">
                        <h3>FOR MINERS</h3>
                        <p>Supernodes automatically scan the market for profitable deals based on their configuration.</p>
                    </div>
                </div>
                <p className="highlight" style={{marginTop: '2rem', textAlign: 'center'}}>All deals are secured by smart contracts on the Bobcoin chain.</p>
            </>
        )
    },
    GOV: {
        title: "5. GOVERNANCE (DAO)",
        icon: "⚖️",
        content: (
            <>
                <h2>COMMUNITY GOVERNANCE</h2>
                <p>Bobcoin is owned by its users. The DAO allows token holders to vote on protocol upgrades.</p>
                <div className="terminal-box">
                    <h3>VOTING PROCESS</h3>
                    <ul>
                        <li><strong>Proposals:</strong> Any holder with &gt;1% supply can propose a change.</li>
                        <li><strong>Voting:</strong> Votes are weighted by token holdings (1 Token = 1 Vote).</li>
                        <li><strong>Execution:</strong> Passed proposals are automatically enacted by the on-chain governance module.</li>
                    </ul>
                </div>
                <p>Visit the <strong>GOVERNANCE</strong> page to view active proposals and cast your vote.</p>
            </>
        )
    },
    TOKENOMICS: {
        title: "6. TOKENOMICS",
        icon: "💰",
        content: (
            <>
                <h2>FAIR DISTRIBUTION</h2>
                <p>The economy is designed to reward active participants, not passive holders.</p>
                <div className="tokenomics-chart">
                    <div className="chart-bar" style={{width: '60%', background: '#0ff'}}>60% - Proof of Play</div>
                    <div className="chart-bar" style={{width: '20%', background: '#0f0'}}>20% - Proof of Storage</div>
                    <div className="chart-bar" style={{width: '10%', background: '#ffd700'}}>10% - Staking Rewards</div>
                    <div className="chart-bar" style={{width: '10%', background: '#ff00ff'}}>10% - Treasury</div>
                </div>
                <div className="terminal-box warning" style={{marginTop: '2rem'}}>
                    <p>
                        <strong>Demurrage (Anti-Hoarding):</strong> Large dormant balances slowly decay to encourage circulation and spending in the arcade economy.
                    </p>
                </div>
            </>
        )
    }
};

export function Manual() {
    const [activeSection, setActiveSection] = useState('INTRO');

    const downloadWhitepaper = () => {
        const text = `BOBCOIN WHITEPAPER v2.1\n\n${Object.values(SECTIONS).map(s => s.title + '\n' + s.content.props.children.map(c => typeof c.props.children === 'string' ? c.props.children : '[Markdown Conversion Placeholder]').join('\n')).join('\n\n')}`;
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Bobcoin_Whitepaper.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="manual-container">
            <div className="manual-sidebar">
                <div className="sidebar-header">DATALOG v2.1</div>
                <div className="sidebar-nav">
                    {Object.keys(SECTIONS).map(key => (
                        <button
                            key={key}
                            className={`sidebar-btn ${activeSection === key ? 'active' : ''}`}
                            onClick={() => setActiveSection(key)}
                        >
                            <span className="btn-icon">{SECTIONS[key].icon}</span>
                            <span className="btn-text">{SECTIONS[key].title}</span>
                        </button>
                    ))}
                </div>
                <button className="cyber-button small download-btn" onClick={downloadWhitepaper}>
                    📥 DOWNLOAD PDF
                </button>
            </div>
            <div className="manual-content">
                <div className="content-scroll">
                    <div className="datalog-header">
                        <span className="file-path">C:\BOBCOIN\DOCS\{activeSection}.SYS</span>
                        <span className="status">DECRYPTED</span>
                    </div>
                    {SECTIONS[activeSection].content}
                </div>
            </div>
        </div>
    );
}
