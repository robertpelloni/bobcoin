import { useState } from 'react';
import './Manual.css';

const SECTIONS = {
    INTRO: {
        title: "0. PROTOCOL MANIFESTO",
        content: (
            <>
                <h2>BOBCOIN: The Protocol of Useful Work</h2>
                <p className="highlight">"Data is the Currency. Seeding is Mining. Play is Work."</p>
                <p>
                    Bobcoin is a next-generation cryptocurrency designed for arcade gaming economies and micro-tip transactions.
                    Unlike traditional blockchains that rely on wasteful hashing (PoW) or capital dominance (PoS),
                    Bobcoin introduces <strong>Proof-of-Useful-Stake (PoUS)</strong>.
                </p>
                <h3>CORE PILLARS</h3>
                <ul>
                    <li><strong>Storage = Power:</strong> To mine, you must seed useful data (Scientific Archives, Open Source Media).</li>
                    <li><strong>Play = Work:</strong> Gamers mint tokens by generating ZK-Proofs of their skill ("Proof of Play").</li>
                    <li><strong>Privacy by Default:</strong> Stealth addresses and Ring Signatures protect user data.</li>
                </ul>
                <div className="system-status">
                    <h4>CURRENT SYSTEM STATUS</h4>
                    <p>ZK VERIFICATION: <span style={{color: '#0f0'}}>ACTIVE (SP1 RISC-V)</span></p>
                    <p>SUPERNODE: <span style={{color: '#0f0'}}>ONLINE (WebTorrent)</span></p>
                    <p>CONSENSUS: <span style={{color: '#0f0'}}>SOLANA DEVNET BRIDGE</span></p>
                </div>
            </>
        )
    },
    PRIVACY: {
        title: "1. PRIVACY & ANONYMITY",
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
        content: (
            <>
                <h2>BLOCK LATTICE ARCHITECTURE</h2>
                <p>
                    Instead of a single global chain, every account has its own blockchain.
                    This allows for <strong>asynchronous updates</strong> and massive parallel throughput.
                </p>
                <h3>PERFORMANCE TARGETS</h3>
                <ul>
                    <li><strong>Finality:</strong> &lt; 500ms (via Avalanche Snowball consensus)</li>
                    <li><strong>Throughput:</strong> 10,000+ TPS</li>
                    <li><strong>Fees:</strong> ZERO for tips, minimal for large transfers.</li>
                </ul>
            </>
        )
    },
    MINING: {
        title: "3. HOW TO MINE (SUPERNODE)",
        content: (
            <>
                <h2>SUPERNODE MINING</h2>
                <p>Mining in Bobcoin is not about solving useless hashes. It is about providing utility to the network.</p>
                <h3>REQUIREMENTS</h3>
                <ul>
                    <li><strong>Disk Space:</strong> At least 1TB recommended for seeding data.</li>
                    <li><strong>Bandwidth:</strong> High upload speed for serving data chunks to peers.</li>
                    <li><strong>Stake:</strong> A minimum collateral is required to become a validator.</li>
                </ul>
                <h3>INSTRUCTIONS</h3>
                <ol>
                    <li>Go to the <strong>SUPERNODE</strong> page.</li>
                    <li>Click <strong>START MINING</strong> to initialize your node.</li>
                    <li>The node will automatically bid on storage contracts available in the Marketplace.</li>
                    <li>Once a contract is accepted, your node will download and seed the data.</li>
                    <li>You earn rewards periodically as long as you maintain >99% uptime.</li>
                </ol>
            </>
        )
    },
    MARKET: {
        title: "4. STORAGE MARKETPLACE",
        content: (
            <>
                <h2>DECENTRALIZED STORAGE MARKET</h2>
                <p>
                    The Marketplace is where users post data they want stored, and Supernodes bid to store it.
                </p>
                <h3>FOR USERS</h3>
                <p>Post a bid with the data size, duration, and price you are willing to pay.</p>
                <h3>FOR MINERS</h3>
                <p>Supernodes automatically scan the market for profitable deals based on their configuration.</p>
                <p className="highlight">All deals are secured by smart contracts on the Bobcoin chain.</p>
            </>
        )
    },
    GOV: {
        title: "5. GOVERNANCE (DAO)",
        content: (
            <>
                <h2>COMMUNITY GOVERNANCE</h2>
                <p>Bobcoin is owned by its users. The DAO allows token holders to vote on protocol upgrades.</p>
                <h3>VOTING PROCESS</h3>
                <ul>
                    <li><strong>Proposals:</strong> Any holder with >1% supply can propose a change.</li>
                    <li><strong>Voting:</strong> Votes are weighted by token holdings (1 Token = 1 Vote).</li>
                    <li><strong>Execution:</strong> Passed proposals are automatically enacted by the on-chain governance module.</li>
                </ul>
                <p>Visit the <strong>GOVERNANCE</strong> page to view active proposals and cast your vote.</p>
            </>
        )
    },
    TOKENOMICS: {
        title: "6. TOKENOMICS",
        content: (
            <>
                <h2>FAIR DISTRIBUTION</h2>
                <p>The economy is designed to reward active participants, not passive holders.</p>
                <ul>
                    <li><strong>60% - Proof of Play:</strong> Earned by gamers via ZK-verified scores.</li>
                    <li><strong>20% - Proof of Storage:</strong> Earned by Supernodes for seeding data.</li>
                    <li><strong>10% - Staking Rewards:</strong> For securing the consensus layer.</li>
                    <li><strong>10% - Treasury:</strong> Managed by the DAO for development.</li>
                </ul>
                <p className="highlight">
                    <strong>Demurrage (Anti-Hoarding):</strong> Large dormant balances slowly decay to encourage circulation and spending in the arcade economy.
                </p>
            </>
        )
    }
};

export function Manual() {
    const [activeSection, setActiveSection] = useState('INTRO');

    return (
        <div className="manual-container">
            <div className="manual-sidebar">
                <div className="sidebar-header">DOCS v2.0</div>
                {Object.keys(SECTIONS).map(key => (
                    <button
                        key={key}
                        className={`sidebar-btn ${activeSection === key ? 'active' : ''}`}
                        onClick={() => setActiveSection(key)}
                    >
                        {SECTIONS[key].title}
                    </button>
                ))}
            </div>
            <div className="manual-content">
                <div className="content-scroll">
                    {SECTIONS[activeSection].content}
                </div>
            </div>
        </div>
    );
}
