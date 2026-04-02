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
                    Bobcoin is a next-generation cryptocurrency designed as the default native currency for the entire 
                    interconnected ecosystem: <strong>Bobtorrent</strong> (P2P sharing), <strong>Bobmania</strong>, 
                    <strong>Bobsgame</strong> (arcade games), and <strong>FWBER</strong>. 
                </p>
                <p>
                    Physical arcade machines running Bobsgame across the world will automatically act as stable, 
                    official "Supernodes" to anchor the network, providing permanent decentralized storage.
                </p>
                <h3>CORE PILLARS</h3>
                <ul>
                    <li><strong>Storage = Power (SPoRA):</strong> To mine, nodes must seed useful data via Bobtorrent. We use Succinct Proof of Random Access (SPoRA) to verify physical hardware provisioning.</li>
                    <li><strong>Play = Work:</strong> Gamers mint tokens by generating ZK-Proofs of their skill ("Proof of Play").</li>
                    <li><strong>Privacy by Default (FHE & TEEs):</strong> Advanced cryptography protects user data and ensures "White-Magic" resistance against enslavement currency systems.</li>
                </ul>
            </>
        )
    },
    PRIVACY: {
        title: "1. PRIVACY & ANONYMITY (WHITE MAGIC)",
        content: (
            <>
                <h2>BEYOND MONERO: THE PRIVACY VAULT</h2>
                <p>Bobcoin implements an advanced privacy stack designed to be fully anonymous yet cryptographically compliant, preventing 51% nation-state attacks.</p>
                <div className="tech-stack">
                    <div className="tech-item">
                        <h4>FULLY HOMOMORPHIC ENCRYPTION (FHE)</h4>
                        <p>Smart contracts can compute on encrypted balances without ever decrypting the data in memory. Your transactions are mathematically invisible to the node processing them.</p>
                    </div>
                    <div className="tech-item">
                        <h4>STEALTH ADDRESSES (ONE-TIME)</h4>
                        <p>Every transaction uses a unique Diffie-Hellman generated address, decoupling your public identity from your payments.</p>
                    </div>
                    <div className="tech-item">
                        <h4>PRIVACY POOLS (ZK-SNARKS)</h4>
                        <p>Users can prove via ZK-proofs that their funds did *not* originate from bad actors, allowing compliance without sacrificing anonymity.</p>
                    </div>
                </div>
            </>
        )
    },
    SPEED: {
        title: "2. HIGH-SPEED LATTICE DAG",
        content: (
            <>
                <h2>BLOCK LATTICE & DAG ARCHITECTURE</h2>
                <p>
                    Instead of a single global chain, every account has its own asynchronous blockchain (Block Lattice), 
                    processed simultaneously via a Directed Acyclic Graph (DAG) for massive parallel throughput.
                </p>
                <h3>PERFORMANCE TARGETS</h3>
                <ul>
                    <li><strong>Finality:</strong> &lt; 500ms (Asynchronous Updates)</li>
                    <li><strong>Throughput:</strong> 60,000+ TPS (Hedera/Solana tier)</li>
                    <li><strong>Fees:</strong> ZERO for arcade tips, minimal for large transfers.</li>
                </ul>
            </>
        )
    },
    CONTRACTS: {
        title: "3. SMART CONTRACTS & AI",
        content: (
            <>
                <h2>AI-DRIVEN ORACLES</h2>
                <p>
                    Bobcoin utilizes a high-performance VM (inspired by Move and Fuel) designed for parallel execution.
                    Furthermore, the network embraces AI.
                </p>
                <h3>FEATURES</h3>
                <ul>
                    <li><strong>AI Factories:</strong> Nodes can host autonomous AI agents that execute complex trading or verification logic with fixed, low fees.</li>
                    <li><strong>Predicates:</strong> Stateless scripts for gas-efficient conditions.</li>
                    <li><strong>Cheating Prevention:</strong> Native support for Trusted Execution Environments (TEEs) to isolate game memory.</li>
                </ul>
            </>
        )
    },
    CONSENSUS: {
        title: "4. HYBRID CONSENSUS",
        content: (
            <>
                <h2>THE "ARCADE" CONSENSUS</h2>
                <p>A novel combination of three mechanisms designed to prevent "Miner Monopoly" centralization:</p>
                <ol>
                    <li><strong>The Spine (BlockDAG):</strong> Provides 60k+ TPS and sub-second finality.</li>
                    <li><strong>The Filter (SPoRA & PoST):</strong> Proof of Space & Time combined with Proof of Access ensures only useful nodes (Seeding Bobtorrent Data) can vote.</li>
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
                    <li><strong>60% - Proof of Play:</strong> Earned by gamers via ZK-verified scores on Bobsgame/Bobmania.</li>
                    <li><strong>20% - Proof of Useful Work:</strong> Earned by Supernodes for seeding Bobtorrent files (SPoRA).</li>
                    <li><strong>10% - Staking Rewards:</strong> For securing the consensus layer.</li>
                    <li><strong>10% - Treasury:</strong> Managed by the DAO for development.</li>
                </ul>
                <p className="highlight">
                    <strong>Demurrage (Anti-Hoarding):</strong> Large dormant balances slowly decay to encourage circulation and spending in the arcade economy, preventing wealth centralization.
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
                <div className="sidebar-header">DOCS v2.6.0</div>
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
