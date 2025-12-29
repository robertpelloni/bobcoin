# Bobcoin Architecture Specification

## 1. Overview
Bobcoin is a high-performance, privacy-preserving game point system that introduces a novel "Proof of Dance" (PoD) mechanism. It combines the sub-second finality of Solana's Proof of History/Stake architecture with robust privacy guarantees, all powered by physical human movement.

## 2. Hybrid Consensus Mechanism
Bobcoin utilizes a dual-layer consensus model to balance speed, fair distribution, and fun.

### 2.1. The "Rhythm" Consensus (PoS + PoD)
*   **Block Production (The Beat):** Time is divided into slots (approx. 400ms).
*   **Validators (The Judges):** High-performance nodes that participate in Proof of Stake. They vote on the validity of blocks and finalize the game state.
*   **Miners (The Dancers):** Users who perform "Proof of Dance" to earn the right to propose blocks or earn Game Points.

### 2.2. Workflow
1.  **Dance Submission:** Dancers broadcast signed motion data packets (Dance Proofs) to the network.
2.  **Block Proposal:** A Leader Validator is selected via a Verifiable Delay Function (VDF) weighted by Stake. The Leader selects a set of valid Dance Proofs to include in the block.
3.  **Validation:** Validators verify the transfers and the validity of the Dance Proofs (using the ML Verifier).
4.  **Finalization:** Validators vote on the block. Once >2/3 supermajority is reached, the block is finalized.

## 3. Proof of Dance (PoD) Specification

### 3.1. Concept
PoD replaces the arbitrary energy waste of traditional PoW with physical human effort. It serves as a mechanism for fair token distribution and entropy generation.

### 3.2. Technical Implementation
*   **Input Data:** 
    *   3-axis Accelerometer (x, y, z)
    *   3-axis Gyroscope (pitch, roll, yaw)
    *   Heart Rate (for liveness detection)
    *   Timestamp
*   **Data Structure:** `DancePacket = { MotionData[], Biometrics, DeviceSignature, BlockHash }`

### 3.3. Validation Protocol (The "Groove" Algorithm)
Validators run a lightweight TensorFlow Lite model (The Groove Engine) to verify:
1.  **Liveness:** Heart rate correlates with motion intensity.
2.  **Humanity:** Motion patterns match human biomechanics (filtering out mechanical shakers).
3.  **Uniqueness:** The dance pattern has not been submitted before (preventing replay attacks).
4.  **Effort:** A "Kinetic Energy Score" is calculated. Higher score = higher probability of block reward.

### 3.4. Anti-Spoofing
*   **Trusted Execution Environment (TEE):** Mobile app requires TEE (e.g., ARM TrustZone) to sign motion data directly from hardware sensors.
*   **Challenge-Response:** The network may issue a "Dance Move Challenge" (e.g., "Jump now") that must be reflected in the motion data within a specific latency window.

## 4. Privacy Layer
Bobcoin implements "Fast Privacy" by optimizing Monero's primitives for a high-throughput environment.

### 4.1. Cryptographic Primitives
*   **Ring Signatures (CLSAG):** Concise Linkable Spontaneous Anonymous Group signatures to hide the sender. Optimized for batch verification to reduce validation time.
*   **Stealth Addresses:** One-time destination addresses to hide the receiver.
*   **RingCT (Bulletproofs+):** Hides transaction amounts with compact range proofs.

### 4.2. Performance Optimizations
*   **Parallel Verification:** Unlike Monero's sequential processing, Bobcoin Validators verify Ring Signatures in parallel across GPU cores (utilizing Solana's Sealevel runtime philosophy).
*   **Pruning:** Since privacy features bloat chain size, Storage Nodes are separated from Validator Nodes. Validators only need the UTXO set (commitment set) and recent history.

## 5. Node Structure

### 5.1. Validator Nodes (Judges)
*   **Role:** Order transactions, execute smart contracts, verify Dance Proofs, vote on consensus.
*   **Hardware:** High CPU/GPU requirements (for parallel signature verification and ML inference), high RAM.
*   **Incentive:** Transaction fees + Commission on Dance Rewards.

### 5.2. Dance Nodes (Dancers)
*   **Role:** Generate PoD data.
*   **Hardware:** Smartphones, Smartwatches, IoT wearables.
*   **Incentive:** Block rewards (newly minted BOB).

### 5.3. Storage Nodes (Archivists)
*   **Role:** Store the full ledger history and encrypted transaction data.
*   **Hardware:** High storage capacity (HDD/SSD arrays).
*   **Incentive:** Storage rent fees paid by users accessing old history.

### 5.4. Observer Nodes
*   **Role:** Light clients for wallets to query balance and broadcast transactions without downloading the full chain.

## 6. Network Topology
*   **Gossip Protocol:** Uses a Turbine-like block propagation protocol to stream data to Validators rapidly.
*   **Dance Channels:** Dedicated UDP channels for high-frequency motion data ingestion.

