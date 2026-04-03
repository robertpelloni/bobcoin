# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [8.2.0] - 2026-04-03

### Added
- **AES-256-GCM Vault Encryption**: Implemented maximum-security hardening for the sovereign identity layer.
  - All private keys and mnemonics are now encrypted using a user-provided Sovereign Password.
  - Used PBKDF2 with 100,000 iterations for high-entropy key derivation from passwords.
  - Integrated authenticated encryption (AES-GCM) to ensure vault integrity and confidentiality before writing to localStorage.
- **Sovereign Unlock UI**: Added a secure "Vault Locked" dashboard that prevents any interaction with the ledger until the identity is decrypted.
- **Vault Master Achievement**: A new on-chain milestone unlocked when a user successfully hardens their identity with encryption.

## [8.1.0] - 2026-04-03

### Added
- **Native ZK Verifier Integration**: Officially retired the AI Oracle mock in favor of the **Succinct SP1 zkVM** verification protocol.
  - Updated the Game Server (`server.js`) to validate incoming ZK-proofs using the native RISC-V circuit.
  - Implemented the **Verifiable Minting** flow, where only ZK-proven game scores can authorize a `SYSTEM_MINT` transaction on the lattice.
- **Consensus Proof Attachment**: The Game Server now populates the `zk_proof` field in the Lattice Block Model with the verified cryptographic trace hash.
- **Lattice Cryptographer Achievement**: A new on-chain milestone for users who successfully mint tokens using native ZK-proofs.
- **Institutional Hardening**: Every BOB minted in the ecosystem is now mathematically backed by a verifiable execution trace.

## [8.0.0] - 2026-04-03

### Added
- **The Sovereign Singularity**: Final production milestone for the Bobcoin Sovereign Network.
  - Implemented a high-fidelity, glitch-animated `SplashScreen` that simulates the initialization of core cryptographic modules (Lattice, SPoRA, Merkle, Gossip).
  - Overhauled `main.jsx` with a custom Application Bootstrapper to manage the transition to the live OS.
- **Lattice Legend Achievement**: A final on-chain milestone unlocked upon witnessing the initialization of the Sovereign OS.
- **Visual Production Hardening**: Standardized the standalone PWA launch experience for a 1:1 "Arcade Machine" feel.

## [7.6.0] - 2026-04-03

### Added
- **The Universal Lattice Guardian**: Extended the cryptographic pre-sign visualizer to ALL balance-mutating operations. 
  - Every AMM Swap, Staking Lock, and Shared Vault proposal is now intercepted for raw block review.
  - Implemented the `SignConfirmModal` across the **DEX, Staking, and Multi-Sig** dashboards.
- **Protocol Fee Transparency**: Explicitly labeled the feeless nature of the network (SPoRA-backed) in the transaction manifest.
- **Lattice Sentinel Achievement**: A new on-chain milestone unlocked upon utilizing the Universal Guardian for diverse institutional operations.
- **UX Hardening pass**: Optimized the signing flow for zero-latency cryptographic authorization after user approval.

## [7.5.0] - 2026-04-03

### Added
- **Unified Asset Awareness**: Implemented the **Sovereign Account Selector** across the DEX, Staking, and Multi-Sig pages.
  - Users can now instantly switch between derived BIP-44 sub-accounts to manage liquidity and stake assets across their entire portfolio.
- **Global Portfolio Header**: Added a persistent **Sovereign Net Worth** display to the application header, aggregating liquid and staked wealth across the top 5 derivation indices.
- **DeFi Workflow Hardening**: Streamlined the transition between portfolio discovery and on-chain execution.
- **Lattice Treasurer Achievement**: A new on-chain milestone for users who successfully manage assets across multiple sovereign identities.

## [7.4.0] - 2026-04-03

### Added
- **The Lattice Guardian**: Implemented a cryptographic pre-sign visualizer for transaction hardening.
  - Added a global `SignConfirmModal` to intercept and review raw block data (Type, Balance, Height, Payload) before signing.
  - Hardened the "Send Funds" flow in `Wallet.jsx` with an explicit authorization step.
  - Integrated a real-time SPoRA status indicator into the signing dashboard to confirm mining health.
