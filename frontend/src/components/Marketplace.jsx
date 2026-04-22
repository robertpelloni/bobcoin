import './Marketplace.css';

export function Marketplace() {
    return (
        <div className="marketplace-container">
            <h2>MARKETPLACE</h2>
            <div className="marketplace-grid">
                <div className="market-item">
                    <h3>CYBER THEME</h3>
                    <p>Unlock new UI colors</p>
                    <button className="cyber-button">BUY (50 BOB)</button>
                </div>
            </div>
        </div>
    );
}