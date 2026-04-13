# Bobcoin: The Sovereign Network

## Ultimate Vision
Bobcoin is the **Universal Value-Gaming Layer**, a next-generation cryptocurrency designed to fundamentally alter how value is captured in digital spaces. We are moving beyond simple "Play-to-Earn" game rewards to establish a robust **Protocol of Useful Work**.

Bobcoin serves as the default native currency for the entire interconnected ecosystem: **Bobtorrent** (P2P sharing), **Bobmania**, **Bobsgame** (arcade games), and **FWBER**. Physical arcade machines running Bobsgame across the world will automatically act as stable, official "Supernodes" to anchor the network.

The core philosophy is encapsulated in the manifesto:
> **"Data is the Currency. Seeding is Mining. Play is Work."**

<<<<<<< HEAD
## Core Pillars
=======
## 1. The Manifesto (Updated v2.5)
Bobcoin is not just another memecoin; it is a **Proof-of-Useful-Stake (PoUS)** protocol designed to solve two fundamental problems in the blockchain space:
1.  **Wasteful Consensus**: Moving away from arbitrary hashing (PoW) or capital dominance (PoS) towards **Resource Provisioning**. To mine Bobcoin, you must provide value to the network: **Storage**.
2.  **Passive Participation**: Gamifying the economy to demand active "Proof of Play" from users, turning skill and attention into a valid consensus mechanism.
>>>>>>> feature/comprehensive-ui-spec

1.  **Proof-of-Useful-Stake (PoUS) & SPoRA:**
    Drawing inspiration from Arweave's Succinct Proof of Random Access (SPoRA) and Chia's Proof of Space & Time, Bobcoin mining derives power from the actual provisioning of physical storage and bandwidth to the **Bobtorrent** network. Seeding useful public data (game assets, media) grants voting power and block-producing rights. Nodes must prove they have random access to this historical data to mine the next block.

2.  **Proof-of-Play (PoP):**
    Token generation ("minting") is tied directly to human skill and engagement. Gamers generate Zero-Knowledge (ZK) Proofs (via the SP1 RISC-V infrastructure) of their in-game achievements.

3.  **The Arcade Economy (Demurrage & Block Lattice):**
    Instead of a monolithic global chain, Bobcoin targets an **Asynchronous Block Lattice** (inspired by Nano) combined with a Directed Acyclic Graph (DAG) for parallel throughput (60,000+ TPS). It features **Demurrage** (the slow decay of dormant balances) to disincentivize hoarding and encourage continuous economic velocity.

<<<<<<< HEAD
4.  **Absolute Privacy (FHE & TEEs):**
    To protect the anonymity of gamers and nodes, the protocol transcends Monero by integrating **Fully Homomorphic Encryption (FHE)** and **Trusted Execution Environments (TEEs)**. This allows smart contracts to compute on encrypted balances without ever decrypting the data in memory, achieving "white-magic" privacy that resists nation-state tracking while utilizing ZK "Privacy Pools" to prove funds are legitimate.

## Ecosystem Modules
*   **Frontend (React/Vite):** The user-facing portal, wallet interface, dashboard, and web-based gaming clients.
*   **Game Server (Node.js/Rust):** The decentralized orchestrator.
*   **Supernode (Node.js/WebTorrent/Bobtorrent):** The physical infrastructure client that downloads, seeds, and generates SPoRA Merkle proofs of data.
*   **ZK Service (Rust/SP1):** The cryptographic engine responsible for executing and proving game traces.
=======
### A. Proof of Useful Stake (PoUS) - **ONLINE**
-   **Supernode**: WebTorrent client running in Docker (`supertorrent/`).
-   **Persistence**: Magnet links saved to `torrents.json`.
-   **Economic Cost**: Adding a file requires burning BOB tokens ("Pay-to-Seed").
-   **Smart Mining**: Nodes automatically accept profitable storage bids.

### B. Proof of Play (The Mint) - **ONLINE**
-   **Rhythm Game (WebGL)**: Visual mechanic using `react-three-fiber` for a high-end experience.
-   **ZK-Verification**: SP1 (Rust) Service verifies score logic cryptographically (`proof-of-play/`).
-   **Transaction**: Proofs submitted to Solana Devnet via Bridge.

### C. Governance (The Brain) - **ONLINE**
-   **Mechanism**: Quadratic Voting.
-   **Persistence**: SQLite Database.
-   **Interface**: Real-time voting UI.

### D. Mobile (The Edge) - **IN PROGRESS**
-   **React Native App**: `mobile/` directory initialized.
-   **Light Node**: Simulation logic implemented.

---

## 3. The Future Roadmap (Phase III & Beyond)

### Phase III: The Sovereign Network (Current Focus)
-   [x] **Robustness**: Migration to SQLite for all node state.
-   [x] **Dashboard**: Global system status and module versioning.
-   [x] **Wallet Connect**: Real Web3 integration.
-   [x] **Visual Overhaul**: WebGL Game.
-   [ ] **Mobile Light Node**: Full release on App Store/Play Store.
-   [ ] **Storage Marketplace**: Automated bid/ask for hosting specific CIDs.

### Phase IV: Mainnet
-   [ ] **SPL Governance**: Move off-chain proposals to on-chain DAO.
-   [ ] **Mainnet Bridge**: Switch from Devnet to Mainnet Beta.
-   [ ] **Audits**: Security review of ZK circuits.

---

## 4. Architecture

```mermaid
graph TD
    User -->|Plays (WebGL)| Frontend
    Frontend -->|Submits Score| GameServer
    GameServer -->|Verifies| ZK_Service
    GameServer -->|Persists| SQLite_DB
    GameServer -->|Mints/Burns| Solana_Bridge

    Supernode -->|Seeds Files| WebTorrent
    Supernode -->|Status API| Frontend

    MobileApp -->|Mines (Sim)| Mobile_User
```
>>>>>>> feature/comprehensive-ui-spec
