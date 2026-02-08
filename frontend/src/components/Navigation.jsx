import { NavLink } from 'react-router-dom';
import './Navigation.css';

export function Navigation() {
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
            </div>
            <div className="nav-status">ONLINE</div>
        </nav>
    );
}