- **Institutional Hardening**: Protected users against "blind-signing" attacks by rendering the full JSON manifest of pending transactions.
- **Lattice Guardian Achievement**: A new on-chain milestone unlocked upon the first successful transaction authorization through the Guardian.

## [7.3.0] - 2026-04-03

### Added
- **Unified Portfolio Intelligence**: Upgraded the account discovery engine to perform a deep-scan of the entire lattice.
  - Concurrently audits `/frontier`, `/nfts`, and `/staked_balance` across the first 10-20 derived HD account indices.
  - Implemented a **Sovereign Net Worth** aggregator that sums wealth across the entire HD hierarchy.
- **Global Asset Discovery UI**: Overhauled the `/gallery` and `/wallet` pages to support cross-account asset visibility.
  - The Gallery now displays artifacts owned by *any* of the user's discovered sub-accounts.
  - Added visual asset indicators (🥩, 🖼️) to the portfolio switcher for rapid identification of account types.
- **Portfolio Master Achievement**: A new on-chain milestone unlocked upon successful aggregation of a diversified, multi-account portfolio.

## [7.2.0] - 2026-04-03

### Added
- **The Consensus Matrix**: Implemented a real-time, peer-aware **3D Network Mesh Visualizer** in the system console. 
  - The visualizer now dynamicallly maps the global P2P gossip topology using `@react-three/fiber`.
  - Peers are rendered as pulsing network nodes in 3D space, connected by authorized consensus bridges.
  - Implemented 3D text labeling for peer identification within the Matrix.
- **Lattice Visionary Achievement**: A final visual milestone unlocked for users who successfully map the network mesh.
- **Performance GPU Hardening**: Optimized the 3D rendering pipeline to handle multiple dynamic peer nodes without impacting mobile performance.

## [7.1.0] - 2026-04-03

### Added
- **Cross-Client Merkle Consensus**: Ported the **State Merkle Tree (MPT)** engine to the Node.js consensus engine, achieving 100% protocol parity with the Go implementation.
- **Universal Merkle Roots**: Standardized the account state hashing logic (Balance, Staked, Height) across JavaScript and Go runtimes. Both clients now calculate bit-identical Merkle Roots for any given network state.
- **Unified Status API**: Updated the Node.js `/status` endpoint to include the real-time Merkle Root, enabling cross-client P2P verification.
- **Lattice Unifier Achievement**: A new on-chain milestone unlocked when a user successfully bridges heterogeneous client types in perfect Merkle consensus.

## [7.0.0] - 2026-04-03

### Added
- **Merkle Zenith Consensus**: Implemented a real-time **State Merkle Tree** in the Go consensus engine.
  - The network now generates a unique **Merkle Root** after every block, capturing the cryptographic state of all account balances and heights.
  - Standardized Merkle Proof protocols to allow for future lightweight wallet verification (SPV).
- **Universal State Proof UI**: Overhauled the `SystemStatus` dashboard to display the **Global Merkle Root**. Added a visual "VERIFIED" cryptographic seal to confirm bit-perfect network consensus.
- **Go Engine Expansion (v4)**: Added `merkle.go` for high-performance, deterministic state tree calculations.
- **Lattice Zenith Achievement**: A final on-chain milestone unlocked upon reaching total Merkle consensus with the network.

## [6.9.0] - 2026-04-03

### Added
- **Automatic Sub-Account Discovery**: Implemented an intelligent scanning engine in `Wallet.jsx`.
  - The wallet now derives and checks account indices 0-19 for on-chain activity or balances.
  - Automatically populates the "Portfolio View" with all active sovereign accounts.
- **Portfolio UI Upgrade**: Overhauled the account-switcher into a unified Portfolio View. Users can now see a real-time balance breakdown across all their derived sub-accounts.
- **Lattice Oracle Achievement**: A new on-chain milestone unlocked when the discovery engine identifies multiple active sub-accounts.
- **UX Polish**: Added a "Scanning..." progress indicator and a "Refresh List" capability to the sub-account portfolio.

## [6.8.0] - 2026-04-03

### Added
- **Native PWA Install Engine**: Implemented native app installation logic in the React frontend.
  - Captured `beforeinstallprompt` to enable high-fidelity installation prompts.
  - Added a dedicated **"INSTALL APP"** button to the navigation sidebar and mobile bottom-nav.
