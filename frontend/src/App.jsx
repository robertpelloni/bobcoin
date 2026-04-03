import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Wallet } from './pages/Wallet';
import { Governance } from './pages/Governance';
import { Mobile } from './pages/Mobile';
import { StorageMarket } from './pages/StorageMarket';
import { Supernode } from './pages/Supernode';
import { SystemStatus } from './pages/SystemStatus';
import { Explorer } from './pages/Explorer';
import { Trophies } from './pages/Trophies';
import { Casino } from './pages/Casino';
import { Swap } from './pages/Swap';
import { Gallery } from './pages/Gallery';
import { Staking } from './pages/Staking';
import { Manual } from './pages/Manual';

function App() {
  return (
    <Router>
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
          <Route path="manual" element={<Manual />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;