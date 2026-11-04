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
    // If running in automated tests or already booted, skip splash screen
    const [booting, setBooting] = useState(() => {
        return !sessionStorage.getItem('lattice_booted') && !window.navigator.webdriver;
    });

    const handleComplete = () => {
        sessionStorage.setItem('lattice_booted', 'true');
        setBooting(false);
    };

    return (
        <ErrorBoundary>
            {booting ? (
                <SplashScreen onComplete={handleComplete} />
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