- **Standalone Mode Hardening**: Upgraded `index.html` with iOS and Android specific meta tags for a true standalone experience.
  - Removed browser chrome in standalone mode.
  - Standardized the `theme-color` to match the Cyberpunk neon aesthetic.
- **FullScreen Arcade Toggle**: Added a native FullScreen engine in `SystemStatus.jsx` for an immersive, 1:1 arcade machine UI.
- **Lattice Evangelist Achievement**: A new on-chain milestone unlocked when a user installs the Sovereign OS to their local device.

## [6.7.0] - 2026-04-03

### Added
- **Sovereign Address Book**: Implemented a local contact management system in `Wallet.jsx`.
  - Users can now save human-readable aliases for public keys to prevent transaction errors.
  - Added a "USE" shortcut to quickly populate the Send and DEX forms from the address book.
  - Persistence integrated with browser local storage for persistent, sovereign contact management.
- **Lattice Diplomat Achievement**: A new on-chain milestone for users who build a network of sovereign contacts.
- **UX Hardening pass**: Optimized the wallet settings grid for mobile and added clear tooltips for contact management.

## [6.6.0] - 2026-04-03

### Added
- **Consensus Batch Syncing**: Optimized the P2P synchronization protocol for industrial-scale data throughput.
  - Implemented pagination and `limit` parameters in both **Go** and **Node.js** block APIs.
  - Upgraded gossip loops to pull history in 100-block cryptographic batches, drastically reducing network round-trips.
- **Visual Sync Progress Dashboard**: Overhauled the `SystemStatus` page with real-time consensus monitoring.
  - Added a **Network-Wide Consensus Progress Bar** that calculates local block height vs. maximum peer height.
  - Added a **Network State Root** display for immediate visual confirmation of global ledger integrity.
- **Lattice Consolidator Achievement**: A new on-chain milestone unlocked upon synchronizing large batches of network history.

## [6.5.0] - 2026-04-03

### Added
- **BIP-44 HD Wallet Support**: Hardened the wallet infrastructure with Hierarchical Deterministic (HD) account derivation.
  - Users can now derive an infinite sequence of sub-accounts from a single 12-word master seed.
  - Implemented standard-compliant derivation paths (e.g., `m/44'/1337'/x'`) in both Go and JavaScript.
- **Multi-Account UI**: Added a sleek account-switcher to the Privacy Vault. Users can now manage multiple independent lattice chains without clearing their browser session.
- **HD Architect Achievement**: A new on-chain milestone unlocked upon the successful derivation of a sub-account.
- **Consensus Hardening v4**: Standardized key derivation across all client runtimes to ensure identical account addresses from the same seed.

## [6.4.0] - 2026-04-03

### Added
- **Multi-Client Consensus Hardening**: Implemented P2P protocol parity between the Go-Lattice and Node.js engines.
  - Ported `/peers`, `/status`, and `/blocks` APIs to the Node.js implementation.
  - Built a background gossip loop in JavaScript to enable cross-client state root synchronization and auto-repair.
- **Client Diversifier Achievement**: A new on-chain milestone unlocked for operators maintaining a multi-client network mesh.
- **Protocol Consistency pass**: Standardized SHA-256 state root calculations and Ed25519 message buffering across Go and Node.js to ensure bit-perfect consensus across heterogeneous environments.

## [6.3.0] - 2026-04-03

### Added
- **Consensus Optimization**: Optimized the Go consensus engine for high-throughput block retrieval.
  - Implemented `LoadBlocksAfter` in `database.go` using indexed SQLite queries to replace linear scans.
  - Upgraded the `/blocks` API to support efficient delta retrieval via the `after` parameter.
- **Peer Latency Tracking**: Integrated real-time Round-Trip Time (RTT) measurement into the gossip loop.
  - Nodes now track and report the latency (ms) and status (online/offline) of all registered peers.
- **System Performance UI**: Upgraded the `SystemStatus` dashboard to display peer ping times and health indicators.
- **Lattice Optimizer Achievement**: A new on-chain milestone for maintaining a high-performance, synchronized network node.

## [6.2.0] - 2026-04-03

