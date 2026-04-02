import { useState, useEffect } from 'react';
import './NewsTicker.css';

const NEWS_ITEMS = [
    "BOBCOIN MAINET LAUNCH IMMINENT...",
    "NEW SUPERNODE DETECTED IN SECTOR 7...",
    "WHALE ALERT: 10,000 BOB MOVED TO COLD STORAGE...",
    "VOTING OPEN: PROPOSAL #42 'INCREASE BLOCK SIZE'...",
    "DAILY QUEST: SCORE 50,000 POINTS FOR 2X REWARDS...",
    "SYSTEM STATUS: OPTIMAL | TPS: 10,240 | VALIDATORS: 128"
];

export function NewsTicker() {
    const [offset, setOffset] = useState(0);

    return (
        <div className="news-ticker-container">
            <div className="ticker-label">LATEST INTEL //</div>
            <div className="ticker-track">
                <div className="ticker-content">
                    {NEWS_ITEMS.join('  +++  ')}  +++  {NEWS_ITEMS.join('  +++  ')}
                </div>
            </div>
        </div>
    );
}
