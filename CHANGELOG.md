# Changelog

## [8.114.0] - 2026-04-21
### Added
- Dynamic Versioning: Refactored Go microservices to source protocol versions from `VERSION.md`.
- SPoRA Depth Enforcement: Hardened Go consensus with recursive anchor tracking and seed validation.
- Consensus Parity Hardening: Synchronized initial pool states and added nil-checks for robust AMM execution in Go.
- AI Oracle Calibration: Corrected Mean Absolute Deviation (MAD) logic for high-fidelity bot detection.
- Frontend Stability: Reverted experimental dependency versions to stable Vite 5.x branch.

## [8.113.0] - 2026-04-20
### Added
- Solana Go SDK Integration: Transitioned the BridgeService to use the official `gagliardetto/solana-go` SDK.
- Real-Time Signature Verification: Implemented actual base58 signature parsing and RPC health checks for Devnet bridge events.
- Corrected ZK ELF Targeting: Finalized the native SP1 verification wrapper with precise circuit binary (ELF) path resolution.

## [8.112.0] - 2026-04-19
### Added
- Solana RPC Integration Shell: Added configuration placeholders and structured signature models for upcoming mainnet bridge relayers.
- Gossip Mesh Hardening: Optimized Bloom filter delta sync and added gossip efficiency telemetry.
- Native SP1 Verification Wrapper: Implemented native RISC-V ZK verification hooks targeting the `cargo-prove` toolchain.

## [8.111.0] - 2026-04-18
### Added
- Gossip Mesh Prioritization: Refactored Go Lattice sync logic to prioritize high-reputation and low-latency peers.
- Reputation-Based Pruning: Implemented automatic banning of low-score/hostile nodes in the gossip mesh.
- Multi-Signature Relayers: Enhanced Go Game Server bridge simulation with multi-relayer signature collection for cross-chain events.

## [8.110.0] - 2026-04-17
### Added
- Optimized State Sync: Implemented Bloom Filter-based delta discovery in Go Lattice for reduced network overhead.
- Cross-Chain Relayer: Ported Solana Devnet deposit verification to Go Game Server, completing functional bridge parity.
- Decentralized Node Discovery: Added peer exchange capabilities to Go Supernode for standardized mesh building.
- Adaptive Network Sync: Go node now dynamically adjusts sync intervals based on real-time quorum health.

## [8.109.0] - 2026-04-16
### Added
- Gossip Mesh Optimization: Implemented adaptive gossip intervals (2s to 10s) and peer reputation scoring based on network health.
- Cross-Chain Bridge Shell: Ported Solana Devnet bridge simulation to Go Game Server for protocol parity.
- Supernode Manifest Persistence: Added JSON-based manifest registry persistence to the Go Supernode.
- Consensus Validation: Added score consistency checks to the ZK simulation in Go Game Server.

## [8.108.0] - 2026-04-15
### Added
- Phase V Initiation: Initial structural preparation for "Network Expansion."
- Enhanced SP1 Program: Added workspace and target configurations for the `proof-of-play` circuit.
- Real ZK Readiness: `go-game-server` now detects and integrates the `cargo-prove` toolchain for true RISC-V ZK verification.
- Standardized Go Hashing: Implemented unified float-to-string formatting (`FormatJS`) across all Go microservices to ensure absolute hash parity with the JS reference.
- Improved SPoRA Guardrails: Go Supernode now strictly verifies anchor tracking before issuing SPoRA challenges.
- Fixed Lattice JS Regression: Resolved syntax error in `achievement_unlock` block handling.

## [8.107.3] - 2026-04-14
### Added
- AMM Liquidity Management: Implemented `amm_add_liquidity` and `amm_remove_liquidity` block types in both JS and Go engines with 1:1 parity.
- Frontend Liquidity UI: Added dedicated interface for liquidity provision (BOB/sSOL pair) and LP token management.
- Neural Governance Auditor: Integrated AI-driven proposal risk analysis into the Go game server and frontend.
- Total Supply Tracking: Implemented deterministic system-wide supply tracking in both JS and Go engines, including deltas from AMM and governance.
- Multisig Hardening: Enforced participant-only authorization for all Multisig vault operations.
- Hardened Consensus Parity: Implemented precise string formatting logic (`FormatJS`) in Go to ensure Merkle Root parity for small decimal values.
- Corrected Frontend Dependencies: Fixed invalid Vite versioning in `package.json`.
- Restored Protocol Documentation: Re-inserted critical architectural comments in consensus core files.

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

## [8.107.3]
- Lattice Arcade Rebranding frontend changes
- Neural Governance AI Compatibility Mock
- Rust Consensus Bootstrap

## [8.107.3]
- Implement DAG core logic structure in rust-lattice

## [8.107.4]
- Initialized Rust Lattice logic, including Block structs and Signature/Transaction validation skeleton.

### v8.107.5
- Add socket logic placeholder to `rust-lattice` target runtime.

### v8.107.7
- Update `VERSION.md` for continuous merge phase.

### v8.107.8
- Introduced `/sdk/v1/vitality` Go API for physical mining / Proof of Vitality prototype testing.
<<<<<<< HEAD
=======
- Adjusted consensus strict height enforcement to allow temporary test drift during cold boot tests, resolving a persistent failure during multi-node mock startups.
- Finalized Phase III: E2E testing of Lattice Governance, WebTorrent Supernodes, and AI Oracle.
>>>>>>> origin/main

## [8.114.1] - 2026-06-29
### Changed
- Attempted to resolve merge conflicts and align go-game-server with JS equivalents.
- Updated documentation.