### Added
- **Dynamic Mobile Navigation**: Implemented a fixed bottom-navigation system for small screens. Replaced the global sidebar on mobile with a sleek, thumb-friendly icon bar for core arcade actions.
- **Global Responsive Audit**: Performed a full CSS hardening pass across the PWA. 
  - Overhauled grids for the **Explorer**, **DEX**, **Shared Vaults**, and **Staking** to support single-column reflow.
  - Implemented global mobile font-scaling and container padding overrides.
- **Mobile-Optimized 3D Topology**: Updated the `@react-three/fiber` visualizer to dynamically scale resolution and FOV on handheld devices, ensuring high frame rates on mobile GPUs.
- **Mobile Warrior Achievement**: A new on-chain milestone unlocked for users accessing the Sovereign Network via mobile devices.

## [6.1.0] - 2026-04-03

### Added
- **Sovereign Manual Overhaul**: Completely refactored the `/manual` documentation hub to v6.1.0 standards.
  - Included technical deep-dives into the **High-Performance Go Engine**, **On-Chain AMM Engine**, **HTLC Atomic Swaps**, and **Multi-Sig Shared Vaults**.
  - Implemented an interactive navigation flow for onboarding new sovereign citizens.
- **System Console Hardening**: Upgraded the `SystemStatus` dashboard to monitor the specific versioning of the Go-Lattice engine and the active status of the **SP1 ZK Verifier**.
- **Lattice Scholar Achievement**: Integrated a new milestone for users who complete the initiation chapters in the manual.

## [6.0.0-alpha] - 2026-04-03

### Added
- **Zero-Knowledge Unblocking**: Leveraged the newly available Rust toolchain to implement the **Succinct SP1 zkVM** foundation.
  - Reconstructed the `proof-of-play` SP1 project structure.
  - Implemented the core ZK circuit in Rust (`main.rs`) to verify game score integrity and organic variance.
- **Lattice ZK Integration**: Updated the Go consensus engine and block model to support native SP1 ZK proofs.
- **Hardened Minting**: Implemented strict validation for `SYSTEM_MINT` blocks, requiring a cryptographic ZK proof for acceptance.
- **Zero-Knowledge Sage Achievement**: A new on-chain milestone for users who submit verifiable proofs of play.

## [5.6.0] - 2026-04-03

### Added
- **Institutional Multi-Sig Hardening**: 
  - Overhauled the Go consensus engine to handle collective transaction execution.
  - Implemented logic to trustlessly move funds from shared vaults only when the cryptographic threshold is met.
  - Added real-time signature tracking and validation for pending proposals.
  - Fixed fund reception for multi-sig vault addresses.
- **Multi-Sig UI Upgrade**: Added high-fidelity "Pending Proposals" interface to the `/multisig` page, allowing participants to view, sign, and execute shared transactions.
- **Production Consensus Shift**: Officially switched the entire ecosystem to target the high-performance Go-Lattice node on port 4001 by default.
- **Lattice Go Consensus Parity**: Ported the remaining balance transfer logic (send, receive, proposal costs) from the legacy Node.js engine to the Go engine for 100% protocol compliance.

## [5.5.0] - 2026-04-03

### Added
- **P2P Automatic Consensus Syncing**: Implemented a self-healing protocol for Go nodes to achieve global ledger consistency.
  - Added `GET /blocks` endpoint for delta-based history retrieval.
  - Upgraded the gossip loop to automatically initiate a `sync-fetch` upon detecting state root divergence.
  - Integrated cryptographic block validation during sync to prevent malicious peer-injection.
- **Network Root Visualization**: Upgraded the `SystemStatus` UI to display the real-time Network State Hash (Root), providing immediate proof of consensus across the network mesh.
- **Improved Peer Discovery**: Enhanced the registration and status tracking of network peers.

## [5.4.0] - 2026-04-03

### Added
- **Consensus P2P Gossip**: Implemented a node discovery and health protocol in the Go consensus engine.
  - Added a background `gossipLoop` routine that periodically pings registered peers.
  - Implemented state root comparison to detect ledger forks or data divergence.
  - Added `/peers` API endpoints for dynamic network registration.
- **Network Topology UI**: Upgraded the `SystemStatus` dashboard with a live Peer List. Users can now manually add peer URLs (e.g., `:4002`) and monitor their connection status and reported state roots.
- **Go Engine Expansion (v3)**: Added a thread-safe `Peers` map to the `Lattice` struct with JSON discovery support.

