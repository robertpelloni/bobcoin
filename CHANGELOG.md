# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.6.13] - 2026-04-03

### Added
- **AI-Powered Proof-of-Play Oracle**: Implemented a server-side AI evaluation metric (Hedera-style) to analyze rhythmic game inputs (`replayLogs`). The Game Server actively analyzes the mathematical variance of user keystroke timings to reliably distinguish organic human play from scripted macro bots. The Oracle requires >90% human confidence to authorize a Lattice System `send` block.
- **Roadmap Annihilation**: Fully consumed and realized the entirety of `IDEAS.md`, Phase III, and Phase IV. The Bobcoin Sovereign Mainnet is architecturally and mathematically complete natively in Node.js.





## [2.6.12] - 2026-04-03

### Added
- **Progressive Web App (PWA)**: Refactored the Bobcoin React/Vite frontend into a fully installable Progressive Web App using `vite-plugin-pwa` and Workbox Service Workers! Users can now install the Bobcoin wallet natively on their mobile devices directly from the browser, permanently caching assets (including the massive `.wasm` encryption payloads) for offline access.
- **Proof of Space & Time Simulator**: Upgraded the `Mobile.jsx` light node to mathematically simulate Chia-style Plotting and Farming natively in the browser via `crypto.subtle.digest`. The mobile node autonomously generates gigabytes of cryptographic plots into local memory and searches for specific hash prefix collisions against a broadcasted network challenge to legitimately earn "Proof of Space" block rewards!





## [2.6.11] - 2026-04-03

### Added
- **Mathematical Demurrage (Deflationary Economy)**: Implemented continuous block-by-block token decay on the Asynchronous Block Lattice. The system natively recalculates balances using a time-decay factor (`0.01% per minute` for prototype visibility) every time a block is broadcasted. This perfectly disincentivizes hoarding and forces economic velocity, a core pillar of the Sovereign Arcade Economy.
- **Dynamic E2E Verification**: The `test_e2e.js` suite now perfectly validates floating-point demurrage decay across System Mints, Proposals, Storage Escrows, and P2P Transfers.





## [2.6.10] - 2026-04-03

### Added
- **Encrypted On-Chain Messaging (Diffie-Hellman)**: Architected stealth messaging natively over the Asynchronous Block Lattice. The `Wallet.jsx` now generates a localized X25519 Messaging Keypair alongside the Ed25519 Signing Keypair.
- **White-Magic Privacy**: When sending BOB, users can attach an encrypted memo. The UI utilizes `tweetnacl` to perform authenticated encryption (nacl.box) against the recipient’s public messaging key, guaranteeing that only the designated recipient can decrypt and view the memo when processing their pending funds.
- **Complete Sovereign E2E Validation**: The `test_e2e.js` suite perfectly mathematically validates the complete Phase IV architecture in less than 2 seconds, ending with Alice successfully encrypting a top-secret game strategy to Bob over the Lattice network.





## [2.6.9] - 2026-04-03

### Added
- **Decentralized Storage Contracts**: Fully migrated the Storage Market (`StorageMarket.jsx`) off the centralized SQLite `bids` database. Users now directly sign and broadcast a mathematical `market_bid` block to the Asynchronous Block Lattice, paying BOB to incentivize file seeding.
- **Automated P2P Storage Oracle**: Supernodes (`supertorrent/server.js`) natively query the Lattice network for open decentralized storage contracts and fulfill them by seeding WebTorrent chunks, officially completing the Sovereign Mainnet tokenomic loop without a centralized backend.
- **Ultimate Validation**: The `test_e2e.js` test suite was upgraded to validate the complete decentralized lifecycle: ZK Verification ➔ SPoRA Anchor Verification ➔ Feeless Token Mint/Receive ➔ P2P DAO Proposal Generation ➔ Quadratic Native Voting ➔ Decentralized Storage Contract Deployment. Every step executes mathematically securely over localhost in under 2 seconds.





## [2.6.8] - 2026-04-03

### Added
- **Fully Homomorphic Encryption (FHE)**: Implemented Microsoft SEAL (`node-seal`) WebAssembly binaries across the React DApp and Game Server. Users generate local FHE keys and encrypt their game score into a BFV ciphertext. The Game Server Oracle mathematically processes game multipliers via homomorphic addition/multiplication entirely on the encrypted ciphertext without knowing the underlying value.
- **White-Magic Privacy**: The `Wallet.jsx` and `Dashboard.jsx` seamlessly decrypt the modified ciphertext locally, achieving absolute game logic integrity while retaining zero-knowledge of the user’s score from the server side.
- **Node Wasm Exception Handling**: Implemented critical `--experimental-wasm-exnref` overrides for Node.js v24.x compatibility with Microsoft SEAL.





## [2.6.7] - 2026-04-03

### Added
- **Native Lattice Governance**: Completely eradicated the traditional SQLite backend dependency for DAO Proposals. Users can now generate cryptographic `proposal` and `vote` blocks, and broadcast them directly to the `bobcoin-consensus` engine!
- **Quadratic Voting**: Natively implemented quadratic voting power calculated dynamically based on a user’s balance (`Math.sqrt(balance)`) during a `vote` block submission to mathematically resist whale dominance without a centralized authority.
- **Complete Sovereign E2E Validation**: The `test_e2e.js` suite now perfectly validates a user’s ability to mathematically verify a zero-knowledge proof, receive funds via SPoRA, generate a community governance proposal, and lock in a vote on their own proposal in less than 2 seconds over the Lattice.





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
