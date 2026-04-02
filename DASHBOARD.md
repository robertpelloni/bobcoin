# Module & Submodule Dashboard

This document provides a comprehensive overview of the repository structure, including top-level modules and embedded research submodules.

## Repository Structure Overview

The Bobcoin repository is structured as a Monorepo containing several distinct, highly decoupled services.

```text
bobcoin/
├── frontend/           # React/Vite UI Application (Port 5173)
├── game-server/        # Node.js/Express Orchestrator & Governance DB (Host Port 3001)
├── supertorrent/       # Node.js WebTorrent Storage Node & Solana Bridge (Host Port 8081)
├── proof-of-play/      # Rust SP1 Zero-Knowledge Service
└── research/           # External ecosystem reference repositories
    ├── forest/         # Filecoin Rust implementation
    └── solana/         # Solana Labs core monorepo
```

## Tracked Submodules (Research)

The `research/` directory contains cloned forks of external projects relevant to the Bobcoin architecture. 
*Note: Currently, these are not strictly bound by `.gitmodules` and exist as nested repositories.*

| Submodule | Path | Upstream | Purpose |
| :--- | :--- | :--- | :--- |
| **Forest** | `/research/forest` | `ChainSafe/forest` | Rust implementation of Filecoin. Used as architectural reference for the "Proof of Useful Stake" and Supernode storage consensus logic. |
| **Solana** | `/research/solana` | `solana-labs/solana`| Core Solana monorepo. Used as reference for the bridging logic, Devnet transaction mechanics, and potential future Block Lattice porting. |

## Internal Modules

| Module | Version | Tech Stack | Status |
| :--- | :--- | :--- | :--- |
| **Bobcoin UI** | `2.3.0` | React, Vite, CSS | Active / Simulated |
| **Game Server** | `2.2.0` | Node.js, SQLite | Missing Entrypoint |
| **Supernode** | `2.2.0` | Node.js, WebTorrent| Functional |
| **ZK Service** | `2.1.0` | Rust, SP1 | Execution Only |
