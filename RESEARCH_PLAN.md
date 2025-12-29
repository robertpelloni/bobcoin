# Bobcoin Research & Feasibility Plan

## 1. The "Trilemma" Conflict: Privacy vs. Speed
**The Problem:** Monero-style privacy (RingCT, Bulletproofs) creates large transaction sizes (~2kb - 13kb) and requires heavy verification time. Solana's speed (65k TPS) relies on tiny transactions and parallel processing (Sealevel).
*   **Research Question:** Can we implement privacy primitives that are "succinct" enough for high throughput?
*   **Potential Solutions to Investigate:**
    *   **ZK-Rollups (Zero-Knowledge Rollups):** Processing privacy off-chain and only settling proofs on-chain.
    *   **recursive SNARKs (e.g., Halo2, Plonky2):** Much faster verification than Bulletproofs.
    *   **Layer 2 Privacy:** Keep the base layer fast and transparent (like Solana), add privacy as a Layer 2.

## 2. "Proof of Dance" Verification (Updated Strategy)
**The Problem:** How do we prove physical movement without trusting a central server?
**New Proposal:** "Biometric Vouched Dance-Offs"
*   **Mechanism:**
    1.  **Biometric Binding:** User authenticates via local Secure Enclave (FaceID/TouchID). This generates a signature proving the *owner* is active, preventing bot farms.
    2.  **P2P Vouching (The "Dance Off"):** Two users must be physically close. Devices perform a cryptographic handshake (via NFC or Bluetooth LE).
    3.  **Witnessing:** User A's transaction includes a signature from User B, attesting "I saw User A dance."
*   **Research Question:** How do we preserve privacy while proving unique physical encounters?
    *   Can we use **ZK-Badges**? (Proving "I met a unique human" without revealing *who*).
    *   **Anti-Sybil:** If User A dances with User B 100 times, it yields diminishing returns.

## 3. Comparative Analysis (Existing Coins)
We must study why others haven't solved this yet.
*   **Monero (XMR):** The gold standard for privacy, but hard to scale.
*   **Solana (SOL):** The gold standard for speed, but zero privacy.
*   **Secret Network (SCRT):** Privacy via TEEs (hardware), not math.
*   **StepN / Sweatcoin:** Centralized "Move-to-Earn". Vulnerable to GPS spoofing.
*   **Mina Protocol:** Lightweight blockchain using recursive ZKPs.

## 4. Tokenomics & Sybil Resistance
**The Problem:** If "Dance" mints coins, how do we stop someone from shaking their phone with a machine (Sybil attack)?
*   **Proposed Solution (Biometric + Social):**
    *   **Hardware Binding:** Private keys stored in the phone's hardware security module (HSM).
    *   **Social Graph Weighting:** Rewards scale based on the *diversity* of dance partners. Dancing alone pays less than dancing with new people.

## Action Items
1.  [ ] **Cryptographic Benchmarking:** Measure verification time of `bulletproofs` vs `halo2` in Rust.
2.  [ ] **Architectural Decision:** Decide if Bobcoin is a Layer 1 (base chain) or a Layer 2.
3.  [ ] **Prototype Vouching Structs:** Update `bobcoin-dance` to include fields for `witness_signature` and `biometric_proof_flag`.
4.  [ ] **Hardware Constraint Analysis:** Can a standard phone generate the required "Proof of Dance" ZK-proof in under 1 second?
