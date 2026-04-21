import { useState, useEffect } from 'react';
import './Architecture.css';

const MODULES = [
    { name: 'Frontend', version: '2.1.0', path: '/frontend', tech: 'React 18 + Vite', status: 'ONLINE' },
    { name: 'Game Server', version: '2.1.0', path: '/game-server', tech: 'Node.js + SQLite', status: 'ONLINE' },
    { name: 'Supernode', version: '1.2.0', path: '/supertorrent', tech: 'WebTorrent + Express', status: 'ONLINE' },
    { name: 'Mobile App', version: '1.1.0', path: '/mobile', tech: 'React Native (Expo)', status: 'SIMULATED' },
    { name: 'ZK Service', version: '0.1.0', path: '/proof-of-play', tech: 'SP1 (Rust)', status: 'MOCKED' }
];

export function Architecture() {
    return (
        <div className="architecture-container">
            <h1 className="glitch" data-text="SYSTEM ARCHITECTURE">SYSTEM ARCHITECTURE</h1>

            <div className="arch-diagram">
                <div className="layer layer-ui">
                    <div className="module frontend">FRONTEND (UI)</div>
                    <div className="module mobile">MOBILE (App)</div>
                </div>
                <div className="connector">⬇ HTTP / WebSocket ⬇</div>
                <div className="layer layer-api">
                    <div className="module game-server">GAME SERVER (API)</div>
                </div>
                <div className="connector">⬇ P2P / RPC ⬇</div>
                <div className="layer layer-core">
                    <div className="module supernode">SUPERNODE (Storage)</div>
                    <div className="module zk">ZK SERVICE (Proof)</div>
                </div>
            </div>

            <div className="modules-list">
                <h3>MODULE STATUS REGISTRY</h3>
                <table>
                    <thead>
                        <tr>
                            <th>MODULE</th>
                            <th>VERSION</th>
                            <th>PATH</th>
                            <th>STACK</th>
                            <th>STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {MODULES.map(m => (
                            <tr key={m.name}>
                                <td style={{fontWeight: 'bold', color: '#0ff'}}>{m.name}</td>
                                <td>v{m.version}</td>
                                <td style={{fontFamily: 'monospace', color: '#888'}}>{m.path}</td>
                                <td>{m.tech}</td>
                                <td className={`status-${m.status.toLowerCase()}`}>{m.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