## [5.3.0] - 2026-04-03

### Added
- **Native On-Chain AMM**: Implemented a Constant Product Market Maker (CPMM) in the Go consensus engine.
  - Added `amm_swap` block type with $x * y = k$ invariant enforcement.
  - Support for multiple liquidity pools (defaulting to BOB/sSOL).
  - Real-time price impact and slippage calculations.
- **Sovereign DEX UI Upgrade**: Overhauled the `/dex` page to use real pool reserves and dynamic pricing.
- **Liquidity Provider Achievement**: A new on-chain milestone unlocked upon the first successful AMM swap.
- **Go API Expansion**: Added `GET /pools` endpoint for network-wide liquidity transparency.

## [5.2.0] - 2026-04-03

### Added
- **Multi-Sig Execution Engine**: Implemented on-chain proposal and authorization protocol in the Go consensus engine.
  - Added `multisig_propose` and `multisig_approve` block types.
  - Implemented automatic transaction execution upon meeting the signature threshold.
  - Added double-signing protection and participant-set validation.
- **Shared Vaults UI Upgrade**: Completely overhauled the `/multisig` page to support the full proposal lifecycle. Users can now view, sign, and execute shared transactions from a high-fidelity dashboard.
- **Go State Expansion (v2)**: Enhanced the `MultisigVault` struct to track complex on-chain state for pending proposals and participant authorizations.

## [5.1.0] - 2026-04-03

### Added
- **Ironclad Go-Lattice Persistence**: Implemented native SQLite persistence for the Go consensus engine.
  - Used `modernc.org/sqlite` (pure Go implementation) for cross-platform portability.
  - Integrated Atomic Commits to ensure disk consistency during block processing.
  - Developed a **Cold Boot Recovery** routine that rebuilds the in-memory account chains and network state hash from the physical database on startup.
- **Frontend Backend-Shift**: Updated the React/Vite PWA (`api.js`) to default all Lattice operations to the new high-performance Go Node on port **4001**.
- **Go State Expansion**: Ported state management for `mint_nft`, `data_anchor`, and `multisig_create` to the Go engine.

## [5.0.0-alpha] - 2026-04-03

### Ported
- **Go-Lattice Consensus Engine**: Ported the entire core Block Lattice state machine to Go for high-performance, multi-threaded consensus.
  - Implemented thread-safe `Lattice` struct with `sync.RWMutex`.
  - Ported strict sequence validation, height enforcement, and state root hashing.
  - Built high-concurrency API using Go's `net/http` standard library.
- **Go Cryptography Layer**: Implemented Ed25519 signature verification and SHA-256 hashing using Go's standard library.
- **Go Block Model**: Implemented the hardened Bobcoin block structure in Go with full JSON compatibility for the React/PWA frontend.

## [4.0.0] - 2026-04-03

### Added
- **Sovereign Mainnet State Sync**: Implemented full cryptographic state serialization in `Lattice.js`. Nodes can now export their entire history (`getStateSnapshot`) and bootstrap from snapshots (`loadStateSnapshot`).
- **Bootstrap API**: Added `/bootstrap` endpoints to the Lattice server for rapid network synchronization and history retrieval.
- **Lattice State Discovery UI**: Upgraded the `SystemStatus` dashboard with a "Network Sync" panel. Users can now export the global network state as a JSON artifact or import a snapshot to bootstrap their local environment.
- **Lattice Historian Achievement**: A new on-chain milestone unlocked when a user exports the network history to ensure its preservation.
- **Consensus Hardening v3**: The state snapshot includes the cumulative `stateHash`, ensuring that bootstrapped nodes arrive at the exact same network root.

## [3.9.0] - 2026-04-03

### Added
- **Multi-Signature Shared Vaults**: Implemented institutional-grade multi-sig protocol in `Lattice.js`. Added `multisig_create` block type and deterministic vault address derivation from participant sets.
- **Shared Vaults UI** (`/multisig`): A new dashboard for initializing and managing collective accounts. Features participant discovery and threshold validation.
- **Institutional Economics**: Set a 100 BOB fee for shared vault creation to ensure serious network utilization.
- **Lattice API expansion**: Added `GET /multisigs` and `GET /multisig/:account` to support network-wide vault transparency.
- **GOVERNANCE_TITAN Achievement**: A final on-chain milestone for users who participate in institutional shared vaults.

