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
- [x] **Full Backend Integration:** Removed frontend mock APIs and connected UI components (`Wallet`, `Governance`, `Mobile`, `StorageMarket`) to the live backend services (`localhost:3001`). All simulated mint/burn logic now writes to the unified SQLite ledger.
- [ ] **On-Chain Governance:** Migrate SQLite `proposals` logic to an SPL Governance Program on Solana.
- [ ] **Full ZK Proving:** Upgrade SP1 ZK Service from `client.execute()` to `client.prove()` to generate actual cryptographic traces.
- [x] **Decentralized Storage Market (Bobtorrent):** Connect the Supernode WebTorrent client fully to the new `StorageMarket.jsx` to create a decentralized bid/ask order book for file hosting.

## Phase IV: The Sovereign Mainnet & Arcade Hardware (Upcoming)
- [x] **Arcade Hardware Integration:** Hardcoded Bobsgame/FWBER core file magnets into the Supernode boot sequence, simulating permanent anchor nodes running on physical arcade hardware.
- [x] **Block Lattice Consensus (Node.js Engine):** Architected the foundational Asynchronous Block Lattice inside `bobcoin-consensus` using native Node.js cryptography (Ed25519 signatures, SHA-256). Successfully simulated feeless asynchronous `send`/`receive` block flows.
- [ ] **SPoRA Consensus (Proof of Access):** Implement Succinct Proof of Random Access (Arweave style) so nodes must prove they hold Bobtorrent files to mine the next block.
- [ ] **Fully Homomorphic Encryption (FHE):** Integrate FHE capabilities into the network to allow the execution of private smart contracts without decrypting balances or game logic.