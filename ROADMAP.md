# Bobcoin Roadmap

## Phase 1: Foundation & Documentation (Completed)
- [x] Initialize repository
- [x] Establish documentation standards (AGENTS.md, CLAUDE.md)
- [x] Define project structure and architecture (Rust Workspace)
- [x] Set up CI/CD pipelines (Basic Build/Test)
- [x] Research & Feasibility Analysis (FEATURES_AND_FORKS.md)

## Phase 2: Core Architecture Implementation (In Progress)
- [x] **Core Structures (`bobcoin-core`)**
    - [x] Define `Block`, `Transaction`, `TxInput`, `TxOutput` structs.
    - [x] Implement SHA-256 Hashing and Serialization traits.
- [ ] **Consensus Engine (`bobcoin-consensus`)**
    - [ ] Define `Consensus` trait and `PoH` (Proof of History) scaffolding.
    - [ ] Implement VDF (Verifiable Delay Function) logic.
    - [ ] Define slot/epoch scheduling.
- [x] **Privacy Layer (`bobcoin-privacy`)**
    - [x] Implement `KeyPair` generation (Ristretto).
    - [x] Implement Pedersen Commitments.
    - [x] Scaffold Ring Signatures.
    - [ ] Integrate Bulletproofs range proofs.
- [x] **Proof of Dance (`bobcoin-dance`)**
    - [x] Define `DanceMove` struct and serialization.
    - [x] Implement `GrooveVerifier` trait.
    - [x] Implement `DanceOffSession` with Witness/Biometric fields.
    - [ ] Develop ML model interfaces for motion verification.

## Phase 3: Node & Network Implementation
- [x] **Node Application (`bobcoin-node`)**
    - [x] Basic CLI entry point with versioning.
    - [ ] Implement P2P networking stack (`libp2p` with QUIC/Relay).
    - [ ] Implement RPC/API layer for clients.
- [ ] **Storage & State**
    - [ ] Implement Ledger database integration (RocksDB/Sled).
    - [ ] Implement UTXO set management.

## Phase 4: Client Ecosystem
- [ ] **Mobile "Dancer" Client**
    - [ ] React Native/Flutter prototype.
    - [ ] Sensor data capture and signing.
    - [ ] Biometric integration (TouchID/FaceID).
- [ ] **Wallet Application**
    - [ ] Address generation and key management.
    - [ ] Transaction creation and signing.

## Phase 5: Testing & Security
- [ ] Comprehensive unit and integration testing.
- [ ] Security audit of consensus logic and crypto primitives.
- [ ] Stress testing network capabilities (TPS benchmarks).

## Phase 6: Launch
- [ ] Testnet deployment.
- [ ] Mainnet launch.
