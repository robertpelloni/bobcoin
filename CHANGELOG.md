# Changelog

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
