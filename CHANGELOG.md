# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.6.2] - 2026-04-02

### Added
- **Decentralized Storage Market**: Supernode now acts as an automated worker, polling the game-server for open hosting bids and seamlessly accepting/downloading them via WebTorrent.
- **Frontend Build System**: Restored the missing Vite React build scaffold (`package.json`, `index.html`, `vite.config.js`, `App.jsx`, `main.jsx`), saving the UI from floating in the void.
- **UI/UX Polish**: Added global Error Boundaries, injected descriptive tooltips across all inputs, and enforced mobile CSS media queries.
- **Global Version Sync**: Dynamically injected the VERSION string into the React application via Vite define.





## [2.6.1] - 2026-04-02

### Added
- **Project Analysis & Planning**: Comprehensive deep dive and documentation sync per user directives. Prepared backend integration.





## [2.6.0] - 2026-04-01

### Added
- **Architectural Synthesis**: Deeply researched and integrated cutting-edge cryptocurrency innovations (FHE, SPoRA, BlockDAG, PoST, AI Factories) into the core `VISION.md`, `IDEAS.md`, and `ROADMAP.md` documentation.
- **Ecosystem Integration**: Hardcoded the philosophical and technical linkage between Bobcoin, Bobtorrent, Bobmania, Bobsgame, and FWBER into the project manifesto. Physical arcade machines are now classified as "Anchor Supernodes."
- **White-Magic Privacy**: Updated `Manual.jsx` to reflect the transition towards Fully Homomorphic Encryption (FHE), Trusted Execution Environments (TEEs), and Privacy Pools to ensure compliance-friendly, nation-state resistant anonymity.
- **Consensus Evolution**: Documented the shift towards an Asynchronous Block Lattice combined with a DAG for 60k+ TPS, and SPoRA (Succinct Proof of Random Access) to enforce Bobtorrent seeding.

## [2.5.0] - 2026-04-01

### Added
- **Decentralized Governance (v1)**: Implemented `castVote` and `getVotesByProposal` in the backend SQLite schema. Added new Express endpoints for voting and proposal management.
- **DAO UI**: Connected `Governance.jsx` to the live game-server backend, allowing real-time voting (Quadratic Voting mock logic) and proposal status tracking.
- **Privacy Vault Enhancements**: Integrated Stealth Address generation (mock Diffie-Hellman) and Privacy Mode into the `Wallet.jsx` dashboard.
- **Database Schema**: Added `votes` table to prevent double voting and persist voter power.

## [2.4.0] - 2026-04-01

### Added
- **Global Documentation Synthesis:** Created `VISION.md`, `ROADMAP.md`, `TODO.md`, `DEPLOY.md`, `MEMORY.md`, and `DASHBOARD.md` to comprehensively capture project state, goals, and architectural anomalies.
- **Version Standardization:** Established `VERSION.md` as the global source of truth for the active build version.
- **AI Agent Directives:** Rewrote `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `GPT.md`, and `copilot-instructions.md` to reference a strict, unified `docs/AI_INSTRUCTIONS.md` protocol.
- **Innovation Strategy:** Drafted `IDEAS.md` with bold pivot concepts and refactoring targets for future milestones.

## [2.3.0] - 2026-04-01

### Added
- **Mobile Light Node**: Replaced placeholder UI with functional "Mining" simulation including Proof of Walk step counter and Background Storage Mining stats.
- **Frontend API**: Added mocked `api.js` for `mintTokens` and `burnTokens` to support frontend interactions.

## [2.2.0] - 2026-02-07

### Added
- **Backend Robustness**: Migrated Game Server Governance persistence to **SQLite** (`database.sqlite`).
- **Dashboard**: Added dynamic "Module Overview" to `/system`, displaying build versions and Git status.
- **Mobile**: Added placeholder UI for upcoming Mobile Light Node.
- **Documentation**: Overhauled `AGENTS.md` and added `docs/AI_INSTRUCTIONS.md` as universal truth.

### Changed
- **Governance**: Voting backend now uses SQL queries instead of flat JSON.
- **Vision**: Updated roadmap to prioritize "The Sovereign Network" (Phase III).

## [2.1.0] - 2026-02-07

### Added
- **ZK Verification**: Integrated `proof-of-play` Rust service (SP1).
- **Governance**: Added persistent DAO governance (JSON-based).
- **Rhythm Game**: Replaced clicker with falling-note rhythm mechanic.
- **Marketplace**: Functional shop for buying themes and boosts.
- **Supernode Persistence**: Added `torrents.json`.
- **System Dashboard**: Added status page.

### Fixed
- **Dependencies**: Resolved conflicts for `react-router-dom` and `express`.
- **Minting**: Added graceful fallback for Solana Devnet rate limits.

## [2.0.0] - 2026-01-01

### Initial Release
- Basic Supernode (WebTorrent).
- Solana Bridge (Devnet).
- Clicker Game Prototype.
