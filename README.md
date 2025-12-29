# Bobcoin Core & Research

**This is the central research hub and module repository for the Bobcoin ecosystem.**

**IMPORTANT:** Bobcoin is a **Game Point System**, not a financial cryptocurrency. We prioritize fun, health, and community over speculation.

This repository is **not** intended to be a standalone node binary. Instead, it functions as a **library workspace** and **brainstorming lab**. The crates developed here (`bobcoin-dance`, `bobcoin-privacy`, etc.) are designed to be consumed as submodules in various external projects:

*   **StepMania:** Implementing "Proof of Dance" verification for rhythm game scores.
*   **OkGame:** Integrating economy and movement verification.
*   **Fwber:** (Project details TBD).

## 📚 Workspace Modules

| Crate | Purpose | Status |
| :--- | :--- | :--- |
| **`bobcoin-dance`** | The core logic for verifying physical movement, intended for game engines. | 🟢 Stable API |
| **`bobcoin-privacy`** | Cryptographic primitives (Ring Signatures, Bulletproofs) for anonymous transactions. | 🟡 Research |
| **`bobcoin-core`** | Shared data structures (Blocks, Transactions) used across the ecosystem. | 🟢 Stable |
| **`bobcoin-consensus`** | Experiments in timing and agreement (Proof of History / Vouching). | 🟡 Research |
| **`bobcoin-node`** | *Experimental* P2P networking reference implementation. | 🟡 Prototype |

## 🧪 Research Areas

*   **Biometric Vouching:** How to use FaceID/TouchID to prevent Sybil attacks in P2P games.
*   **Mobile ZK-Proofs:** Feasibility of generating zero-knowledge proofs on mobile chips.
*   **P2P Mesh:** Battery-efficient networking for mobile devices (`libp2p` configuration).

## 🛠 Integration

To use these crates in your project:

```toml
[dependencies]
bobcoin-dance = { git = "https://github.com/your-username/bobcoin", path = "bobcoin-dance" }
```

*Note: FFI bindings for C++ (StepMania) are planned but not yet implemented.*
