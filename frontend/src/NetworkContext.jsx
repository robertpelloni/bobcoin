import React, { createContext, useContext, useState, useEffect } from 'react';
import { LATTICE_URL } from './api';

const NetworkContext = createContext();

export function NetworkProvider({ children }) {
    const [heartbeat, setHeartbeat] = useState(null);
    const [lastBlock, setLastBlock] = useState(null);
    const [identities, setIdentities] = useState({});
    const [trustScores, setTrustScores] = useState({});

    useEffect(() => {
        const wsUrl = LATTICE_URL.replace('http', 'ws') + '/heartbeat';
        let ws;

        const connect = () => {
            ws = new WebSocket(wsUrl);
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'NEW_BLOCK') {
                    setLastBlock(data.block);
                } else if (data.type === 'STATS' || !data.type) {
                    setHeartbeat(data);
                    if (data.identities) setIdentities(data.identities);
                    if (data.trustScores) setTrustScores(data.trustScores);
                }
            };
            ws.onclose = () => {
                setTimeout(connect, 3000);
            };
        };

        connect();
        return () => ws && ws.close();
    }, []);

    return (
        <NetworkContext.Provider value={{ heartbeat, lastBlock, identities, trustScores }}>
            {children}
        </NetworkContext.Provider>
    );
}

export function useNetwork() {
    return useContext(NetworkContext);
}
