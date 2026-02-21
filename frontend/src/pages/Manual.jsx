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
    CONTRACTS: {
        title: "3. SMART CONTRACTS",
        content: (
            <>
                <h2>GAMING-OPTIMIZED VM</h2>
                <p>
                    Bobcoin utilizes a UTXO-based VM (inspired by Fuel) designed for
                    <strong>parallel execution</strong> and high-performance gaming logic.
                </p>
                <h3>FEATURES</h3>
                <ul>
                    <li><strong>Predicates:</strong> Stateless scripts for gas-efficient conditions.</li>
                    <li><strong>Native Assets:</strong> Tokens are first-class citizens, not just smart contract entries.</li>
                    <li><strong>Cheating Prevention:</strong> Native support for Commit-Reveal schemes and ZK-Score verification.</li>
                </ul>
            </>
        )
    },
    CONSENSUS: {
        title: "4. HYBRID CONSENSUS",
        content: (
            <>
                <h2>THE "ARCADE" CONSENSUS</h2>
                <p>A novel combination of three mechanisms:</p>
                <ol>
                    <li><strong>The Spine (Avalanche):</strong> Provides sub-second finality.</li>
                    <li><strong>The Filter (Proof-of-Storage):</strong> Only useful nodes (Seeding Data) can vote. Sybil resistance via physical resource provisioning.</li>
                    <li><strong>The Mint (Proof-of-Play):</strong> Token distribution is driven by human skill, verified by ZK-Proofs.</li>
                </ol>
            </>
        )
    },
    TOKENOMICS: {
        title: "5. TOKENOMICS",
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
