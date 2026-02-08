# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-02-07

### Added
- **ZK Verification**: Integrated `proof-of-play` Rust service (SP1) with `game-server`. Real cryptographic trace execution is now performed before minting tokens.
- **Governance**: Added persistent DAO governance. Proposals are stored in `proposals.json`, and the frontend supports real-time Quadratic Voting.
- **Rhythm Game**: Replaced the clicker prototype with a falling-note rhythm game (`RhythmGame.jsx`) for true "Proof of Play".
- **Marketplace**: Functional shop for buying themes and boosts (`Marketplace.jsx`).
- **Supernode Persistence**: Added `torrents.json` to persist seeded magnet links across restarts.
- **System Dashboard**: Added a comprehensive status page (`/system`) listing service health and architecture.

### Changed
- **Frontend**: Migrated to `react-router-dom` v6 for robust navigation.
- **UI/UX**: Enhanced Cyberpunk aesthetic with consistent glitch effects and tooltips.
- **Architecture**: The `game-server` now acts as an orchestrator between the Frontend, ZK Service, and Solana Bridge.

### Fixed
- **Dependencies**: Resolved version conflicts in `package.json` for `react-router-dom` and `express`.
- **Minting**: Added graceful fallback for Solana Devnet rate limits (mock success response).

## [2.0.0] - 2026-01-01

### Initial Release
- Basic Supernode (WebTorrent).
- Solana Bridge (Devnet).
- Clicker Game Prototype.
