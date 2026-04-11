// mobile/components/Miner.js
// Logic for background mining simulation (React Native doesn't support WebTorrent fully natively yet)

import { useState, useEffect } from 'react';

export const useMiner = () => {
    const [isMining, setIsMining] = useState(false);
    const [hashRate, setHashRate] = useState(0);
    const [storageUsed, setStorageUsed] = useState(0);

    useEffect(() => {
        let interval;
        if (isMining) {
            // Simulate variable hashrate
            interval = setInterval(() => {
                setHashRate(Math.floor(Math.random() * 50) + 100); // 100-150 H/s
                setStorageUsed(prev => Math.min(prev + 0.1, 1024)); // Cap at 1GB
            }, 1000);
        } else {
            setHashRate(0);
        }
        return () => clearInterval(interval);
    }, [isMining]);

    const toggleMining = () => setIsMining(!isMining);

    return {
        isMining,
        hashRate,
        storageUsed,
        toggleMining
    };
};
