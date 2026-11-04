import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './Navigation.css';

/**
 * Sovereign Navigation Hub
 *
 * Consolidates previously sprawling 17 routes into 5 high-value Sovereign Mega-Modules:
 * 1. 🎮 ARCADE & PLAY (Mint, Rhythm Game, Leaderboard, Trophies, Casino)
 * 2. 💱 DEFI & FINANCE (DEX, HTLC Swaps, Staking, MultiSig, Storage Market)
 * 3. 🔒 PRIVACY & VAULT (Wallet, Stealth Mode, Encrypted Cloak, NFT Gallery)
 * 4. ⚡ NODE & NETWORK (Supernode, Explorer, System Status, Mobile Mining)
 * 5. 📖 PROTOCOL MANUAL (Manifesto, Tokenomics, Whitepaper Specs)
 *
 * Provides secondary quick-action bar for immediate deep-subpage navigation.
 */
export function Navigation() {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const location = useLocation();

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);

        const handlePrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handlePrompt);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('beforeinstallprompt', handlePrompt);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    // Determine active mega-module for quick contextual subnav
    const pathname = location.pathname;
    const isArcade = pathname === '/' || pathname === '/trophies' || pathname === '/casino';
    const isDeFi = pathname === '/dex' || pathname === '/swap' || pathname === '/staking' || pathname === '/multisig' || pathname === '/market';
    const isPrivacy = pathname === '/wallet' || pathname === '/vault' || pathname === '/gallery';
    const isNetwork = pathname === '/supernode' || pathname === '/explorer' || pathname === '/system' || pathname === '/mobile' || pathname === '/governance';
    const isManual = pathname === '/manual';

    if (isMobile) {
        return (
            <nav className="mobile-nav">
                <NavLink to="/" className="mobile-item" title="Arcade & Mint"><span className="icon">🎮</span></NavLink>
                <NavLink to="/dex" className="mobile-item" title="DeFi & Exchange"><span className="icon">📈</span></NavLink>
                <NavLink to="/wallet" className="mobile-item" title="Privacy Vault"><span className="icon">🔒</span></NavLink>
                <NavLink to="/governance" className="mobile-item" title="Lattice Governance"><span className="icon">⚖️</span></NavLink>
                <NavLink to="/system" className="mobile-item" title="Network Ops"><span className="icon">🖥️</span></NavLink>
            </nav>
        );
    }

    return (
        <header className="navigation-wrapper">
            <nav className="cyber-nav">
                <div className="nav-brand-group">
                    <NavLink to="/" className="nav-brand">LATTICE_ARCADE</NavLink>
                    <span className="nav-tagline">SOVEREIGN DAG ECOSYSTEM</span>
                </div>

                <div className="nav-links">
                    {deferredPrompt && (
                        <button className="nav-item active" onClick={handleInstall} title="Install Sovereign PWA on your desktop or device">
                            <span className="icon">📲</span> INSTALL PWA
                        </button>
                    )}
                    <NavLink
                        to="/"
                        className={({ isActive }) => (isActive || isArcade) ? "nav-item active" : "nav-item"}
                        title="Arcade Command Hub: Proof-of-Play rhythm game, zero-knowledge token minting, trophies, and casino."
                    >
                        <span className="icon">🎮</span> ARCADE HUB
                    </NavLink>
                    <NavLink
                        to="/dex"
                        className={({ isActive }) => (isActive || isDeFi) ? "nav-item active" : "nav-item"}
                        title="DeFi Suite: FHE Limit Orderbook DEX, Atomic HTLC Swaps, PoS Staking, MultiSig, and Storage Market."
                    >
                        <span className="icon">📈</span> DEFI SUITE
                    </NavLink>
                    <NavLink
                        to="/wallet"
                        className={({ isActive }) => (isActive || isPrivacy) ? "nav-item active" : "nav-item"}
                        title="Privacy & Vault: Ed25519/X25519 Sovereign Wallet, AES-256 Cloaked Shards, and NFT Gallery."
                    >
                        <span className="icon">🔒</span> PRIVACY VAULT
                    </NavLink>
                    <NavLink
                        to="/governance"
                        className={({ isActive }) => (isActive && pathname === '/governance') ? "nav-item active" : "nav-item"}
                        title="Lattice Governance: Quadratic DAO Voting, Treasury Allocation, and Neural Risk Audits."
                    >
                        <span className="icon">⚖️</span> GOVERNANCE
                    </NavLink>
                    <NavLink
                        to="/system"
                        className={({ isActive }) => (isActive || isNetwork) ? "nav-item active" : "nav-item"}
                        title="Network Operations: Supernode Storage, DAG Block Explorer, 3D Mesh Topology, and Mobile Vitality."
                    >
                        <span className="icon">🖥️</span> NETWORK OPS
                    </NavLink>
                    <NavLink
                        to="/manual"
                        className={({ isActive }) => (isActive || isManual) ? "nav-item active" : "nav-item"}
                        title="Protocol Documentation: Economic whitepaper, SPoRA storage specifications, and Tokenomics."
                    >
                        <span className="icon">📖</span> MANUAL
                    </NavLink>
                </div>
                <div className="nav-status-badge">
                    <span className="status-dot"></span> LATTICE ONLINE
                </div>
            </nav>

            {/* Contextual Sub-Bar for Granular Feature Access */}
            <div className="sub-nav-bar">
                {isArcade && (
                    <div className="sub-nav-group">
                        <span className="sub-nav-label">ARCADE MODULES:</span>
                        <NavLink to="/" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"} title="The Mint Rhythm Game & ZK Prover">🎮 MINT GAME</NavLink>
                        <NavLink to="/trophies" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"} title="Ecosystem Trophy Achievements">🏆 TROPHIES</NavLink>
                        <NavLink to="/casino" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"} title="Verifiable Casino Bot">🎰 CASINO</NavLink>
                    </div>
                )}
                {isDeFi && (
                    <div className="sub-nav-group">
                        <span className="sub-nav-label">FINANCE MODULES:</span>
                        <NavLink to="/dex" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"} title="Encrypted FHE Orderbook DEX">📈 ORDERBOOK DEX</NavLink>
                        <NavLink to="/swap" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"} title="Hashed Time-Lock Atomic Swaps">💱 ATOMIC SWAPS</NavLink>
                        <NavLink to="/staking" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"} title="Proof-of-Stake Yield Validator">🥩 STAKING</NavLink>
                        <NavLink to="/multisig" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"} title="Multi-Signature Collective Vault">🤝 MULTISIG</NavLink>
                        <NavLink to="/market" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"} title="Decentralized Storage Market">📦 STORAGE MARKET</NavLink>
                    </div>
                )}
                {isPrivacy && (
                    <div className="sub-nav-group">
                        <span className="sub-nav-label">PRIVACY MODULES:</span>
                        <NavLink to="/wallet" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"} title="Ed25519 Wallet & Ring Signatures">🔑 SOVEREIGN WALLET</NavLink>
                        <NavLink to="/vault" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"} title="Zero-Trust Encrypted Storage Vault">📦 ENCRYPTED VAULT</NavLink>
                        <NavLink to="/gallery" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"} title="On-Chain NFT Artifacts Gallery">🖼️ NFT GALLERY</NavLink>
                    </div>
                )}
                {isNetwork && (
                    <div className="sub-nav-group">
                        <span className="sub-nav-label">NETWORK MODULES:</span>
                        <NavLink to="/system" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"} title="System Status & 3D Topology">🖥️ SYSTEM STATUS</NavLink>
                        <NavLink to="/supernode" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"} title="WebTorrent Storage Supernode">💾 SUPERNODE</NavLink>
                        <NavLink to="/explorer" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"} title="Block Lattice DAG Explorer">🔍 DAG EXPLORER</NavLink>
                        <NavLink to="/mobile" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"} title="Mobile Physical Mining / Vitality">📱 MOBILE MINING</NavLink>
                        <NavLink to="/governance" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"} title="Quadratic Governance DAO">⚖️ DAO GOVERNANCE</NavLink>
                    </div>
                )}
                {isManual && (
                    <div className="sub-nav-group">
                        <span className="sub-nav-label">DOCUMENTATION:</span>
                        <NavLink to="/manual" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"} title="Interactive Protocol Manual">📖 PROTOCOL SPECIFICATION</NavLink>
                    </div>
                )}
            </div>
        </header>
    );
}
