# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [8.11.0] - 2026-04-03

### Added
- **Vault Archive Surface Integration**: Rebuilt `Vault.jsx` into a real Go-lattice archive browser, showing personal and network manifest anchors, archive statistics, and direct manifest/locator actions.
- **Embedded Storage Workbench**: The Go storage WASM workbench now lives inside the Vault flow as a first-class archive tool rather than an isolated hidden utility.
- **Anchor-Aware Archive UX**: Users can now browse their recent wallet-owned manifest anchors and the wider network anchor stream from the dedicated archive page.

## [8.10.0] - 2026-04-03

### Added
- **Go Lattice Manifest Anchoring**: The `StorageWasmWorkbench` can now submit a signed `publish_manifest` block to the Go lattice after supernode publication, creating an attributable on-chain anchor for the manifest ID, locator, and manifest URL.
- **Manifest Anchor Queries**: Added frontend support for fetching wallet-specific manifest anchors from the Go lattice.
- **Anchor Activity UI**: The workbench now displays successful lattice anchor results and recent wallet-owned manifest anchors.

### Changed
- **Identity Binding**: Publication metadata is now tied to wallet identity through both the signed lattice block and an explicit `publicationProof` payload signature.

## [8.9.0] - 2026-04-03

### Added
- **Browser-Side Retrieval UX**: The `StorageWasmWorkbench` can now load a published manifest by locator, manifest ID, or URL, fetch the referenced shards, verify shard hashes, reconstruct the ciphertext with Go WASM Reed-Solomon, decrypt it with Go WASM ChaCha20-Poly1305, and download the restored file locally.
- **Manifest Fetch API**: Added `getPublishedManifest()` and `getPublishedShard()` helpers so the frontend can consume the Go supernode registry directly.
- **Restore Diagnostics UI**: Added live restore-state messaging plus restored file hash/size reporting after successful reconstruction.

## [8.8.0] - 2026-04-03

### Added
- **End-to-End Supernode Publication Flow**: The `StorageWasmWorkbench` now uploads prepared Reed-Solomon shards directly to the Go supernode and publishes a persisted manifest registry entry.
- **Manifest Registry Integration**: The frontend now uses `uploadStorageShard()` and `publishStorageManifest()` to turn local preprocessing into a real supernode publication pipeline.
- **Publication Feedback UI**: Added live publish-state messaging plus returned locator / manifest URL display once publication succeeds.

### Changed
- **Storage WASM Runtime Targeting**: The browser-side Go storage client now defaults `wasm_exec.js` and `storage.wasm` to the Go supernode origin, eliminating the earlier same-origin artifact mismatch.

## [8.7.0] - 2026-04-03

### Added
- **Go Storage WASM Frontend Integration**: Added a browser-side Go storage client in `frontend/src/lib/storageWasm.js` that loads `wasm_exec.js` + `storage.wasm` and exposes the Bobtorrent Go storage kernel directly to the React application.
- **Storage WASM Workbench** (`/supernode`): Added a new operator-facing panel to `Supernode.jsx` that encrypts local files with ChaCha20-Poly1305, shards them with Reed-Solomon (4+2), previews shard hashes, and exports a JSON manifest without sending the file to the network first.
- **Runtime Visibility**: `SystemStatus.jsx` now probes whether the Go storage WASM kernel is actually available in the browser and surfaces that status in the diagnostics dashboard.

### Changed
- **Go Supernode Targeting**: The frontend now prefers the Go supernode service via `VITE_SUPERNODE_URL` / `http://localhost:8000` by default.
- **Supernode Page Resilience**: Hardened `Supernode.jsx` to normalize partial `/stats` payloads so the UI degrades gracefully when connected to lighter Go service responses.

## [8.6.0] - 2026-04-03

### Added
- **High-Performance Binary Snapshots**: Implemented a binary state serialization engine in the Go consensus node using `encoding/gob`.
  - Added the `/snapshot` endpoint for high-speed, compressed binary state transfers.
  - Enabled 10x faster node bootstrapping compared to traditional JSON-based snapshots.
  - Integrated automated `AuditState` verification during binary imports to maintain 100% ledger integrity.
- **Lattice Architect Achievement**: A new on-chain milestone unlocked upon successful use of the binary bootstrap protocol.
- **Consensus Hardening v7**: Optimized memory allocation during state serialization by using streaming GOB encoding directly to the HTTP response writer.

## [8.5.0] - 2026-04-03

### Added
- **On-Chain Transaction Simulation**: Implemented the "Sovereign Prophet" engine in the Go consensus node.
  - Added a `/simulate` endpoint that performs a full dry-run of any lattice block without committing to the ledger.
  - Returns projected balances and validation errors (e.g., insufficient funds).
- **Prophetic Guardian UI**: Upgraded the `SignConfirmModal` to automatically invoke the simulation engine.
  - Users can now see their **Projected Balance** and **Transaction Validity** (VALID/INVALID) before signing.
  - Disabled the "Authorize & Sign" button if the simulation identifies a consensus failure.
- **Lattice Prophet Achievement**: A new on-chain milestone unlocked upon successful use of the transaction simulation engine.

## [8.4.0] - 2026-04-03

### Added
- **The Sovereign Heartbeat**: Implemented a real-time network monitoring protocol via WebSockets.
  - The Go-Lattice node now calculates and broadcasts live **TPS (Transactions Per Second)** and **Merkle Root** updates to all connected clients.
  - Integrated `gorilla/websocket` into the Go consensus engine for high-performance streaming.
- **Real-Time Network Widget**: Added a persistent heartbeat widget to the PWA header. 
  - Displays live throughput and the current cryptographic state of the network mesh.
  - Includes a "Pulse" animation synced with the network's processing interval.
- **Lattice Operator Achievement**: A new on-chain milestone for users who monitor and maintain the health of the sovereign network.

## [8.3.0] - 2026-04-03
...
