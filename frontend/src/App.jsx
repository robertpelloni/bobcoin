import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
<<<<<<< HEAD
import { NetworkProvider } from './NetworkContext';

const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Wallet = lazy(() => import('./pages/Wallet').then(module => ({ default: module.Wallet })));
const Governance = lazy(() => import('./pages/Governance').then(module => ({ default: module.Governance })));
const Mobile = lazy(() => import('./pages/Mobile').then(module => ({ default: module.Mobile })));
const StorageMarket = lazy(() => import('./pages/StorageMarket').then(module => ({ default: module.StorageMarket })));
const Supernode = lazy(() => import('./pages/Supernode').then(module => ({ default: module.Supernode })));
const SystemStatus = lazy(() => import('./pages/SystemStatus').then(module => ({ default: module.SystemStatus })));
const Explorer = lazy(() => import('./pages/Explorer').then(module => ({ default: module.Explorer })));
const Trophies = lazy(() => import('./pages/Trophies').then(module => ({ default: module.Trophies })));
const Casino = lazy(() => import('./pages/Casino').then(module => ({ default: module.Casino })));
const Swap = lazy(() => import('./pages/Swap').then(module => ({ default: module.Swap })));
const Gallery = lazy(() => import('./pages/Gallery').then(module => ({ default: module.Gallery })));
const Staking = lazy(() => import('./pages/Staking').then(module => ({ default: module.Staking })));
const DEX = lazy(() => import('./pages/DEX').then(module => ({ default: module.DEX })));
const Vault = lazy(() => import('./pages/Vault').then(module => ({ default: module.Vault })));
const MultiSig = lazy(() => import('./pages/MultiSig').then(module => ({ default: module.MultiSig })));
const Manual = lazy(() => import('./pages/Manual').then(module => ({ default: module.Manual })));

function RouteFallback() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#0ff', letterSpacing: '2px' }}>
      LOADING SOVEREIGN MODULE...
    </div>
  );
=======
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
>>>>>>> feature/comprehensive-ui-spec
}

function App() {
  return (
    <NetworkProvider>
      <Router>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="wallet" element={<Wallet />} />
              <Route path="governance" element={<Governance />} />
              <Route path="mobile" element={<Mobile />} />
              <Route path="market" element={<StorageMarket />} />
              <Route path="supernode" element={<Supernode />} />
              <Route path="system" element={<SystemStatus />} />
              <Route path="explorer" element={<Explorer />} />
              <Route path="trophies" element={<Trophies />} />
              <Route path="casino" element={<Casino />} />
              <Route path="swap" element={<Swap />} />
              <Route path="gallery" element={<Gallery />} />
              <Route path="staking" element={<Staking />} />
              <Route path="dex" element={<DEX />} />
              <Route path="vault" element={<Vault />} />
              <Route path="multisig" element={<MultiSig />} />
              <Route path="manual" element={<Manual />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </NetworkProvider>
  );
}

export default App;
