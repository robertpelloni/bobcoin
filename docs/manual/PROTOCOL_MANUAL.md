# Bobcoin Protocol Manifesto

## "Data is the Currency. Seeding is Mining. Play is Work."

Bobcoin is a next-generation cryptocurrency designed for arcade gaming economies and micro-tip transactions. Unlike traditional blockchains that rely on wasteful hashing (PoW) or capital dominance (PoS), Bobcoin introduces **Proof-of-Useful-Stake (PoUS)**.

### Core Pillars
1.  **Storage = Power:** To mine, you must seed useful data (Scientific Archives, Open Source Media).
2.  **Play = Work:** Gamers mint tokens by generating ZK-Proofs of their skill ("Proof of Play").
3.  **Privacy by Default:** Stealth addresses and Ring Signatures protect user data.

---

# Privacy & Anonymity

Bobcoin implements a multi-layered privacy stack inspired by Monero and Zcash:

-   **Stealth Addresses (P0):** Every transaction uses a unique one-time address, decoupling your public identity from your payments.
-   **Ring Signatures (CLSAG):** Your spend is mixed with 16+ decoys from the blockchain, making the true origin mathematically ambiguous.
-   **Bulletproofs+:** Zero-knowledge range proofs hide the transaction amount while verifying it is positive.

---

# High-Speed Lattice

Instead of a single global chain, every account has its own blockchain. This allows for **asynchronous updates** and massive parallel throughput.

### Performance Targets
-   **Finality:** < 500ms (via Avalanche Snowball consensus)
-   **Throughput:** 10,000+ TPS
-   **Fees:** ZERO for tips, minimal for large transfers.

---

# How to Mine (Supernode)

Mining in Bobcoin is not about solving useless hashes. It is about providing utility to the network.

### Requirements
-   **Disk Space:** At least 1TB recommended for seeding data.
-   **Bandwidth:** High upload speed for serving data chunks to peers.
-   **Stake:** A minimum collateral is required to become a validator.

### Instructions
1.  Go to the **SUPERNODE** page in the Dashboard.
2.  Add a Magnet Link to start seeding.
3.  The node will automatically bid on storage contracts available in the Marketplace.
4.  Once a contract is accepted, your node will download and seed the data.
5.  You earn rewards periodically as long as you maintain >99% uptime.

---

# Governance (DAO)

Bobcoin is owned by its users. The DAO allows token holders to vote on protocol upgrades.

### Voting Process
-   **Proposals:** Any holder with >1% supply can propose a change.
-   **Voting:** Votes are weighted by token holdings (1 Token = 1 Vote).
-   **Execution:** Passed proposals are automatically enacted by the on-chain governance module.

---

# Tokenomics

The economy is designed to reward active participants, not passive holders.

-   **60% - Proof of Play:** Earned by gamers via ZK-verified scores.
-   **20% - Proof of Storage:** Earned by Supernodes for seeding data.
-   **10% - Staking Rewards:** For securing the consensus layer.
-   **10% - Treasury:** Managed by the DAO for development.

> **Demurrage (Anti-Hoarding):** Large dormant balances slowly decay to encourage circulation and spending in the arcade economy.
