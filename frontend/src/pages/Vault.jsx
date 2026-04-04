import { useEffect, useMemo, useState } from 'react';
import {
    getGoLatticeFrontier,
    getManifestAnchors,
    getLatticeFrontier,
    getLatticeChain,
    submitLatticeBlock,
    LATTICE_URL,
    SUPERNODE_URL,
} from '../api';
import { checkAndUnlock } from '../AchievementService';
import { Block } from '../Block';
import { encryptFileForVault } from '../cryptoUtils';
import { StorageWasmWorkbench } from '../components/StorageWasmWorkbench';
import './Vault.css';

function normalizeString(value) {
    return String(value || '').toLowerCase();
}

function short(value, length = 14) {
    if (!value) return 'UNKNOWN';
    return value.length > length ? `${value.slice(0, length)}...` : value;
}

function matchesSearch(anchor, query) {
    if (!query) return true;
    const haystack = [
        anchor.name,
        anchor.id,
        anchor.blockHash,
        anchor.owner,
        anchor.locator,
        anchor.magnet,
        anchor.manifestId,
        anchor.ciphertextHash,
        anchor.proofHash,
        anchor.type,
    ]
        .map(normalizeString)
        .join(' ');
    return haystack.includes(normalizeString(query));
}

export function Vault() {
    const [balance, setBalance] = useState(0);
    const [myAnchors, setMyAnchors] = useState([]);
    const [networkAnchors, setNetworkAnchors] = useState([]);
    const [legacyAnchors, setLegacyAnchors] = useState([]);
    const [keypair, setKeypair] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [cloakMode, setCloakMode] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [networkSearch, setNetworkSearch] = useState('');
    const [showOnlySigned, setShowOnlySigned] = useState(false);

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

    const ownedLegacyAnchors = useMemo(
        () => legacyAnchors.filter(anchor => anchor.owner === keypair?.publicKey),
        [legacyAnchors, keypair]
    );

    const filteredOwnedEntries = useMemo(() => {
        const combined = [
            ...myAnchors.map(anchor => ({ ...anchor, sourceKind: 'manifest' })),
            ...ownedLegacyAnchors.map(anchor => ({ ...anchor, sourceKind: 'legacy' })),
        ];

        return combined.filter(anchor => {
            const anchorType = anchor.type || (anchor.sourceKind === 'legacy' ? 'data_anchor' : 'publish_manifest');
            if (typeFilter !== 'all' && anchorType !== typeFilter) return false;
            if (showOnlySigned && !anchor.proofSignature && !anchor.cloaked) return false;
            return matchesSearch(anchor, search);
        });
    }, [myAnchors, ownedLegacyAnchors, search, typeFilter, showOnlySigned]);

    const filteredNetworkAnchors = useMemo(() => {
        return networkAnchors.filter(anchor => {
            if (showOnlySigned && !anchor.proofSignature) return false;
            return matchesSearch(anchor, networkSearch);
        });
    }, [networkAnchors, networkSearch, showOnlySigned]);

    const stats = useMemo(() => {
        const totalSize = ownedLegacyAnchors.reduce((sum, anchor) => sum + (anchor.size || anchor.originalSize || 0), 0);
        const published = myAnchors.filter(anchor => anchor.type === 'publish_manifest').length;
        const legacy = ownedLegacyAnchors.length;
        const signed = myAnchors.filter(anchor => anchor.proofSignature).length;
        return { totalSize, published, legacy, signed };
    }, [myAnchors, ownedLegacyAnchors]);

    const refresh = async (pubkey) => {
        setLoading(true);
        setError('');

        const [legacyFrontier, goFrontier, mine, all, legacy] = await Promise.allSettled([
            getLatticeFrontier(pubkey),
            getGoLatticeFrontier(pubkey),
            getManifestAnchors(pubkey),
            getManifestAnchors(),
            fetch(`${LATTICE_URL}/anchors`).then(r => r.json()),
        ]);

        if (legacyFrontier.status === 'fulfilled') {
            setBalance(legacyFrontier.value.balance || 0);
        } else if (goFrontier.status === 'fulfilled') {
            setBalance(goFrontier.value.balance || 0);
        } else {
            setBalance(0);
        }

        setMyAnchors(mine.status === 'fulfilled' ? (mine.value.anchors || []) : []);
        setNetworkAnchors(all.status === 'fulfilled' ? (all.value.anchors || []) : []);
        setLegacyAnchors(legacy.status === 'fulfilled' ? (legacy.value.anchors || []) : []);

        if (mine.status === 'rejected' || all.status === 'rejected') {
            setError('Manifest archive data from the Go lattice is unavailable right now. Legacy data anchors remain accessible.');
        }

        setLoading(false);
    };

    const handleUpload = async () => {
        if (!file) return alert('Select a file first');
        if (!keypair?.publicKey || !keypair?.privateKey) return alert('Unlock your sovereign vault first');
        if (balance < 10) return alert('Insufficient balance for storage fee (10 BOB)');

        setUploading(true);
        try {
            let fileToUpload = file;
            const anchorPayload = {
                name: file.name,
                type: 'data_anchor',
                originalType: file.type || 'application/octet-stream',
                originalSize: file.size,
                cloaked: false,
            };

            if (cloakMode) {
                const fileBytes = new Uint8Array(await file.arrayBuffer());
                const encrypted = await encryptFileForVault(fileBytes, keypair.privateKey);
                fileToUpload = new File([encrypted.ciphertext], `${file.name}.bob`, { type: 'application/octet-stream' });

                anchorPayload.cloaked = true;
                anchorPayload.algorithm = encrypted.algorithm;
                anchorPayload.iv = encrypted.iv;
                anchorPayload.salt = encrypted.salt;
                anchorPayload.owner = keypair.publicKey;
            }

            const formData = new FormData();
            formData.append('file', fileToUpload);

            const upRes = await fetch(`${SUPERNODE_URL}/upload`, {
                method: 'POST',
                body: formData,
            }).then(r => r.json());

            if (!upRes.success) throw new Error('Supernode upload failed');

            const frontier = await getLatticeFrontier(keypair.publicKey);
            const chain = await getLatticeChain(keypair.publicKey);

            const block = new Block({
                type: 'data_anchor',
                account: keypair.publicKey,
                previous: frontier.frontier,
                balance: balance - 10,
                staked_balance: frontier.staked_balance || 0,
                link: 'DATA_ANCHOR',
                payload: {
                    ...anchorPayload,
                    magnet: upRes.magnet,
                    size: upRes.size,
                },
                height: chain.chain.length,
            });

            await block.signBlock(keypair.privateKey);
            const res = await submitLatticeBlock(block);

            if (!res.success) throw new Error(res.error || 'Anchoring failed');

            setFile(null);
            await refresh(keypair.publicKey);
            await checkAndUnlock('DATA_ARCHITECT', keypair, chain.chain || []);
            if (cloakMode) {
                await checkAndUnlock('VAULT_ENCRYPTOR', keypair, chain.chain || []);
            }

            alert(cloakMode ? 'Legacy data anchor published with cloak mode enabled.' : 'Legacy data anchor published to the lattice.');
        } catch (e) {
            alert(e.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="vault-container">
            <h1 className="glitch" data-text="CYBER VAULT">CYBER VAULT</h1>
            <p className="subtitle">GO-LATTICE ARCHIVE, MANIFEST PROVENANCE, LEGACY DATA ANCHORS, DISCOVERY, AND BROWSER-SIDE STORAGE ROUND-TRIPS</p>

            <div className="vault-summary-grid">
                <StatCard label="LIQUID BALANCE" value={`${balance} BOB`} accent="#ffd700" />
                <StatCard label="MY MANIFEST ANCHORS" value={`${stats.published}`} accent="#0ff" />
                <StatCard label="MY SIGNED ANCHORS" value={`${stats.signed}`} accent="#7dff7d" />
                <StatCard label="MY LEGACY DATA ANCHORS" value={`${stats.legacy}`} accent="#f0f" />
                <StatCard label="LEGACY ARCHIVED SIZE" value={`${(stats.totalSize / 1024).toFixed(2)} KB`} accent="#0f0" />
            </div>

            <div className="vault-section">
                <h2>ARCHIVE DISCOVERY CONTROLS</h2>
                <p className="section-copy">
                    Search by filename, owner, locator, manifest ID, ciphertext hash, proof hash, or block hash. Filter the archive by anchor type
                    and signed provenance to quickly locate trustworthy assets across the sovereign storage mesh.
                </p>
                <div className="vault-filters-grid">
                    <input
                        className="cyber-input"
                        placeholder="SEARCH YOUR ARCHIVE..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select className="cyber-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="all">ALL TYPES</option>
                        <option value="publish_manifest">MANIFEST ANCHORS</option>
                        <option value="data_anchor">LEGACY DATA ANCHORS</option>
                    </select>
                    <label className="vault-checkbox-row">
                        <input type="checkbox" checked={showOnlySigned} onChange={() => setShowOnlySigned(!showOnlySigned)} />
                        <span>SIGNED / PROVENANCE-RICH ONLY</span>
                    </label>
                    <input
                        className="cyber-input"
                        placeholder="SEARCH NETWORK STREAM..."
                        value={networkSearch}
                        onChange={(e) => setNetworkSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="vault-section">
                <h2>LEGACY DATA ANCHOR PUBLISHER</h2>
                <p className="section-copy">
                    This compatibility panel preserves direct data-anchor uploads while the newer manifest pipeline matures. Cloak Mode encrypts
                    raw file bytes in the browser before they are uploaded to the network.
                </p>
                <div className="vault-toggle-row">
                    <span className={`vault-toggle-label ${cloakMode ? 'active' : ''}`} title="Enable client-side AES-256-GCM encryption before upload.">
                        CLOAK MODE (AES-256-GCM)
                    </span>
                    <button
                        className={`toggle-btn ${cloakMode ? 'active' : ''}`}
                        onClick={() => setCloakMode(!cloakMode)}
                        title="When enabled, the file is encrypted in your browser before it reaches the network."
                        type="button"
                    >
                        {cloakMode ? 'ON' : 'OFF'}
                    </button>
                </div>
                <p className="fee" title="Anchoring data consumes 10 BOB and writes immutable metadata to the lattice.">
                    STORAGE FEE: 10.00 BOB
                </p>
                <div className="drop-zone" title="Select a file to anchor to the decentralized storage mesh.">
                    <input type="file" onChange={e => setFile(e.target.files[0])} />
                    <p>{file ? file.name : 'DRAG AND DROP OR CLICK TO UPLOAD'}</p>
                </div>
                <button
                    className="cyber-button"
                    onClick={handleUpload}
                    disabled={uploading || !file}
                    title="Upload the file to the supernode and anchor its metadata on the lattice."
                >
                    {uploading ? 'ANCHORING...' : 'ANCHOR LEGACY DATA'}
                </button>
            </div>

            {error && <div className="vault-error">{error}</div>}
            {loading && <div className="vault-loading">LOADING SOVEREIGN ARCHIVE...</div>}

            <div className="vault-section">
                <div className="section-header-row">
                    <div>
                        <h2>YOUR ANCHORED ARCHIVE</h2>
                        <p className="section-copy">
                            These entries combine Go-lattice manifest anchors with legacy data-anchor records owned by the current wallet.
                            You can now search, filter, and inspect provenance-rich archive records from a single surface.
                        </p>
                    </div>
                    {keypair && (
                        <button className="cyber-button small" onClick={() => refresh(keypair.publicKey)}>
                            REFRESH ARCHIVE
                        </button>
                    )}
                </div>

                <div className="anchor-grid">
                    {filteredOwnedEntries.map(anchor => (
                        anchor.sourceKind === 'legacy'
                            ? <LegacyAnchorCard key={anchor.id} anchor={anchor} />
                            : <AnchorCard key={anchor.blockHash || anchor.id} anchor={anchor} owned />
                    ))}
                    {!loading && filteredOwnedEntries.length === 0 && (
                        <p className="empty">NO PERSONAL ARCHIVE ENTRIES MATCH THE CURRENT FILTERS.</p>
                    )}
                </div>
            </div>

            <StorageWasmWorkbench />

            <div className="vault-section">
                <h2>NETWORK MANIFEST STREAM</h2>
                <p className="section-copy">
                    The sovereign archive is no longer just a supernode-side registry. These records are the visible on-chain anchor layer for
                    published manifests and data anchors, giving operators a provenance-aware view of the storage network.
                </p>
                <div className="anchor-grid">
                    {filteredNetworkAnchors.slice(0, 12).map(anchor => (
                        <AnchorCard key={anchor.blockHash || anchor.id} anchor={anchor} />
                    ))}
                    {!loading && filteredNetworkAnchors.length === 0 && <p className="empty">NO NETWORK ANCHORS MATCH THE CURRENT FILTERS.</p>}
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

function ProvenanceBadge({ anchor }) {
    const isSigned = !!anchor.proofSignature;
    return (
        <div className="provenance-row">
            <span className={`vault-badge ${isSigned ? 'signed' : 'unsigned'}`}>{isSigned ? 'SIGNED' : 'UNSIGNED'}</span>
            {anchor.ciphertextHash && <span className="vault-badge neutral">CIPHERTEXT</span>}
            {anchor.locator && <span className="vault-badge neutral">LOCATOR</span>}
            {anchor.cloaked && <span className="vault-badge cloaked">CLOAKED</span>}
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
            <div className="anchor-icon">{anchorType === 'publish_manifest' ? 'MANIFEST' : 'ANCHOR'}</div>
            <div className="file-info">
                <span className="file-name">{anchor.name || manifestId}</span>
                <span className="file-meta">
                    {(anchor.size || 0) > 0 ? `${(anchor.size / 1024).toFixed(2)} KB` : '0.00 KB'}
                    {' | '}
                    {anchorType.toUpperCase()}
                    {' | '}
                    OWNER: {short(anchor.owner)}
                </span>
                <span className="file-meta dim">MANIFEST: {short(manifestId, 20)} | BLOCK: {short(anchor.blockHash || anchor.id, 18)}</span>
                {anchor.proofHash && <span className="file-meta dim">PROOF HASH: {short(anchor.proofHash, 24)}</span>}
                {anchor.ciphertextHash && <span className="file-meta dim">CIPHERTEXT HASH: {short(anchor.ciphertextHash, 24)}</span>}
                <ProvenanceBadge anchor={anchor} />
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
                {anchor.owner && (
                    <button className="cyber-button small secondary" onClick={() => navigator.clipboard.writeText(anchor.owner)}>
                        COPY OWNER
                    </button>
                )}
            </div>
        </div>
    );
}

function LegacyAnchorCard({ anchor }) {
    return (
        <div className="anchor-card legacy-owned">
            <div className="file-icon">{anchor.cloaked ? 'LOCKED' : 'FILE'}</div>
            <div className="file-info">
                <span className="file-name">
                    {anchor.name}
                    {anchor.cloaked && <span className="vault-badge cloaked">CLOAKED</span>}
                </span>
                <span className="file-meta">
                    {(Number(anchor.size || anchor.originalSize || 0) / 1024).toFixed(2)} KB
                    {' | '}
                    DATA_ANCHOR
                    {' | '}
                    OWNER: {short(anchor.owner)}
                </span>
                <span className="file-meta dim">ID: {short(anchor.id, 18)}</span>
                <ProvenanceBadge anchor={anchor} />
            </div>
            <div className="anchor-actions">
                {anchor.magnet && (
                    <a href={anchor.magnet} className="cyber-button small">
                        MAGNET
                    </a>
                )}
            </div>
        </div>
    );
}
