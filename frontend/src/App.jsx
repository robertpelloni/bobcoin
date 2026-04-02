import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Supernode } from './pages/Supernode';
import { Wallet } from './pages/Wallet';
import { Governance } from './pages/Governance';
import { Manual } from './pages/Manual';
import { SystemStatus } from './pages/SystemStatus';
import { Mobile } from './pages/Mobile';
import { StorageMarket } from './pages/StorageMarket';
import { Architecture } from './pages/Architecture';
import { Explorer } from './pages/Explorer';
import { ThemeToggle } from './components/ThemeToggle';
import { useSoundEffects } from './hooks/useSoundEffects';
import { useKonamiCode } from './hooks/useKonamiCode';
import { useEffect } from 'react';
import './App.css';

function App() {
    useSoundEffects();
    const konami = useKonamiCode();

    useEffect(() => {
        if (konami) {
            alert("CHEAT CODE ACTIVATED: GOD MODE (Theme Unlocked)");
            document.body.classList.add('god-mode');
        }
    }, [konami]);

    return (
        <BrowserRouter>
            <ThemeToggle />
            <Routes>
                <Route element={<Layout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/supernode" element={<Supernode />} />
                    <Route path="/wallet" element={<Wallet />} />
                    <Route path="/governance" element={<Governance />} />
                    <Route path="/market" element={<StorageMarket />} />
                    <Route path="/manual" element={<Manual />} />
                    <Route path="/system" element={<SystemStatus />} />
                    <Route path="/architecture" element={<Architecture />} />
                    <Route path="/explorer" element={<Explorer />} />
                    <Route path="/mobile" element={<Mobile />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
