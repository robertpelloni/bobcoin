# Bobcoin Roadmap

## Phase 1: The Arcade Prototype (Completed ✅)
- [x] Basic Express Server & Blockchain Bridge.
- [x] 2D Rhythm Game.
- [x] Mock Proof of Play submissions to Solana Devnet.
- [x] Supernode CLI for WebTorrent seeding.

## Phase 2: Gamification & Immersion (Completed ✅)
- [x] 3D WebGL Rhythm Game (React Three Fiber).
- [x] Supernode Management UI & Peer Map.
- [x] Governance and Storage Marketplace UI.
- [x] System Architecture & Block Lattice Visualizers.
- [x] Community Features (Trollbox, News Ticker).
- [x] Mobile Light Node Simulator (React Native).

## Phase 3: Verifiable Computing (In Progress ⏳)
- [x] SP1 (RISC-V) Program for Game Score logic.
- [x] Actix-Web ZK Verification Server.
- [x] Game Server routes proofs to ZK Server before minting.
- [ ] Migrate from "Server-Side Execution Trace" to true Client-Side SNARK generation.
- [ ] Implement Proof of Storage Merkle validation inside the ZK circuit.

## Phase 4: Decentralization & Smart Contracts (Planned 🔮)
- [ ] **Migrate from SQLite to On-Chain:** Move Governance, Quests, and Marketplace data to real Smart Contracts (Solana Programs or Fuel VM).
- [ ] **P2P Gossip Network:** Replace centralized Game Server `/chat` and stats fetching with `libp2p` pubsub.
- [ ] **The Block Lattice:** Implement the per-account async chain structure (Nano-style) for immediate, fee-less score updates.
- [ ] **Privacy Layer:** Implement Ring Signatures (CLSAG) and Bulletproofs+ on the token layer.