## [3.8.0] - 2026-04-03

### Added
- **Cyber-Vault UI** (`/vault`): A new permanent storage dashboard. Users can drag and drop files to anchor them to the Block Lattice. 
- **Data Anchor Protocol**: Implemented `data_anchor` block type in `Lattice.js` to record decentralized file metadata on-chain.
- **Supernode Upload API**: Integrated `multer` into `supertorrent/server.js` and added a `/upload` endpoint for receiving and seeding user-provided assets.
- **DATA_ARCHITECT Achievement**: A new on-chain milestone for anchoring the first data artifact.
- **Lattice API expansion**: Added `GET /anchors` to support global archive discovery.

## [3.7.0] - 2026-04-03

### Added
- **Wallet Hardening (Mnemonic Seed Phrases)**: Implemented a 12-word pseudo-mnemonic generator and deterministic key derivation (Ed25519/X25519) from seeds. Users can now backup and restore their entire identity via the "Backup Vault" UI.
- **Sovereign DEX Interface** (`/dex`): A high-fidelity token swap dashboard for exchanging BOB for simulated assets. Features price estimation and trustless HTLC integration.
- **Backup Vault UI**: Integrated a secure panel in `Wallet.jsx` for revealing the seed phrase and importing existing accounts.
- **Master Cryptographer Achievement**: A new on-chain milestone unlocked when a user opens their backup vault to secure their identity.
- **Async Keypair Generation**: Updated the wallet initialization flow to support asynchronous, seed-based key derivation.

## [3.6.0] - 2026-04-03

### Added
- **Native Staking & Yield**: Implemented on-chain staking with `stake_lock` and `stake_unlock` block types. Staked funds are exempt from demurrage and provide a **2x multiplier to Voting Power** in the DAO.
- **Staking Dashboard** (`/staking`): A high-fidelity Cyberpunk UI for managing liquid vs. staked balances, with real-time APY estimation.
- **Consensus Invariants**: Hardened `Lattice.js` to strictly enforce `staked_balance` preservation across all standard transaction types (send, receive, vote, etc.), preventing unauthorized balance mutation.
- **LATTICE_VALIDATOR Achievement**: A new on-chain milestone unlocked upon the first successful staking event.
- **Atomic Swap Hardening**: Improved the `/swap` UI with explicit validation for secret hash lengths and liquid balance checks.

## [3.5.0] - 2026-04-03

### Added
- **Native NFT Protocol**: Implemented `mint_nft` and `transfer_nft` block types in `Lattice.js`. Digital assets are now first-class citizens on the Block Lattice.
- **Digital Gallery UI** (`/gallery`): A new interactive page for minting and browsing artifacts. Features a Cyberpunk card layout with scanline animations and ownership tracking.
- **NFT API Endpoints**: Expanded the Lattice server with `GET /nfts` and `GET /nfts/:account` to support cross-network asset discovery.
- **Asset Decentralization**: Integrated Magnet links into the NFT metadata, linking digital ownership to the underlying SPoRA-backed storage network.

## [3.4.0] - 2026-04-03

### Added
- **Multi-Chain Atomic Swaps (HTLC)**: Implemented Hashed Time-Lock Contracts (HTLCs) as a core Lattice protocol. Added `swap_lock` and `swap_claim` block types, enabling trustless peer-to-peer token exchanges without intermediary risk.
- **Atomic Swap UI** (`/swap`): A new page featuring secret generation, fund locking, and secret-reveal claiming. Fully integrated with the Block Lattice and sequential height rules.
- **Test Suite Stabilization**: Extensively refactored `test_e2e.js` to track and include strictly sequential `height` fields, ensuring all automated tests pass the hardened v3.3.0 consensus rules.
- **Lattice State Expansion**: The `Lattice.js` class now tracks global `swaps` state for real-time validation of secret hashes and expiry times.

## [3.3.0] - 2026-04-03

