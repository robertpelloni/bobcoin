# Bobcoin Feature Roadmap

## Phase I: The Arcade (Completed)
- [x] Basic Clicker Game Prototype
- [x] Solana Devnet Bridge Integration
- [x] Basic Supernode (WebTorrent) Implementation

## Phase II: Decentralized Oracle (Completed)
- [x] Rhythm Game Mechanic Replacement
- [x] Persistent Governance DAO (JSON/SQLite)
- [x] Marketplace and Token "Burn" Economic Loop
- [x] ZK Verification Integration (Rust SP1 Execution)
- [x] System Status Dashboard

## Phase III: The Sovereign Network (Current)
- [x] Mobile Light Node Simulator (Proof of Walk, Background Mining UI)
- [x] Backend Reconstruction: Restore and harden the missing Node.js Express entry points (`server.js`) for the game-server and supertorrent.
- [x] **Decentralized Governance (v1)**: Implemented backend logic and frontend UI for DAO proposals and voting.
- [x] **Privacy Vault (v1)**: Implemented frontend UI for Stealth Address generation and privacy-mode toggles.
- [ ] **Full Backend Integration:** Remove frontend mock APIs and connect UI components to the live, restored backend services.
- [ ] **On-Chain Governance:** Migrate SQLite `proposals` logic to an SPL Governance Program on Solana.
- [ ] **Full ZK Proving:** Upgrade SP1 ZK Service from `client.execute()` to `client.prove()` to generate actual cryptographic traces.
- [ ] **Decentralized Storage Market:** Connect the Supernode WebTorrent client fully to the new `StorageMarket.jsx` to create a decentralized bid/ask order book for file hosting.

## Phase IV: The Sovereign Mainnet (Upcoming)
- [ ] **Mobile Light Node Native:** Port the React-based mobile simulator to a true React Native application utilizing device APIs (HealthKit for steps, Background tasks for storage).
- [ ] **Block Lattice Consensus:** Begin sunsetting the Solana Bridge in favor of a native Avalanche-style Block Lattice consensus.
- [ ] **WASM Consensus Micro-Validators:** Port `bobcoin-consensus` to WebAssembly so any user running the 'bobzilla' browser can act as a micro-validator.
- [ ] **No-Code Unity/Unreal SDKs:** Create drop-in plugins for game developers to integrate Proof-of-Play minting without writing smart contracts.