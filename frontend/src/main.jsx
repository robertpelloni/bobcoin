import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
<<<<<<< HEAD
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { SplashScreen } from './components/SplashScreen.jsx'
=======
import { WalletContextProvider } from './components/WalletContextProvider.jsx'
>>>>>>> feature/comprehensive-ui-spec
import './index.css'
import { Buffer } from 'buffer';

// Polyfill Buffer for Solana and other libraries
if (typeof window !== 'undefined') {
    window.Buffer = Buffer;
}

// Polyfills for simple-peer
import { Buffer } from 'buffer';
window.global = window;
window.Buffer = Buffer;
window.process = { env: {} };

function Root() {
    const [booting, setBooting] = useState(true);

    return (
        <ErrorBoundary>
            {booting ? (
                <SplashScreen onComplete={() => setBooting(false)} />
            ) : (
                <App />
            )}
        </ErrorBoundary>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(
<<<<<<< HEAD
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
<<<<<<< Updated upstream
)
=======
)
>>>>>>> Stashed changes
