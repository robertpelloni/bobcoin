# Bobcoin Project Dashboard

## Project Structure Overview

The Bobcoin project is organized as a Rust workspace containing several crates, each responsible for a specific domain of the blockchain's functionality. This modular architecture allows for parallel development, easier testing, and clear separation of concerns.

The Python implementation in `bobcoin/` serves as a reference prototype for the Rust implementation.

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
| **bobcoin-economy** | 0.1.0 | 🟡 In Progress | Economy: Anti-hoarding, Demurrage. |
| **bobcoin-mining** | 0.1.0 | 🟡 In Progress | Mining: Social Value, Relationship Verification. |

## Migration Status (Python -> Rust)

The following features exist in the Python prototype and need to be ported to Rust:

| Feature | Python Source | Rust Destination | Status |
| :--- | :--- | :--- | :--- |
| **Anti-Hoarding / Demurrage** | `bobcoin/economy/anti_hoarding.py` | `bobcoin-economy` (New Crate) | 🔴 Pending |
| **Dating App Logic** | `bobcoin/economy/dating_app.py` | `bobcoin-economy` (New Crate) | 🔴 Pending |
| **Exercise Game** | `bobcoin/economy/exercise_game.py` | `bobcoin-dance` / `bobcoin-economy` | 🟡 Partial |
| **Social Value Mining** | `bobcoin/mining/social_value_mining.py` | `bobcoin-mining` (New Crate) | 🔴 Pending |
| **Relationship Verifier** | `bobcoin/mining/relationship_verifier.py` | `bobcoin-mining` (New Crate) | 🟢 Completed |

## Build Information

*   **Current Version**: 0.1.6 (Target)
*   **Build Date**: 2025-12-29
*   **Platform**: win32
*   **Rust Edition**: 2021
