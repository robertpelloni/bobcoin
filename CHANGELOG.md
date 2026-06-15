# Changelog

## [8.107.2] - 2026-04-13
### Added
- "Cross-Feature Pressure" Parity Scenario: A complex same-timestamp multi-account scenario involving governance, HTLCs, NFTs, and stake locking.
- "AMM & Multisig Lifecycle" Parity Scenario: Verified 1:1 mathematical parity for AMM swaps and Multisig operations.
- Enhanced AI Oracle in `go-game-server`: Improved variance analysis and added Mean Absolute Deviation (MAD) check for robotic consistency detection.
- Neural Governance Auditor: Mock auditor in `go-game-server` wired to the frontend for proposal risk analysis.
- Multisig Security: Enforced participant-only authorization for propose/approve operations.
- Total Supply Tracking: Implemented deterministic system-wide supply tracking in both JS and Go engines.
- In-Protocol Asset Tracking: Added support for non-native assets acquired via AMM swaps.

## [8.107.1] - 2026-04-12
### Added
- Explicit Enactment Delays for Governance proposals in both JS (`Lattice.js`) and Go (`lattice.go`). Proposals now transition to `Passed` but wait for `enactmentDelay` before execution.
- Deep Parity Tests verifying `enactmentDelay` in multi-account block replays.
- Native execution of FHE logic (`node-seal`) inside `go-game-server` via `exec.Command` without relying on HTTP proxy bridges.
- Native simulation of SP1 Zero-Knowledge verification delays inside `go-game-server`.


All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [8.107.0] - 2026-04-07

### Changed
- **Strict Protocol Enforcement**: Audited and updated all UI pages to explicitly provide `height` and `staked_balance` when constructing new blocks. This allows the Go backend to remove its legacy compatibility shim and enforce strict cryptographic consistency for all transactions.
- **Improved Performance**: Switched from fetching the entire chain to using lightweight frontier metadata for block height calculations in many pages.

### Validation
- `cd frontend && npm run build` (Passed)

## [8.106.0] - 2026-04-06

### Added
- **Peer-to-Peer State Sync Hardening**: Improved node-to-node state synchronization by adding Bloom Filter-based delta discovery, reducing network overhead during catch-up cycles.

## [8.105.0] - 2026-04-06

### Added
- **Consensus Latency Benchmarks**: Integrated real-time latency tracking into the Go lattice dashboard.
...
