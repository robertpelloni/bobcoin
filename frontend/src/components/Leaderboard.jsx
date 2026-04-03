export function Leaderboard({ mintStatus }) {
    return (
        <div className="leaderboard-container" style={{ marginTop: '2rem' }}>
            <h2>GLOBAL LEADERBOARD</h2>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--primary-color)' }}>
                        <th>RANK</th>
                        <th>PLAYER</th>
                        <th>SCORE</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>1</td><td>player_x84...</td><td>14500</td></tr>
                    <tr><td>2</td><td>player_9z2...</td><td>12200</td></tr>
                    <tr><td>3</td><td>player_1a9...</td><td>9800</td></tr>
                </tbody>
            </table>
        </div>
    );
}