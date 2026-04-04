import { useEffect, useMemo, useState } from 'react';
import { getGoLatticeFrontier, getManifestAnchors } from '../api';
import { StorageWasmWorkbench } from '../components/StorageWasmWorkbench';
import './Vault.css';

export function Vault() {
    const [balance, setBalance] = useState(0);
    const [myAnchors, setMyAnchors] = useState([]);
    const [networkAnchors, setNetworkAnchors] = useState([]);
    const [keypair, setKeypair] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const storedKeys = localStorage.getItem('bobcoin_wallet');
        if (!storedKeys) {
            setLoading(false);
            return;
        }

        const kp = JSON.parse(storedKeys);
        setKeypair(kp);
        refresh(kp.publicKey);
    }, []);

    const refresh = async (pubkey) => {
        setLoading(true);
        setError('');
        try {
            const [frontier, mine, all] = await Promise.all([
                getGoLatticeFrontier(pubkey),
                getManifestAnchors(pubkey),
                getManifestAnchors(),
            ]);
            setBalance(frontier.balance || 0);
            setMyAnchors(mine.anchors || []);
            setNetworkAnchors(all.anchors || []);
        } catch (e) {
            console.error(e);
            setError('Could not load archive state from the Go lattice. Ensure the Go lattice node is running on port 4000.');
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        const totalSize = myAnchors.reduce((sum, anchor) => sum + (anchor.size || 0), 0);
        const published = myAnchors.filter(anchor => anchor.type === 'publish_manifest').length;
        const legacy = myAnchors.filter(anchor => anchor.type === 'data_anchor').length;
        return { totalSize, published, legacy };
    }, [myAnchors]);

    return (
        <div className="vault-container">
            <h1 className="glitch" data-text="CYBER VAULT">CYBER VAULT</h1>
            <p className="subtitle">GO-LATTICE ARCHIVE, MANIFEST PROVENANCE, AND BROWSER-SIDE STORAGE ROUND-TRIPS</p>

            <div className="vault-summary-grid">
                <StatCard label="LIQUID BALANCE" value={`${balance} BOB`} accent="#ffd700" />
                <StatCard label="MY MANIFEST ANCHORS" value={`${stats.published}`} accent="#0ff" />
                <StatCard label="LEGACY DATA ANCHORS" value={`${stats.legacy}`} accent="#f0f" />
                <StatCard label="ARCHIVED SIZE" value={`${(stats.totalSize / 1024).toFixed(2)} KB`} accent="#0f0" />
            </div>

            {error && <div className="vault-error">{error}</div>}
            {loading && <div className="vault-loading">LOADING SOVEREIGN ARCHIVE...</div>}

            <div className="vault-section">
                <div className="section-header-row">
                    <div>
                        <h2>YOUR ANCHORED ARCHIVE</h2>
                        <p className="section-copy">
                            These entries are the wallet-attributed on-chain anchors currently visible from the Go lattice. They link
                            your wallet identity to published manifest IDs, manifest URLs, and legacy anchored storage references.
                        </p>
                    </div>
                    {keypair && (
                        <button className="cyber-button small" onClick={() => refresh(keypair.publicKey)}>
                            REFRESH ARCHIVE
                        </button>
                    )}
                </div>

                <div className="anchor-grid">
                    {myAnchors.map(anchor => (
                        <AnchorCard key={anchor.blockHash} anchor={anchor} owned />
                    ))}
                    {!loading && myAnchors.length === 0 && (
                        <p className="empty">NO PERSONAL MANIFEST ANCHORS FOUND YET. PUBLISH OR ANCHOR A MANIFEST TO BEGIN BUILDING YOUR ARCHIVE.</p>
                    )}
                </div>
            </div>

            <StorageWasmWorkbench />

            <div className="vault-section">
                <h2>NETWORK MANIFEST STREAM</h2>
                <p className="section-copy">
                    The sovereign archive is no longer just a supernode-side registry. These records are the visible on-chain anchor
                    layer for published manifests and data anchors, giving operators a provenance-aware view of the storage network.
                </p>
                <div className="anchor-grid">
                    {networkAnchors.slice(0, 12).map(anchor => (
                        <AnchorCard key={anchor.blockHash} anchor={anchor} />
                    ))}
                    {!loading && networkAnchors.length === 0 && <p className="empty">NO NETWORK ANCHORS HAVE BEEN INDEXED YET.</p>}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, accent }) {
    return (
        <div className="vault-stat-card" style={{ borderColor: accent }}>
            <div className="vault-stat-label">{label}</div>
            <div className="vault-stat-value" style={{ color: accent }}>{value}</div>
        </div>
    );
}

function AnchorCard({ anchor, owned = false }) {
    const locator = anchor.locator || anchor.magnet || '';
    const manifestUrl = anchor.manifestUrl || '';
    const manifestId = anchor.manifestId || anchor.id || anchor.blockHash;
    const anchorType = anchor.type || 'anchor';

    return (
        <div className={`anchor-card ${owned ? 'owned' : ''}`}>
            <div className="anchor-icon">{anchorType === 'publish_manifest' ? '🧬' : '📄'}</div>
            <div className="file-info">
                <span className="file-name">{anchor.name || manifestId}</span>
                <span className="file-meta">
                    {(anchor.size || 0) > 0 ? `${(anchor.size / 1024).toFixed(2)} KB` : '0.00 KB'}
                    {' | '}
                    {anchorType.toUpperCase()}
                    {' | '}
                    OWNER: {(anchor.owner || 'UNKNOWN').slice(0, 12)}...
                </span>
                <span className="file-meta dim">BLOCK: {(anchor.blockHash || '').slice(0, 16)}...</span>
            </div>
            <div className="anchor-actions">
                {manifestUrl && (
                    <a href={manifestUrl} target="_blank" rel="noreferrer" className="cyber-button small">
                        MANIFEST
                    </a>
                )}
                {locator && (
                    <button className="cyber-button small secondary" onClick={() => navigator.clipboard.writeText(locator)}>
                        COPY LOCATOR
                    </button>
                )}
            </div>
        </div>
    );
}
