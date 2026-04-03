# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.6.6] - 2026-04-03

### Added
- **SPoRA Consensus Engine**: Upgraded the `bobcoin-consensus` Node.js Asynchronous Block Lattice to enforce Succinct Proof of Random Access. Users MUST generate a valid cryptographic chunk hash from a local `supertorrent` node that actively seeds the core Bobtorrent games in order to transact on the network.
- **Storage Oracle Endpoints**: Upgraded the Supernode (`supertorrent/server.js`) to act as a local storage oracle, returning deterministic file chunk hashes based on previous block challenges.
- **Full E2E Execution Flow**: Hardened `test_e2e.js` to execute the full SPoRA flow: Game Server Proof Verification ➔ System Send Block ➔ User Wallet SPoRA Oracle Fetch ➔ User Wallet Receive Block ➔ Native Lattice Signature Validation.





## [2.6.5] - 2026-04-02

### Added
- **Decentralized Wallet Application**: Upgraded `Wallet.jsx` from a mock UI to a fully functional Asynchronous Block Lattice wallet. The frontend now securely generates and persists an Ed25519 Keypair in `localStorage`.
- **Cryptographic Signing in Browser**: The React frontend natively signs `receive` and `send` blocks using `tweetnacl` and `bs58` before broadcasting them to the consensus node. Users can now actively claim pending funds from the game server and send funds directly to other players.
- **Cross-Platform Cryptography**: Migrated the Node.js lattice engine from native DER-based crypto to `tweetnacl` to ensure flawless cross-platform signature verification between the browser and backend.





## [2.6.4] - 2026-04-02

### Added
- **Consensus Integration**: Integrated the `game-server` directly with the new Node.js `bobcoin-consensus` Block Lattice. The server now dynamically generates an Ed25519 keypair and signs real cryptographic Send blocks when users trigger a "Mint" event, finalizing the sunset of the mock Solana bridge.
- **Configuration**: Implemented workspace-wide `.env` configuration, cleanly moving hardcoded ports and URLs into centralized environment variables loaded by Vite and Express.





## [2.6.3] - 2026-04-02

### Added
- **Block Lattice Node.js Engine**: Initiated Phase IV by writing a native Node.js implementation of an Asynchronous Block Lattice inside `bobcoin-consensus` using Ed25519 signatures and SHA-256 hashes. Simulated feeless microtransactions natively.
- **Arcade Hardware Integration**: Hardcoded Bobsgame and FWBER core torrent magnets into the `supertorrent` boot sequence to act as permanent storage anchors.





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
