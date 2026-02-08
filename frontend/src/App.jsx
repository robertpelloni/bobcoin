import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Supernode } from './pages/Supernode';
import { Wallet } from './pages/Wallet';
import { Governance } from './pages/Governance';
import { Manual } from './pages/Manual';
import { SystemStatus } from './pages/SystemStatus';
import './App.css';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<Layout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/supernode" element={<Supernode />} />
                    <Route path="/wallet" element={<Wallet />} />
                    <Route path="/governance" element={<Governance />} />
                    <Route path="/manual" element={<Manual />} />
                    <Route path="/system" element={<SystemStatus />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
