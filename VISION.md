# Bobcoin: The Sovereign Network

## Ultimate Vision
Bobcoin is the **Universal Value-Gaming Layer**, a next-generation cryptocurrency designed to fundamentally alter how value is captured in digital spaces. We are moving beyond simple "Play-to-Earn" game rewards to establish a robust **Protocol of Useful Work**.

Bobcoin serves as the default native currency for the entire interconnected ecosystem: **Bobtorrent** (P2P sharing), **Bobmania**, **Bobsgame** (arcade games), and **FWBER**. Physical arcade machines running Bobsgame across the world will automatically act as stable, official "Supernodes" to anchor the network.

The core philosophy is encapsulated in the manifesto:
> **"Data is the Currency. Seeding is Mining. Play is Work."**

## Core Pillars

1.  **Proof-of-Useful-Stake (PoUS) & SPoRA:**
    Drawing inspiration from Arweave's Succinct Proof of Random Access (SPoRA) and Chia's Proof of Space & Time, Bobcoin mining derives power from the actual provisioning of physical storage and bandwidth to the **Bobtorrent** network. Seeding useful public data (game assets, media) grants voting power and block-producing rights. Nodes must prove they have random access to this historical data to mine the next block.

2.  **Proof-of-Play (PoP):**
    Token generation ("minting") is tied directly to human skill and engagement. Gamers generate Zero-Knowledge (ZK) Proofs (via the SP1 RISC-V infrastructure) of their in-game achievements.

3.  **The Arcade Economy (Demurrage & Block Lattice):**
    Instead of a monolithic global chain, Bobcoin targets an **Asynchronous Block Lattice** (inspired by Nano) combined with a Directed Acyclic Graph (DAG) for parallel throughput (60,000+ TPS). It features **Demurrage** (the slow decay of dormant balances) to disincentivize hoarding and encourage continuous economic velocity.

4.  **Absolute Privacy (FHE & TEEs):**
    To protect the anonymity of gamers and nodes, the protocol transcends Monero by integrating **Fully Homomorphic Encryption (FHE)** and **Trusted Execution Environments (TEEs)**. This allows smart contracts to compute on encrypted balances without ever decrypting the data in memory, achieving "white-magic" privacy that resists nation-state tracking while utilizing ZK "Privacy Pools" to prove funds are legitimate.

## Ecosystem Modules
*   **Frontend (React/Vite):** The user-facing portal, wallet interface, dashboard, and web-based gaming clients.
*   **Game Server (Node.js/Rust):** The decentralized orchestrator.
*   **Supernode (Node.js/WebTorrent/Bobtorrent):** The physical infrastructure client that downloads, seeds, and generates SPoRA Merkle proofs of data.
*   **ZK Service (Rust/SP1):** The cryptographic engine responsible for executing and proving game traces.

### Dual-Consensus Engine & Parity
The Bobcoin project actively maintains 1:1 mathematical parity between the legacy JavaScript `bobcoin-consensus` engine and the high-performance Go `go-lattice` engine. Full ZK Proving via SP1 remains the final functional milestone.

### Go Service Canonicalization
The `go-game-server` and `go-supertorrent` services are now the official canonical microservices. The Node.js equivalents are officially marked for deprecation to consolidate performance under the Go stack.
