# Changelog

All notable changes to this project will be documented in this file.

## [2.5.0] - 2026-02-09

### Added
- **Mobile**: Initialized `mobile/` React Native project for Light Node.
- **WebGL**: Replaced DOM-based Rhythm Game with `react-three-fiber` 3D implementation.
- **Wallet**: Integrated `@solana/wallet-adapter` for real transaction signing.

### Changed
- **Frontend**: Updated `RhythmGame.jsx` to use Three.js scenes.
- **Backend**: Added signature verification middleware.

## [2.2.0] - 2026-02-07

### Added
- **Backend Robustness**: Migrated Game Server Governance persistence to **SQLite**.
- **Dashboard**: Added dynamic "Module Overview".

## [2.1.0] - 2026-02-07

### Added
- **ZK Verification**: Integrated `proof-of-play` Rust service.
- **Governance**: Added persistent DAO governance.
- **Rhythm Game**: Initial implementation.
