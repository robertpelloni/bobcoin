export function Mobile() {
    return (
        <div className="mobile-container">
            <h1 className="glitch" data-text="MOBILE MINING">MOBILE MINING</h1>

            <div className="construction-notice">
                <span className="icon">🚧</span>
                <h2>UNDER CONSTRUCTION</h2>
                <p>
                    The Bobcoin Mobile Light Node (React Native) is currently in development.
                    Soon you will be able to "Mine while Charging" using your phone's unused storage.
                </p>
            </div>

            <div className="roadmap-preview">
                <h3>PLANNED FEATURES</h3>
                <ul>
                    <li>Background Storage Mining</li>
                    <li>Step-Counter Proof of Walk (Integration with HealthKit)</li>
                    <li>NFC Payments for Arcade Machines</li>
                </ul>
            </div>
        </div>
    );
}
