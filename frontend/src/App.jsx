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
          <Route path="manual" element={<Manual />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;