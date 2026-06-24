import { checkAndUnlock } from '../AchievementService';
import './Manual.css';

const SECTIONS = {
    INTRO: {
        title: "0. PROTOCOL MANIFESTO",
        content: (
            <>
                <h2>LATTICE_ARCADE: The Protocol of Useful Work</h2>
                <p className="highlight">"Data is the Currency. Seeding is Mining. Play is Work."</p>
                <p>
                    Lattice Arcade is a next-generation decentralized ecosystem built on an asynchronous Block Lattice.
                    It is the native currency for **Bobtorrent** (P2P sharing), **Bobmania**, 
                    and **Bobsgame** (arcade hardware). 
                </p>
                <p>
                    The network is designed for **Sovereignty**. Every user owns their own chain, every transaction is feeless, 
                    and the system is mathematically hardened against centralized capture.
                </p>
                <h3>CORE PILLARS</h3>
                <ul>
                    <li><strong>Block Lattice (Go):</strong> High-performance, multi-threaded consensus engine written in Go.</li>
                    <li><strong>SPoRA Storage:</strong> Mining is backed by physical storage proofs (Succinct Proof of Random Access).</li>
                    <li><strong>Proof-of-Play (ZK):</strong> RISC-V Zero-Knowledge proofs (Succinct SP1) verify game integrity.</li>
                    <li><strong>Privacy by Default (FHE):</strong> Fully Homomorphic Encryption allows blind server computation.</li>
                </ul>
            </>
        )
    },
    DEFI: {
        title: "1. NATIVE DEFI & AMM",
        content: (
            <>
                <h2>THE SOVEREIGN EXCHANGE</h2>
                <p>Lattice Arcade implements high-velocity financial tools directly in the consensus layer.</p>
                <div className="tech-stack">
                    <div className="tech-item">
                        <h4>ON-CHAIN AMM (x * y = k)</h4>
                        <p>A native Constant Product Market Maker is integrated into the Go engine. Swap BOB for simulated assets trustlessly with real-time price impact.</p>
                    </div>
                    <div className="tech-item">
                        <h4>ATOMIC SWAPS (HTLC)</h4>
                        <p>Hashed Time-Lock Contracts allow peer-to-peer asset exchange between separate account chains without intermediaries.</p>
                    </div>
                    <div className="tech-item">
                        <h4>STAKING & YIELD</h4>
                        <p>Proof-of-Stake logic allows you to lock tokens to secure the lattice, earning 12.5% APY and boosting your Quadratic Voting power.</p>
                    </div>
                </div>
            </>
        )
    },
    SECURITY: {
        title: "2. INSTITUTIONAL SECURITY",
        content: (
            <>
                <h2>SHARED SOVEREIGNTY</h2>
                <p>The Block Lattice is designed for mission-critical asset management.</p>
                <div className="tech-stack">
                    <div className="tech-item">
                        <h4>MULTI-SIG SHARED VAULTS</h4>
                        <p>Initialize collective accounts that require M-of-N cryptographic signatures to authorize any transaction.</p>
                    </div>
                    <div className="tech-item">
                        <h4>MNEMONIC HARDENING</h4>
                        <p>Sovereign identities are derived from 12-word seed phrases, allowing for 100% portable and recoverable wealth.</p>
                    </div>
                    <div className="tech-item">
                        <h4>CONSENSUS AUTO-SYNC</h4>
                        <p>Nodes are self-healing, automatically repairing their own ledger history via P2P gossip and block delta syncing.</p>
                    </div>
                </div>
            </>
        )
    },
    DAG: {
        title: "3. ASYNCHRONOUS ARCHITECTURE",
        content: (
            <>
                <h2>BEYOND THE BLOCKCHAIN</h2>
                <p>
                    Instead of a single global chain, Lattice Arcade uses a Directed Acyclic Graph (DAG) of account chains.
                </p>
                <h3>ADVANTAGES</h3>
                <ul>
                    <li><strong>Infinite Scalability:</strong> Transactions settle asynchronously without global bottlenecks.</li>
                    <li><strong>State Roots:</strong> Every node maintains a cumulative network state hash for total accountability.</li>
                    <li><strong>Feeless:</strong> Standard transfers require no gas, only a valid SPoRA storage proof.</li>
                </ul>
            </>
        )
    },
    TOKENOMICS: {
        title: "4. THE ARCADE ECONOMY",
        content: (
            <>
                <h2>WHITE-MAGIC TOKENOMICS</h2>
                <p>The economy enforces economic velocity through mathematical decay.</p>
                <ul>
                    <li><strong>Demurrage:</strong> 0.01%/min balance decay prevents stagnant hoarding and forces circulation.</li>
                    <li><strong>Quadratic Voting:</strong> DAO power is calculated as SQRT(Balance), preventing whale dominance.</li>
                    <li><strong>Proof-of-Play:</strong> The only way to mint new supply is through human skill and ZK-proofs.</li>
                </ul>
            </>
        )
    }
};

export function Manual() {
    const [activeSection, setActiveSection] = useState('INTRO');

    const handleNext = () => {
        const keys = Object.keys(SECTIONS);
        const idx = keys.indexOf(activeSection);
        if (idx < keys.length - 1) {
            setActiveSection(keys[idx + 1]);
        } else {
            // Reached the end! Unlock Achievement
            try {
                const stored = localStorage.getItem('bobcoin_wallet');
                if (stored) checkAndUnlock('LATTICE_SCHOLAR', JSON.parse(stored), []);
                alert("SOVEREIGN EDUCATION COMPLETE. ACHIEVEMENT UNLOCKED.");
            } catch(e) {}
        }
    };

    return (
        <div className="manual-container">
            <div className="manual-sidebar">
                <div className="sidebar-header">DOCS v6.1.0</div>
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
                    <div style={{marginTop: '3rem', borderTop: '1px solid #333', paddingTop: '2rem', textAlign: 'right'}}>
                        <button className="cyber-button" onClick={handleNext}>
                            {activeSection === 'TOKENOMICS' ? 'COMPLETE INITIATION' : 'NEXT CHAPTER'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
