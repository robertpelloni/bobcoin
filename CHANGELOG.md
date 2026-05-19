# Changelog

## [8.107.4] - 2026-05-19
### Added
- **Go Multi-Node Sync Hardening:** Ported the dynamic peer banning logic to `go-lattice`. The Go consensus engine now actively tracks and bans peers who submit invalid blocks during batch synchronization.

## [8.107.3] - 2026-05-19
### Added
- **Multi-Node Sync Hardening:** Implemented dynamic peer banning in the `bobcoin-consensus` gossip loop. Peers that send batches containing cryptographically invalid blocks will now be skipped and removed from future synchronization rounds to prevent spam.

## [8.107.2] - 2026-05-19
### Fixed
- **Unified Block Hashing:** Fixed Go `CalculateHash` to explicitly match Node.js `JSON.stringify` logic for Spora and Payload, resulting in correct empty strings for `null` rather than `"null"`.

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
