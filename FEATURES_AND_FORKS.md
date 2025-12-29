# Bobcoin Feature Spec & Resource List

## 1. Feature Matrix

### ✅ The "Must Haves" (Core Identity)
*   **Language:** Rust (Safety, Performance, Concurrency).
*   **Consensus:** "Proof of Dance" (Biometric + Social Vouching + Sensor Data).
*   **Privacy:** Confidential Transactions (Hidden Game Points) + Sender Anonymity (Ring Signatures or ZK-Proofs).
*   **Speed:** < 1 second block times (Instant feedback for dancers).
*   **Mobile-First:** The "Miner" is a smartphone, not a server. Light client architecture is mandatory.
*   **Sybil Resistance:** Biometric binding (TouchID/FaceID) + Social Graph trust scores.

### ❌ The "Anti-Features" (What we avoid)
*   **Public Ledger:** No transparent transaction history (like Bitcoin/Solana default).
*   **ASIC/GPU Mining:** We do not want industrial farms; we want physical movement.
*   **EVM Compatibility:** (For now). We don't need Ethereum's bloat. We need a specialized high-performance state machine.
*   **Long Settlement:** Waiting 10 minutes for confirmation kills the "game" aspect.
*   **Trusted Oracles:** We avoid centralized servers verifying the dance. Verification must be P2P or ZK-Client-Side.
*   **Financial Speculation:** Bobcoin is for Game Points, not financial hoarding or speculation.

---

## 2. Potential Projects to Fork / Study

### 🔹 **Substrate (Polkadot SDK)**
*   **Status:** **Strong Contender for Base Architecture.**
*   **Why:** Substrate is a "blockchain builder kit" written in pure Rust. It allows swapping consensus engines easily.
*   **Pros:** modular consensus traits, built-in `libp2p` networking, Wasm runtime updates.
*   **Cons:** High learning curve.

### 🔹 **Iron Fish** (Reference Only)
*   **Status:** **Rejected as direct fork base.**
*   **Reason:** It is a hybrid Rust/TypeScript codebase. Bobcoin aims for pure Rust for performance/embedded compatibility.
*   **Use Case:** Excellent reference for ZK-Transaction structure and UTXO handling.

### 🔹 **Solana** (Reference Only)
*   **Status:** **Reference for Gossip/Parallelism.**
*   **Reason:** Too complex to fork directly.
*   **Use Case:** We will copy their "Gossip Service" architecture for fast peer communication.

---

## 3. Technology Stack Recommendations

| Component | Recommendation | Why? |
| :--- | :--- | :--- |
| **P2P Networking** | **`libp2p`** (Rust) | Industry standard. Used by Substrate/Polkadot. |
| **Database** | **`RocksDB`** | Battle-tested key-value store. |
| **Cryptography** | **`bulletproofs`** & **`curve25519-dalek`** | Matches Monero's proven stack. |
| **Serialization** | **`bincode`** | Minimal overhead, standard in Rust crypto. |
| **Biometrics** | **WebAuthn / FIDO2** | Standard for utilizing Secure Enclave (TouchID/FaceID) on devices. |

## 4. Mobile Architecture (Light Client)
*   **Protocol:** **QUIC** (via `libp2p-quic`) for fast connection setup and 0-RTT handshakes.
*   **Discovery:** **Kademlia DHT (Client Mode)** to find peers without draining battery.
*   **NAT Traversal:** **Circuit Relay v2** + **DCUtR** (Hole Punching) to allow two phones to talk directly behind carrier NATs.
*   **Local Discovery:** **mDNS** to find other dancers on the same WiFi network.

## 5. Proposed Architecture (Pure Rust)
1.  **Framework:** Build using **Substrate** components OR a custom minimal Rust implementation (Current Path).
2.  **Consensus:** Custom `ProofOfDance` struct that implements a standard `Verifier` trait.
3.  **Network:** `libp2p` swarm optimized for mobile (Gossipsub Lazy + Relay Client).
4.  **Transaction:** UTXO-based with Pedersen Commitments (hiding values) and Ring Signatures (hiding sender).