### Added
- **Real-Time Audio Visualizer**: Integrated a frequency-domain visualizer into the `RhythmGame.jsx` dashboard. Using the Web Audio API's `AnalyserNode`, the UI now pulses with neon frequency bars that react to every note hit, miss, and background drone.
- **Strict Block Height Enforcement**: Added a `height` field to the `Block` class and updated `Lattice.js` to strictly enforce `newHeight === prevHeight + 1` for all transactions. This ensures chain continuity and prevents "gapping" attacks.
- **Enhanced Hash Calculation**: The block height is now included in the SHA-256 hash calculation, further hardening the cryptographic chain integrity.
- **Audio Engine Upgrade**: The `AudioEngine.js` now exports a global `getAnalyzer()` function, allowing multiple components to sync their visuals with the synthesized audio stream.

## [3.2.0] - 2026-04-03

### Added
- **Consensus Hardening**:
  - Implemented **State Hashing** (`stateHash`) in `Lattice.js` — a cumulative network state root that updates after every block, ensuring chain consistency and detecting state divergence.
  - Implemented **Double-Spend Protection** — explicitly checks for duplicate `receive` links during block processing to prevent funds from being claimed multiple times.
- **Achievements v2 (Triggers Wired)**:
  - `SPORA_LORD`: Now triggers in `Wallet.jsx` upon successful fund reception via SPoRA proof.
  - `QUADRATIC_CITIZEN`: Now triggers in `Governance.jsx` after a vote is cast.
  - `P2P_WARRIOR`: Now triggers in `RhythmGame.jsx` upon successful WebRTC peer connection.
  - `FHE_PHANTOM`: Now triggers in `Dashboard.jsx` after successful blind computation.
  - `LATTICE_SHARK`: Now triggers in `Casino.jsx` after a jackpot win.
- **Trophy Room Completion**: The `Trophy Room` UI is now fully functional, providing real-time cryptographic progress tracking across all network milestones.

## [3.1.0] - 2026-04-03

### Added
- **Lattice Casino Page** (`/casino`): A complete frontend interface for the Autonomous Casino AMM. Users can now place 50/50 bets directly from their browser, view their lattice betting history, and experience real-time win/loss feedback via block inspection.
- **Achievement v2 Integration**: Wired achievement triggers into all major pages:
  - `QUADRATIC_CITIZEN`: Triggers in `Governance.jsx` after casting a vote.
  - `LATTICE_SHARK`: Triggers in `Casino.jsx` after winning a bet.
  - `P2P_WARRIOR`: Triggers in `RhythmGame.jsx` upon establishing a WebRTC direct connection.
  - `FHE_PHANTOM`: Triggers in `Dashboard.jsx` after a successful blind computation round.
- **Trophy Room Completion**: The progress bar and icon grid are now fully functional and fillable as the user interacts with the Sovereign Network.

## [3.0.0] - 2026-04-03

### Added
- **On-Chain Achievement System**: Introduced a decentralized metagame where user milestones are permanently signed and broadcast as `achievement_unlock` blocks to the Lattice.
- **Trophy Room UI** (`/trophies`): A dedicated high-fidelity page displaying unlocked achievements. Features a "Cryptographic Completion" progress bar and neon-themed achievement cards with unique icons and colors.
- **Achievement Engine** (`AchievementService.js`): A centralized service to detect and unlock milestones.
- **Milestone Triggers**:
  - `GIBSON_HACKER`: Unlocked upon generating a wallet via the physical keyboard entropy terminal.
  - `FHE_PHANTOM`: Unlocked upon completing an FHE-encrypted blind computation round.
  - (Planned: `SPORA_LORD`, `QUADRATIC_CITIZEN`, `LATTICE_SHARK`, `P2P_WARRIOR`).
- **Lattice API**: Exported `getLatticeChain` in the frontend API to support trophy fetching.

## [2.9.0] - 2026-04-03

### Added
- **Web Audio Synthesizer** (`audio/AudioEngine.js`): Pure mathematical waveform synthesis via the Web Audio API. No audio files — all sounds generated from oscillators, filters, and gain envelopes. Includes:
  - `playHitSound(lane, quality)` — Pentatonic synth blips pitched by lane, with filter sweeps. PERFECT notes ring at higher octave.
  - `playMissSound()` — Dissonant sawtooth buzz for missed notes.
  - `playMatchSound()` — C-E-G major arpeggio chime when WebRTC match is found.
  - `playBlockConfirmedSound()` — High-pitched rising ping for new block confirmations.
  - `startAmbientDrone()` — Sub-bass + detuned triangle pad with LFO wobble. Starts when game begins, fades on stop.
