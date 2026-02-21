import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
// import '../App.css'; // App.css is imported in main.jsx usually, check that.

export function Layout() {
    return (
        <div className="app-layout">
            <Navigation />
            <main className="content-container">
                <Outlet />
            </main>
            <footer className="cyber-footer">
                <div className="scanline"></div>
                <p>BOBCOIN PROTOCOL v{__APP_VERSION__} // SYSTEM READY</p>
            </footer>
        </div>
    );
}
