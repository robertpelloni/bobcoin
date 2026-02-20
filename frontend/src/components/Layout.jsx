import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import { NewsTicker } from './NewsTicker';

export function Layout() {
    return (
        <div className="app-layout">
            <NewsTicker />
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
