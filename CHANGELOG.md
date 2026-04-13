<<<<<<< HEAD
# Changelog

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
=======
# Bobcoin Changelog

## [2.1.0] - 2025-02-12
### Added
- **Universal Documentation:** Created `docs/UNIVERSAL_INSTRUCTIONS.md` as the single source of truth for all AI agents.
- **Documentation Overhaul:** Updated `AGENTS.md`, `CLAUDE.md`, `GPT.md`, etc., to reference the universal file.
- **System Dashboard:** (Planned) New `Architecture.jsx` page.
- **Community Features:** Trollbox, News Ticker, UI Sounds.
- **Easter Eggs:** Konami Code "God Mode", Leaderboard Badges.
>>>>>>> feature/comprehensive-ui-spec

## [2.0.0] - 2025-02-11
### Added
<<<<<<< HEAD
- **Peer-to-Peer State Sync Hardening**: Improved node-to-node state synchronization by adding Bloom Filter-based delta discovery, reducing network overhead during catch-up cycles.

## [8.105.0] - 2026-04-06

### Added
- **Consensus Latency Benchmarks**: Integrated real-time latency tracking into the Go lattice dashboard.
...
=======
- **WebGL Rhythm Game:** Complete rewrite using `react-three-fiber` with 3D note highway, particle effects, and neon grid.
- **Supernode UI:** Real-time dashboard for managing `webtorrent` seeds and viewing peer stats.
- **Governance:** Voting UI backed by `sqlite3` database.
- **Manual:** Comprehensive in-app documentation.
- **System Status:** Real-time visualizer for TPS and Block Lattice.
- **Mobile App:** React Native shell with simulated mining graph.

### Fixed
- **React 19 Conflicts:** Downgraded frontend dependencies to React 18 to fix WebGL crashes.
- **Wallet Adapter:** Added Polyfills for `Buffer` to fix Solana wallet connection.

## [1.0.0] - Initial Prototype
- Basic Express Server.
- CLI-based Supernode.
- 2D DOM-based Rhythm Game.
>>>>>>> feature/comprehensive-ui-spec