## 1. Overview
Bobcoin is a high-performance, privacy-preserving game point system that introduces a novel "Proof of Dance" (PoD) mechanism. It combines the sub-second finality of Solana's Proof of History/Stake architecture with robust privacy guarantees, all powered by physical human movement.

## 2. Hybrid Consensus Mechanism
Bobcoin utilizes a dual-layer consensus model to balance speed, fair distribution, and fun.

### 2.1. The "Rhythm" Consensus (PoS + PoD)
*   **Block Production (The Beat):** Time is divided into slots (approx. 400ms).
*   **Validators (The Judges):** High-performance nodes that participate in Proof of Stake. They vote on the validity of blocks and finalize the game state.
*   **Miners (The Dancers):** Users who perform "Proof of Dance" to earn the right to propose blocks or earn Game Points.

### 2.2. Workflow
1.  **Dance Submission:** Dancers broadcast signed motion data packets (Dance Proofs) to the network.
2.  **Block Proposal:** A Leader Validator is selected via a Verifiable Delay Function (VDF) weighted by Stake. The Leader selects a set of valid Dance Proofs to include in the block.
3.  **Validation:** Validators verify the transfers and the validity of the Dance Proofs (using the ML Verifier).
4.  **Finalization:** Validators vote on the block. Once >2/3 supermajority is reached, the block is finalized.

## 3. Proof of Dance (PoD) Specification

### 3.1. Concept
PoD replaces the arbitrary energy waste of traditional PoW with physical human effort. It serves as a mechanism for fair token distribution and entropy generation.

### 3.2. Technical Implementation
*   **Input Data:** 
    *   3-axis Accelerometer (x, y, z)
    *   3-axis Gyroscope (pitch, roll, yaw)
    *   Heart Rate (for liveness detection)
    *   Timestamp
*   **Data Structure:** `DancePacket = { MotionData[], Biometrics, DeviceSignature, BlockHash }`

### 3.3. Validation Protocol (The "Groove" Algorithm)
Validators run a lightweight TensorFlow Lite model (The Groove Engine) to verify:
1.  **Liveness:** Heart rate correlates with motion intensity.
2.  **Humanity:** Motion patterns match human biomechanics (filtering out mechanical shakers).
3.  **Uniqueness:** The dance pattern has not been submitted before (preventing replay attacks).
4.  **Effort:** A "Kinetic Energy Score" is calculated. Higher score = higher probability of block reward.

### 3.4. Anti-Spoofing
*   **Trusted Execution Environment (TEE):** Mobile app requires TEE (e.g., ARM TrustZone) to sign motion data directly from hardware sensors.
*   **Challenge-Response:** The network may issue a "Dance Move Challenge" (e.g., "Jump now") that must be reflected in the motion data within a specific latency window.

## 4. Privacy Layer
Bobcoin implements "Fast Privacy" by optimizing Monero's primitives for a high-throughput environment.

### 4.1. Cryptographic Primitives
*   **Ring Signatures (CLSAG):** Concise Linkable Spontaneous Anonymous Group signatures to hide the sender. Optimized for batch verification to reduce validation time.
*   **Stealth Addresses:** One-time destination addresses to hide the receiver.
*   **RingCT (Bulletproofs+):** Hides transaction amounts with compact range proofs.

### 4.2. Performance Optimizations
*   **Parallel Verification:** Unlike Monero's sequential processing, Bobcoin Validators verify Ring Signatures in parallel across GPU cores (utilizing Solana's Sealevel runtime philosophy).
*   **Pruning:** Since privacy features bloat chain size, Storage Nodes are separated from Validator Nodes. Validators only need the UTXO set (commitment set) and recent history.

## 5. Node Structure

### 5.1. Validator Nodes (Judges)
*   **Role:** Order transactions, execute smart contracts, verify Dance Proofs, vote on consensus.
*   **Hardware:** High CPU/GPU requirements (for parallel signature verification and ML inference), high RAM.
*   **Incentive:** Transaction fees + Commission on Dance Rewards.

### 5.2. Dance Nodes (Dancers)
*   **Role:** Generate PoD data.
*   **Hardware:** Smartphones, Smartwatches, IoT wearables.
*   **Incentive:** Block rewards (newly minted BOB).

### 5.3. Storage Nodes (Archivists)
*   **Role:** Store the full ledger history and encrypted transaction data.
*   **Hardware:** High storage capacity (HDD/SSD arrays).
*   **Incentive:** Storage rent fees paid by users accessing old history.

### 5.4. Observer Nodes
*   **Role:** Light clients for wallets to query balance and broadcast transactions without downloading the full chain.

## 6. Network Topology
*   **Gossip Protocol:** Uses a Turbine-like block propagation protocol to stream data to Validators rapidly.
*   **Dance Channels:** Dedicated UDP channels for high-frequency motion data ingestion.

