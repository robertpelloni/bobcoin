import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', color: '#ff0055', fontFamily: 'monospace' }}>
                    <h2>SYSTEM FAILURE</h2>
                    <p>A critical UI component crashed.</p>
                    <details style={{ whiteSpace: 'pre-wrap', background: '#111', padding: '1rem', marginTop: '1rem' }}>
                        {this.state.error && this.state.error.toString()}
                    </details>
                    <button 
                        className="cyber-button" 
                        style={{ marginTop: '2rem' }}
                        onClick={() => window.location.reload()}
                    >
                        REBOOT SYSTEM
                    </button>
                </div>
            );
        }

        return this.props.children; 
    }
}
