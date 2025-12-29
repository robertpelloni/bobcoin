# Coin Research & Technical Analysis

This document catalogs technical research into comparable blockchain and game-economy projects. The goal is to identify mechanisms to adopt ("Frankenstein") or avoid.

## 1. Anti-Cheating in Move-to-Earn (StepN, Sweatcoin)

### **StepN (SMAC System)**
*   **Mechanism:** Centralized Server-Side AI.
*   **Data Inputs:** GPS tracking, Motion Sensors (Accelerometer/Gyroscope), Health Data (Apple Health/Google Fit).
*   **Validation Logic:**
    *   **Autoencoders (ML):** Uses neural networks to reconstruct movement patterns. If the reconstruction error is high (anomaly), the move is flagged.
    *   **Turing Score:** A user reputation score (0-100). Cheating drops the score; low scores disable earning.
    *   **Multi-Layer Detection:** Encoder -> Bottleneck -> Decoder architecture to filter out "shaking" vs "walking".
*   **Pros:** Highly effective against simple bot farms (shaking machines).
*   **Cons:** **Centralized.** Requires trusting StepN's servers. Not privacy-preserving (server sees all GPS data).
*   **Relevance to Bobcoin:** We cannot use server-side AI if we want P2P. We must rely on **Social Vouching** (The Dance-Off) or **Zero-Knowledge Machine Learning (ZKML)** to prove the model ran locally.

### **Sweatcoin**
*   **Mechanism:** "Sweatcoin Step Verification Algorithm" (Server-side).
*   **Logic:** Analyzes consistency of speed and movement patterns. Filters out "shakes and bumps".
*   **Privacy:** Anonymizes data before analysis, but still requires data upload.
*   **Key Takeaway:** The industry standard is **Server-Side Validation**. Bobcoin's "Client-Side + Vouching" approach is novel and risky but necessary for decentralization.

## 2. Architecture for "Game Points" (Nano / Block Lattice)

### **Nano (XNO)**
*   **Architecture:** **Block Lattice**.
*   **Mechanism:**
    *   Each account has its own blockchain.
    *   To send money, User A adds a `Send` block to *their* chain.
    *   To receive money, User B adds a `Receive` block to *their* chain.
    *   No global lock. Transactions are asynchronous.
*   **Consensus:** Open Representative Voting (ORV). Nodes vote on conflicting blocks (double spends) only.
*   **Performance:** Instant (sub-second), infinite scalability (theoretically), zero fees.
*   **Relevance to Bobcoin:** **High.** This fits the "Game Point" model perfectly.
    *   Player A (Dancer) adds a "Dance Block" to their chain (minting points).
    *   Player B (Witness) adds a "Vouch Block" to their chain (referencing Player A).
    *   No global contention for a single "block".
    *   **Action Item:** Investigate `rsnano` (Rust implementation) as a potential architectural base instead of a monolithic chain.

## 3. Lightweight Verification (Mina Protocol)

### **Mina Protocol**
*   **Core Tech:** **Recursive zk-SNARKs** (`Kimchi` proof system).
*   **Mechanism:**
    *   Instead of downloading the blockchain, a node downloads a tiny (~22kb) Zero-Knowledge proof.
    *   This proof certifies that "The state is valid, and all history leading up to it was valid."
*   **Mobile Feasibility:** **Extremely High.** A smartphone can verify the entire network state in milliseconds.
*   **Rust Availability:** The `kimchi` proving system is written in Rust (by O(1) Labs).
*   **Relevance to Bobcoin:**
    *   We could use Recursive SNARKs to compress the "Dance History".
    *   Instead of storing every dance move forever, we store a proof that "User X danced Y times with Z intensity".
    *   **Challenge:** High complexity. Generating proofs on mobile is battery-intensive (though verifying is cheap).

## 4. Synthesis & Recommendations

### **The "Bobcoin Lattice" Proposal**
Combine **Nano's Block Lattice** with **Social Vouching**:
1.  **Structure:** Every user has a local "Scorecard Chain" (Nano-style).
2.  **Mining:** You mine by appending a `DanceSession` block to your own chain.
3.  **Validity:** A `DanceSession` block is *only* valid if it references a `VouchSignature` from a peer.
4.  **Consensus:** The network only steps in to resolve "Double Vouching" (e.g., User B vouches for User A and User C at the exact same time in different places).

### **Technology Stack Refinement**
*   **Networking:** `libp2p` (Keep current path).
*   **Data Structure:** Directed Acyclic Graph (DAG) / Block Lattice (Pivot from Monolithic Blockchain).
*   **Verification:** `bobcoin-dance` logic (Client-side) + Social Vouching (P2P).
