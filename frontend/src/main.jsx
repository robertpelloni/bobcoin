import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { WalletContextProvider } from './components/WalletContextProvider.jsx'
import './index.css'
import { Buffer } from 'buffer';

// Polyfill Buffer for Solana and other libraries
if (typeof window !== 'undefined') {
    window.Buffer = Buffer;
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <WalletContextProvider>
            <App />
        </WalletContextProvider>
    </React.StrictMode>,
)
