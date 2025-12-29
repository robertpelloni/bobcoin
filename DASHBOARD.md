# Bobcoin Project Dashboard

## Project Structure Overview

The Bobcoin project is organized as a Rust workspace containing several crates, each responsible for a specific domain of the blockchain's functionality. This modular architecture allows for parallel development, easier testing, and clear separation of concerns.

### Directory Layout

*   **`/` (Root)**: Contains workspace configuration (`Cargo.toml`), global documentation (`README.md`, `ROADMAP.md`, `CHANGELOG.md`), and build artifacts.
*   **`bobcoin-core/`**: Defines the fundamental data structures of the blockchain (Blocks, Transactions, Inputs, Outputs). This is the common language spoken by all other modules.
*   **`bobcoin-privacy/`**: Handles cryptographic operations related to anonymity. This module implements the "Monero-like" features, including Ring Signatures and Confidential Transactions, to ensure total privacy.
*   **`bobcoin-consensus/`**: Implements the rules for agreeing on the ledger state. This includes the hybrid "Proof of Dance" / Proof of Stake logic and the "Solana-like" Proof of History sequencing.
*   **`bobcoin-dance/`**: A specialized library for processing and verifying "dance" data. This acts as the bridge between physical world inputs (exercise/game data) and the blockchain consensus.
*   **`bobcoin-node/`**: The binary application that runs the full node. It ties all the libraries together, handles peer-to-peer networking, and exposes APIs.

## Module Status & Versions

| Module | Version | Status | Description |
| :--- | :--- | :--- | :--- |
| **bobcoin-core** | 0.1.0 | 🟢 Stable | Core structs (Block, Tx) implemented. |
| **bobcoin-privacy** | 0.1.0 | 🟢 Beta | KeyPairs, Pedersen Commitments, Ring Signature structs. |
| **bobcoin-consensus** | 0.1.0 | 🟡 In Progress | Consensus traits defined. |
| **bobcoin-dance** | 0.1.0 | 🟢 Beta | Basic Move struct and verification logic. |
| **bobcoin-node** | 0.1.0 | 🟡 Alpha | Basic CLI entry point. |

## Build Information

*   **Current Version**: 0.1.3 (Target)
*   **Build Date**: 2025-12-29
*   **Platform**: win32
*   **Rust Edition**: 2021
