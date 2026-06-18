import { NavLink } from 'react-router-dom';
import './Navigation.css';

export function Navigation() {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [deferredPrompt, setDeferredPrompt] = useState(null);

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
            // Achievement trigger would happen here
        }
    };

    if (isMobile) {
        return (
            <nav className="mobile-nav">
                <NavLink to="/" className="mobile-item"><span className="icon">🎮</span></NavLink>
                <NavLink to="/wallet" className="mobile-item"><span className="icon">🔒</span></NavLink>
                {deferredPrompt && <button onClick={handleInstall} className="mobile-item" style={{background: 'none', border: 'none', padding: 0}}><span className="icon">📲</span></button>}
                <NavLink to="/dex" className="mobile-item"><span className="icon">📈</span></NavLink>
                <NavLink to="/casino" className="mobile-item"><span className="icon">🎰</span></NavLink>
            </nav>
        );
    }

    return (
        <nav className="cyber-nav">
            <div className="nav-brand">LATTICE_ARCADE</div>
            <div className="nav-links">
                {deferredPrompt && (
                    <button className="nav-item active" onClick={handleInstall} style={{color: '#f0f', borderColor: '#f0f', background: 'rgba(255, 0, 255, 0.1)'}}>
                        <span className="icon">📲</span> INSTALL APP
                    </button>
                )}
                <NavLink to="/" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <span className="icon">🎮</span> MINT
                </NavLink>
                <NavLink to="/supernode" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <span className="icon">💾</span> SUPERNODE
                </NavLink>
                <NavLink to="/wallet" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <span className="icon">🔒</span> WALLET
                </NavLink>
                <NavLink to="/governance" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <span className="icon">⚖️</span> GOVERNANCE
                </NavLink>
                <NavLink to="/manual" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <span className="icon">📖</span> MANUAL
                </NavLink>
                <NavLink to="/system" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <span className="icon">🖥️</span> SYSTEM
                </NavLink>
                <NavLink to="/explorer" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <span className="icon">🔍</span> EXPLORER
                </NavLink>
                <NavLink to="/trophies" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <span className="icon">🏆</span> TROPHIES
                </NavLink>
                <NavLink to="/casino" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <span className="icon">🎰</span> CASINO
                </NavLink>
                <NavLink to="/swap" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <span className="icon">💱</span> SWAP
                </NavLink>
                <NavLink to="/gallery" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <span className="icon">🖼️</span> GALLERY
                </NavLink>
                <NavLink to="/staking" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <span className="icon">🥩</span> STAKING
                </NavLink>
                <NavLink to="/dex" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <span className="icon">📈</span> DEX
                </NavLink>
                <NavLink to="/vault" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <span className="icon">📦</span> VAULT
                </NavLink>
                <NavLink to="/multisig" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <span className="icon">🤝</span> MULTISIG
                </NavLink>
                <NavLink to="/market" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <span className="icon">📦</span> MARKET
                </NavLink>
                <NavLink to="/mobile" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <span className="icon">📱</span> MOBILE
                </NavLink>
            </div>
            <div className="nav-status">ONLINE</div>
        </nav>
    );
}
