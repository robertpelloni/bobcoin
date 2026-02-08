# BOBCOIN VISION: The Sovereign Network

> **"Data is the Currency. Seeding is Mining. Play is Work."**

## 1. The Manifesto (Updated v2.2)
Bobcoin is not just another memecoin; it is a **Proof-of-Useful-Stake (PoUS)** protocol designed to solve two fundamental problems in the blockchain space:
1.  **Wasteful Consensus**: Moving away from arbitrary hashing (PoW) or capital dominance (PoS) towards **Resource Provisioning**. To mine Bobcoin, you must provide value to the network: **Storage**.
2.  **Passive Participation**: Gamifying the economy to demand active "Proof of Play" from users, turning skill and attention into a valid consensus mechanism.

We are building the **Cyberpunk Decentralized Content Delivery Network (CDN)** of the future.

---

## 2. Implementation Status

### A. Proof of Useful Stake (PoUS) - **ONLINE**
-   **Supernode**: WebTorrent client running in Docker (`supertorrent/`).
-   **Persistence**: Magnet links saved to `torrents.json`.
-   **Economic Cost**: Adding a file requires burning BOB tokens ("Pay-to-Seed").

### B. Proof of Play (The Mint) - **ONLINE**
-   **Rhythm Game**: Visual mechanic (`RhythmGame.jsx`) replacing simple clicks.
-   **ZK-Verification**: SP1 (Rust) Service verifies score logic cryptographically (`proof-of-play/`).
-   **Transaction**: Proofs submitted to Solana Devnet via Bridge.

### C. Governance (The Brain) - **ONLINE**
-   **Mechanism**: Quadratic Voting.
-   **Persistence**: Proposals stored in backend (migrating to SQLite in v2.2).
-   **Interface**: Real-time voting UI.

---

## 3. The Future Roadmap (Phase III & Beyond)

### Phase III: The Sovereign Network (Current Focus)
-   [ ] **Robustness**: Migration to SQLite for all node state.
-   [ ] **Dashboard**: Global system status and module versioning.
-   [ ] **Mobile Light Node**: React Native port for "mining while charging".
-   [ ] **Storage Marketplace**: Automated bid/ask for hosting specific CIDs.

### Phase IV: Mainnet
-   [ ] **SPL Governance**: Move off-chain proposals to on-chain DAO.
-   [ ] **Mainnet Bridge**: Switch from Devnet to Mainnet Beta.
-   [ ] **Audits**: Security review of ZK circuits.

---

## 4. Architecture

```mermaid
graph TD
    User -->|Plays| Frontend
    Frontend -->|Submits Score| GameServer
    GameServer -->|Verifies| ZK_Service
    GameServer -->|Persists| SQLite_DB
    GameServer -->|Mints/Burns| Solana_Bridge

    Supernode -->|Seeds Files| WebTorrent
    Supernode -->|Status API| Frontend
```
