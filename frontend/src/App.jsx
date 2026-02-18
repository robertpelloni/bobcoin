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
import { ThemeToggle } from './components/ThemeToggle';
import './App.css';

function App() {
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
                    <Route path="/mobile" element={<Mobile />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
