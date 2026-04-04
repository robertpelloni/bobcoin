import { useEffect, useMemo, useState } from 'react';
import { publishStorageManifest, uploadStorageShard } from '../api';
import { createStorageWasmClient, probeStorageWasmAvailability, sha256Hex } from '../lib/storageWasm';

function downloadJson(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function uint8ArrayToBase64(bytes) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

export function StorageWasmWorkbench() {
    const [runtimeStatus, setRuntimeStatus] = useState('checking');
    const [runtimeError, setRuntimeError] = useState('');
    const [file, setFile] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [manifest, setManifest] = useState(null);
    const [preparedShards, setPreparedShards] = useState([]);
    const [copyState, setCopyState] = useState('idle');
    const [publishState, setPublishState] = useState('');
    const [publishedResult, setPublishedResult] = useState(null);

    useEffect(() => {
        let active = true;
        probeStorageWasmAvailability().then(result => {
            if (!active) return;
            setRuntimeStatus(result.available ? 'ready' : 'offline');
            setRuntimeError(result.error || '');
        });
        return () => {
            active = false;
        };
    }, []);

    const shardPreview = useMemo(() => manifest?.erasure?.shards?.slice(0, 3) || [], [manifest]);

    const handlePrepare = async () => {
        if (!file) {
            alert('Select a file first.');
            return;
        }

        setProcessing(true);
        setCopyState('idle');
        setPublishState('');
        setPublishedResult(null);

        try {
            const client = await createStorageWasmClient();
            const raw = new Uint8Array(await file.arrayBuffer());
            const encrypted = client.encrypt(raw);
            const shards = client.encodeErasure(encrypted.blob);
            const encryptedHash = await sha256Hex(encrypted.blob);
            const shardHashes = await Promise.all(shards.map(shard => sha256Hex(shard)));

            const preparedManifest = {
                format: 'bobtorrent-wasm-manifest-v1',
                generatedAt: new Date().toISOString(),
                source: {
                    name: file.name,
                    size: file.size,
                    mime: file.type || 'application/octet-stream',
                },
                encryption: {
                    algorithm: 'ChaCha20-Poly1305',
                    key: encrypted.key,
                    nonce: encrypted.nonce,
                    ciphertextHash: encryptedHash,
                    ciphertextSize: encrypted.blob.length,
                },
                erasure: {
                    dataShards: 4,
                    parityShards: 2,
                    totalShards: shards.length,
                    shards: shardHashes.map((hash, index) => ({
                        index,
                        hash,
                        size: shards[index]?.length || 0,
                    })),
                },
                experimentalLocator: `bobtorrent://manifest/${encryptedHash}`,
                notes: [
                    'This manifest was generated entirely in the browser via the Go storage WASM kernel.',
                    'Encryption and erasure coding completed client-side before any network upload.',
                    'The next step is to push the prepared shards and manifest into the Go supernode publication registry.',
                ],
            };

            setPreparedShards(shards);
            setManifest(preparedManifest);
        } catch (error) {
            console.error(error);
            alert(`Storage WASM preprocessing failed: ${error.message}`);
        } finally {
            setProcessing(false);
        }
    };

    const handlePublish = async () => {
        if (!manifest || preparedShards.length === 0) {
            alert('Prepare a file before publishing.');
            return;
        }

        setPublishing(true);
        setPublishState('Uploading shards to the Go supernode...');

        try {
            for (let i = 0; i < preparedShards.length; i++) {
                const shard = preparedShards[i];
                const shardMeta = manifest.erasure.shards[i];
                setPublishState(`Uploading shard ${i + 1} / ${preparedShards.length}...`);
                await uploadStorageShard({
                    hash: shardMeta.hash,
                    data: uint8ArrayToBase64(shard),
                });
            }

            setPublishState('Publishing manifest registry entry...');
            const published = await publishStorageManifest(manifest);
            setManifest(published.manifest || manifest);
            setPublishedResult(published);
            setPublishState('Manifest published to Go supernode registry.');
        } catch (error) {
            console.error(error);
            setPublishState('');
            alert(`Publishing failed: ${error.message}`);
        } finally {
            setPublishing(false);
        }
    };

    const handleCopy = async () => {
        if (!manifest) return;
        try {
            await navigator.clipboard.writeText(JSON.stringify(manifest, null, 2));
            setCopyState('copied');
            setTimeout(() => setCopyState('idle'), 1500);
        } catch {
            setCopyState('failed');
            setTimeout(() => setCopyState('idle'), 1500);
        }
    };

    return (
        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.65)', border: '1px solid #333' }}>
            <h2 style={{ color: '#0ff', marginTop: 0 }}>BROWSER STORAGE KERNEL (GO WASM)</h2>
            <p style={{ color: '#888', lineHeight: 1.6 }}>
                This workbench runs the Go Bobtorrent storage kernel directly in the browser. It encrypts the selected file with
                ChaCha20-Poly1305, shards it with Reed-Solomon (4+2), and can now publish the prepared shards and manifest into the
                Go supernode registry.
            </p>

            <div style={{ marginBottom: '1rem', color: runtimeStatus === 'ready' ? '#0f0' : runtimeStatus === 'checking' ? '#ff0' : '#ff0055' }}>
                RUNTIME STATUS: <strong>{runtimeStatus.toUpperCase()}</strong>
                {runtimeError && <div style={{ color: '#ff8888', marginTop: '0.4rem', fontSize: '0.85rem' }}>{runtimeError}</div>}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="cyber-input"
                    style={{ flex: 1, minWidth: '280px' }}
                />
                <button className="cyber-button" onClick={handlePrepare} disabled={processing || runtimeStatus !== 'ready'}>
                    {processing ? 'PROCESSING...' : 'PREPARE FILE'}
                </button>
                <button className="cyber-button" onClick={handlePublish} disabled={publishing || processing || !manifest || preparedShards.length === 0}>
                    {publishing ? 'PUBLISHING...' : 'PUBLISH TO SUPERNODE'}
                </button>
            </div>

            {publishState && (
                <div style={{ marginBottom: '1rem', color: '#0ff', fontSize: '0.9rem' }}>{publishState}</div>
            )}

            {file && (
                <div style={{ marginBottom: '1rem', color: '#aaa', fontSize: '0.9rem' }}>
                    FILE: <strong style={{ color: '#fff' }}>{file.name}</strong> · {(file.size / 1024).toFixed(2)} KB
                </div>
            )}

            {manifest && (
                <div style={{ borderTop: '1px solid #222', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <h3 style={{ color: '#fff', margin: 0 }}>PREPROCESSING MANIFEST</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button className="cyber-button small" onClick={() => downloadJson(`${manifest.source.name}.manifest.json`, manifest)}>
                                DOWNLOAD MANIFEST
                            </button>
                            <button className="cyber-button small" onClick={handleCopy}>
                                {copyState === 'copied' ? 'COPIED' : copyState === 'failed' ? 'COPY FAILED' : 'COPY JSON'}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                        <Metric label="Ciphertext Size" value={`${(manifest.encryption.ciphertextSize / 1024).toFixed(2)} KB`} />
                        <Metric label="Shard Layout" value={`${manifest.erasure.dataShards}+${manifest.erasure.parityShards}`} />
                        <Metric label="Total Shards" value={`${manifest.erasure.totalShards}`} />
                        <Metric label="Locator" value={(manifest.locator || manifest.experimentalLocator).slice(0, 32) + '...'} />
                    </div>

                    {publishedResult && (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: '#091109', border: '1px solid #0f0' }}>
                            <div style={{ color: '#0f0', fontWeight: 700, marginBottom: '0.5rem' }}>SUPERNODE PUBLICATION COMPLETE</div>
                            <div style={{ color: '#bbb', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                                LOCATOR: <code style={{ color: '#fff' }}>{publishedResult.locator}</code>
                            </div>
                            <div style={{ color: '#bbb', fontSize: '0.9rem' }}>
                                MANIFEST URL: <a href={publishedResult.manifestUrl} target="_blank" rel="noreferrer" style={{ color: '#0ff' }}>{publishedResult.manifestUrl}</a>
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#0b0b0b', border: '1px solid #1e1e1e' }}>
                        <div style={{ color: '#888', marginBottom: '0.5rem' }}>ENCRYPTED BLOB HASH</div>
                        <code style={{ color: '#0ff', wordBreak: 'break-all' }}>{manifest.encryption.ciphertextHash}</code>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ color: '#888', marginBottom: '0.5rem' }}>SHARD PREVIEW</div>
                        {shardPreview.map(shard => (
                            <div key={shard.index} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.45rem 0', borderBottom: '1px solid #151515', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                <span style={{ color: '#fff' }}>#{shard.index}</span>
                                <span style={{ color: '#888', flex: 1 }}>{shard.hash.slice(0, 28)}...</span>
                                <span style={{ color: '#0ff' }}>{shard.size} bytes</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function Metric({ label, value }) {
    return (
        <div style={{ padding: '0.9rem', background: '#101010', border: '1px solid #202020' }}>
            <div style={{ color: '#777', fontSize: '0.78rem', marginBottom: '0.35rem' }}>{label}</div>
            <div style={{ color: '#fff', fontWeight: 700, wordBreak: 'break-word' }}>{value}</div>
        </div>
    );
}