- **Real-Time Block Activity Feed**: WebSocket server embedded in Lattice (`bobcoin-consensus/server.js`) broadcasts `NEW_BLOCK` events to all connected clients. `LiveFeed.jsx` component renders a scrolling, color-coded feed of every block hitting the lattice in real-time, with connection status indicator and audio toggle.
- **Dashboard Integration**: `LiveFeed` component mounted on the main Dashboard page below the Leaderboard and Marketplace.

## [2.8.0] - 2026-04-03

### Added
- **Block Explorer UI** (`/explorer`): Full-featured Cyberpunk block explorer page. Browse all lattice accounts, search by public key, click to inspect individual account chains with every block's hash, type, balance, amount, SPoRA proof, payload, and timestamp. Color-coded block types (open/send/receive/proposal/vote/market_bid/accept_bid). Auto-refresh toggle with 5-second polling. Network stats banner (accounts, total blocks, total value locked). Fully mobile responsive.
- **Lattice `/frontier` API**: New global frontier endpoint returning all accounts with their balances, heights, and head hashes.
- **Navigation**: Added 🔍 EXPLORER link to the Cyberpunk navbar.

## [2.7.0] - 2026-04-03

### Added
- **WebRTC P2P Multiplayer Matchmaking**: Implemented a full WebSocket signaling server embedded in the Game Server (`game-server/server.js`) that brokers WebRTC peer-to-peer connections between rhythm game players. The signaling flow supports `FIND_MATCH` queuing, `MATCH_FOUND` initiator/receiver role assignment, bidirectional SDP offer/answer relay, ICE candidate forwarding, and `OPPONENT_DISCONNECTED` notifications.
- **Browser WebRTC Client**: Upgraded `RhythmGame.jsx` with `simple-peer` WebRTC integration. Players can click "FIND MATCH (P2P)" to enter the matchmaking queue. Once matched, both players' games start simultaneously and live score updates stream directly peer-to-peer without touching any server!
- **Node.js Polyfills for Vite**: Added `buffer`/`process`/`global` polyfills in `main.jsx` to support `simple-peer`'s Node.js dependencies in the browser bundle.
- **WebRTC Integration Test** (`test_webrtc.js`): 9-step test covering player connection, queue mechanics, SDP offer/answer relay, ICE candidate forwarding, disconnect notifications, and re-queue/rematch flow. All tests pass.

## [2.6.16] - 2026-04-03

### Added
- **3D WebGL Dashboard Integration**: Upgraded the `SystemStatus.jsx` React dashboard by directly integrating `three.js` and `@react-three/fiber`. It now natively renders a mathematically generated, interactive 3D WebGL visualization of the Asynchronous Block Lattice topology directly inside the Progressive Web App!





## [2.6.15] - 2026-04-03

### Added
- **Gamified Cryptographic Onboarding**: Fully realized the `IDEAS.md` vision to turn wallet creation into a cypherpunk mini-game. When a new user opens `Wallet.jsx`, they are presented with an interactive, offline Wasm terminal. They must physically mash their keyboard to generate a randomized 64-character entropy seed which is securely and deterministically hashed into their final Ed25519 and X25519 LocalStorage keypairs!





## [2.6.14] - 2026-04-03

### Added
- **Autonomous Block Lattice Smart Contracts**: Implemented an autonomous `casino.js` Node.js script running directly as a network agent on the Lattice. The Casino mathematically acts as an Automated Market Maker (AMM) / Provably Fair Oracle, autonomously accepting `send` blocks, polling the network, determining a 50/50 win based on the deterministic block hash, and broadcasting a `send` payout block back to the user without any central server logic!
- **Supernode Wallet Bootstrapping**: Upgraded `supertorrent/server.js` to autonomously request a Lattice bootstrap grant and generate its own cryptographically valid `open` block via SPoRA, enabling it to natively claim Storage Escrow funds.
- **E2E Complete**: The test suite now completely evaluates Alice hitting the jackpot against the autonomous Casino node.





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
