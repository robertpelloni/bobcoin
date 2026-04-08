# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [8.94.0] - 2026-04-06

### Added
- Implemented **Advanced Governance Actions** in Go and Node:
  - Added support for `UPDATE_QUORUM_THRESHOLD` to dynamically adjust consensus requirements.
  - Added `ADJUST_FEES` action to update protocol-wide costs (Proposal Fee, NFT Mint Fee, Storage Fee Base).
  - Added `POOL_REBALANCE` action to adjust on-chain AMM liquidity reserves via governance.
- Implemented **Governance Execution Parity** in the Node reference:
  - Node `Lattice.js` now executes protocol-level actions when a proposal is finalized as `Passed`.
  - Balanced Node/Go validation logic to use dynamic fee parameters instead of hardcoded values.
- Added **Dynamic Fee Validation** in Go:
  - Go Lattice now enforces proposal and NFT fees based on the current governance-adjustable state.

### Changed
- Hardened Node `test_replay_semantics.js` with a new `testGovernanceActionExecution` regression that verifies full-cycle treasury minting.

### Validation
- `npm test` and `go test ./...` passed across all services.

## [8.93.0] - 2026-04-06

### Added
- Implemented **Multi-Room Matchmaking** in Go and Node signaling servers:
  - Added `RoomID` support to `FIND_MATCH` and `MATCH_FOUND` messages.
  - Players can now target specific game rooms for private sessions instead of a single global queue.
- Implemented **Gzip Snapshot Compression** in `go-lattice`:
  - Binary `gob` snapshots are now compressed with `gzip` during export and import, sharply reducing network overhead for full state bootstrap.
  - Added `Content-Encoding: gzip` support to the Go Lattice HTTP API.
- Ported **Gzip Compression** to the Node Lattice reference:
  - Integrated `compression` middleware in `bobcoin-consensus/server.js` for all API responses.

### Changed
- Refactored `Matchmaking` logic in `go-game-server` and `go-supertorrent` to use a `map[string]*MatchConnection` for per-room waiting queues.
- Hardened `go-lattice` snapshot import with automatic Gzip detection.

### Validation
- `npm test` passed in `bobcoin-consensus` with the new `compression` dependency.
- `go test ./...` passed across all Go services, including new `TestMultiRoomMatchmaking` regressions.

## [8.92.0] - 2026-04-06

### Added
- Implemented **Automated Quorum Consensus** in `go-lattice`:
  - Gossip loop now dynamically calculates `QuorumScore` based on the percentage of peers agreeing on the current Merkle Root.
  - Added `UPDATE_QUORUM_THRESHOLD` governance action to dynamically adjust the required consensus majority.
- Implemented **Simulated Torrent Progress** in `go-supertorrent`:
  - Added a background routine that simulates realistic download progress for manually tracked magnets.
  - `/stats` now reports incremental progress and only adds torrent size to `totalSize` upon completion (1 minute simulation).
- Hardened **Go Gossip Peer Pruning**:
  - Offline peers are now automatically removed from the discovery map after 5 minutes of inactivity.

### Changed
- Improved **Go Supernodeinteroperability** by making the root non-WebSocket status consistent with the proxied `/status` endpoint.

### Validation
- `go test ./...` passed across all services.
- `npm test` passed in Node reference.

## [8.91.0] - 2026-04-06

### Added
- Implemented **Fixture-Driven Scenario Assembly** across both lattice implementations:
  - Created `go-lattice/scenario_assembler_test.go`: an automated test runner that assembles and validates all 7 mirrored parity scenarios from shared fixture fragments.
  - Created `bobcoin-consensus/test_scenario_assembler.js`: a mirrored Node-side runner that executes the same scenario logic, ensuring cross-client semantic alignment.
- Formalized the **Shared Parity Contract**:
  - The shared scenario and fragment catalogs now drive actual test execution on both Node and Go, making parity drift an executable test failure.
- Strengthened **Durable Recovery Invariants**:
  - Fixture-driven recovery tests now assert chain length and Merkle root alignment across cold-boot reconstruction for all complex mixed-feature ledgers.

### Changed
- Refactored `go-lattice` recovery tests to use the new `ScenarioAssembler` infrastructure, reducing code duplication and improving maintainability.

### Validation
- `go test ./...` passed all 7 fixture-driven mirrored scenarios in Go.
- `npm test` passed all 7 fixture-driven mirrored scenarios in Node.

## [8.90.0] - 2026-04-06

### Added
- Achieved major **Go-Port Milestone**:
  - Ported the autonomous **Casino Bot** to Go (`go-casino/`), implementing a provably fair gambling service based on block hashes.
  - Implemented **Lattice Governance Execution** logic: passed proposals now trigger protocol-level actions like `MINT_TREASURY` and `UPDATE_DEMURRAGE`.
  - Ported **AI Oracle Bot Detection** to `go-game-server/`, implementing mathematical variance analysis of user `replayLog` timestamps to detect artificial inputs.
- Completed **Vault Security Lifecycle**:
  - Added **Cloaked Retrieval Flow** to the frontend: users can now **Decrypt & Download** encrypted archive entries directly in the browser using PBKDF2/AES-256-GCM.
- Enhanced **Real-Time Visualization**:
  - Upgraded the **3D Consensus Dashboard** with live **Transaction Beams**, visualizing `send` blocks as animated pulses between P2P nodes.
  - Created `NetworkContext.jsx` for centralized WebSocket state management, reducing network overhead and enabling synchronized live metrics.
- Hardened **Gossip Protocol**:
  - Implemented **Multi-Hop Peer Discovery**, allowing nodes to automatically learn the full network topology from any single seed peer.
  - Added automatic **Peer Pruning** for stale/offline connections based on heartbeat timing.

### Changed
- Refactored `Layout.jsx` and `Dashboard.jsx` to use the shared `NetworkContext`.
- Improved **SP1 ZK Verification** shell with strict hash format validation in the Go lattice.

### Validation
- `go test ./...` passed across 4 Go services: `go-lattice`, `go-game-server`, `go-supertorrent`, `go-casino`.
- `npm run build` succeeded with healthy route/vendor chunk profiles.

## [8.89.0] - 2026-04-06

### Added
- **Identity Verification UI**: Integrated a new `PublisherProofEntry` component into the Vault. Users can now trigger real-time "Zero-Trust" checks against external publisher attestations (GitHub, ORCID, etc.) via the Go supernode.
- **Verification Badging**: Added real-time "VERIFIED" and "FAILED" visual states for publisher proof cards, backed by the new Go-native `VerifierService`.

### Changed
- **Vault API Integration**: Updated the frontend API layer to support the new `/verify-attestation` endpoint.

### Validation
- `cd frontend && npm run build` (Passed)

## [8.88.0] - 2026-04-06

### Changed
- **Aggressive 3D Deferral**: The `CyberGrid3D` component is now lazy-loaded with a dedicated Suspense boundary in `SystemStatus.jsx`. This prevents the `three.js` stack and its associated React-Three-Fiber hooks from being analyzed as a required dependency for the `SystemStatus` page's initial definition.
- **Bundle Health Breakthrough**: This change, combined with existing route splitting, reduced the main entry bundle size from ~1.5MB to ~50kB, ensuring the wallet UI remains extremely responsive regardless of the graphics stack complexity.

### Validation
- `cd frontend && npm run build` (Build confirmed: index.js is now 49.99 kB).

## [8.87.0] - 2026-04-05
...
