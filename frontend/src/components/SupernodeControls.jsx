import { useState } from 'react';
import { Tooltip } from './Tooltip';

export function SupernodeControls({ onAdd }) {
    const [magnet, setMagnet] = useState('');
    const [bandwidth, setBandwidth] = useState(100);

    const handleAdd = (e) => {
        e.preventDefault();
        if (magnet) {
            onAdd(magnet);
            setMagnet('');
        }
    };

    return (
        <div className="supernode-controls">
            <h2 style={{color: '#fff', borderBottom: '1px solid #333', paddingBottom: '0.5rem', marginBottom: '1.5rem'}}>NODE CONFIGURATION</h2>

            <form onSubmit={handleAdd} className="control-form">
                <div className="input-group">
                    <Tooltip text="Paste a Magnet URI (magnet:?xt=urn:btih:...) to start seeding content.">
                        <label style={{display: 'block', color: '#888', marginBottom: '0.5rem', fontSize: '0.8rem', cursor: 'help'}}>ADD MAGNET LINK ⓘ</label>
                    </Tooltip>
                    <div className="input-row" style={{display: 'flex', gap: '0.5rem'}}>
                        <input
                            type="text"
                            value={magnet}
                            onChange={(e) => setMagnet(e.target.value)}
                            placeholder="magnet:?xt=urn:btih:..."
                            className="cyber-input"
                            style={{flex: 1, background: '#111', border: '1px solid #333', color: '#0ff', padding: '0.5rem', fontFamily: 'monospace'}}
                        />
                        <button type="submit" className="cyber-button small" style={{fontSize: '0.8rem', padding: '0.5rem 1rem'}}>SEED</button>
                    </div>
                </div>
            </form>

            <div className="control-group" style={{marginTop: '1.5rem'}}>
                <div className="label-row" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                    <Tooltip text="Higher bandwidth increases your probability of being selected as a Validator.">
                        <label style={{color: '#888', fontSize: '0.8rem', cursor: 'help'}}>BANDWIDTH LIMIT (GLOBAL) ⓘ</label>
                    </Tooltip>
                    <span className="value" style={{color: '#0ff'}}>{bandwidth === 100 ? 'UNLIMITED' : `${bandwidth} MB/s`}</span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="100"
                    value={bandwidth}
                    onChange={(e) => setBandwidth(e.target.value)}
                    className="cyber-range"
                    style={{width: '100%'}}
                />
                <div className="info-text" style={{fontSize: '0.8rem', color: '#555', marginTop: '0.5rem'}}>
                    Restricts the maximum upload speed for the node.
                    Uncapped bandwidth increases Validator Probability.
                </div>
            </div>
        </div>
    );
}
