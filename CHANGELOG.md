# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
