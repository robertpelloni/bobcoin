import { NavLink } from 'react-router-dom';
import './Navigation.css';

export function Navigation() {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (isMobile) {
        return (
            <nav className="mobile-nav">
                <NavLink to="/" className="mobile-item"><span className="icon">🎮</span></NavLink>
                <NavLink to="/wallet" className="mobile-item"><span className="icon">🔒</span></NavLink>
                <NavLink to="/dex" className="mobile-item"><span className="icon">📈</span></NavLink>
                <NavLink to="/casino" className="mobile-item"><span className="icon">🎰</span></NavLink>
                <NavLink to="/system" className="mobile-item"><span className="icon">⚙️</span></NavLink>
            </nav>
        );
    }

    return (
        <nav className="cyber-nav">
            <div className="nav-brand">BOBCOIN_NET</div>
            <div className="nav-links">
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
