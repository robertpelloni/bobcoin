# Changelog

All notable changes to this project will be documented in this file.

## [0.1.8] - 2025-12-30
### Added
- Added `bobcoin-networking` crate (Solana-style Packet architecture).
- Added `bobcoin-oracle` crate (Chainlink-style Off-Chain Reporting).

## [0.1.7] - 2025-12-29
### Added
- Updated `Block` struct to include `SocialValueProof` and `DanceOffSession`.
- Node now mines blocks upon validating verified Dance Off sessions.

## [0.1.6] - 2025-12-29
### Added
- Ported Relationship Verification logic to `bobcoin-mining`.
- Integrated `RelationshipVerifier` into `SocialValueProof`.

## [0.1.5] - 2025-12-29
### Added
- Created `bobcoin-economy` and `bobcoin-mining` crates.
- Merged feature branches for Economy and Mining logic.
- Began porting Python prototype logic to Rust modules.

## [0.1.4] - 2025-12-29
### Added
- Implemented `DanceOffSession` in `bobcoin-dance`.
- Added fields for `witness_signature`, `witness_id`, and `biometric_auth_passed` to support "Vouched Dance-Offs".
- Updated `GrooveVerifier` to check for witness presence and biometric flags.

## [0.1.3] - 2025-12-29
### Added
- Implemented `KeyPair` generation in `bobcoin-privacy` using Ristretto group.
- Implemented Pedersen Commitments for hiding transaction amounts.
- Scaffolded Ring Signature structures (MLSAG style).
- Added `sha2` dependency to `bobcoin-privacy`.
- Downgraded `rand` to 0.8.5 to resolve dependency conflicts with `curve25519-dalek`.

## [0.1.2] - 2025-12-29
### Fixed
- Fixed compilation errors in `bobcoin-core` (duplicate structs) and `bobcoin-dance` (missing dependencies).
- Stabilized workspace build.

## [0.1.1] - 2025-12-29
### Added
- Initialized Rust workspace with crates: `bobcoin-core`, `bobcoin-consensus`, `bobcoin-privacy`, `bobcoin-dance`, `bobcoin-node`.
- Implemented version reading in `bobcoin-node` CLI.
- Added `DASHBOARD.md`.

## [0.1.0] - 2025-12-29
### Added
- Initial project setup
- Documentation ecosystem (ROADMAP, CHANGELOG, VERSION, AGENTS)
