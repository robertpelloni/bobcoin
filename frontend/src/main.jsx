import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { SplashScreen } from './components/SplashScreen.jsx'
import './index.css'

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
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)