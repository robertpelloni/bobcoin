# Bobcoin Project Architecture & Learnings

## Core Architecture & Philosophy
* **Goal:** Bobcoin is transitioning from a financial cryptocurrency into a **P2P Game Point System** ("Universal Achievement Layer"). Explicit anti-features include financial speculation, ASIC/GPU mining, and public transaction histories. The focus is entirely on physical activity, community building, and fun.
* **Consensus Mechanism:** The network operates on a unique hybrid consensus:
  * **Proof-of-Play (PoP):** Rhythm game scores or other physical actions are verified via **Zero-Knowledge Proofs (ZKPs)** using the SP1 RISC-V zkVM framework to validate scores natively. In earlier phases, this was simulated with AI/Variance heuristics.
  * **Succinct Proof of Random Access (SPoRA):** Borrowed from Arweave, storage nodes must continuously prove they host specific "anchor" WebTorrent files (e.g., arcade core files) to mine the next block. 
  * **Asynchronous Block Lattice:** Inspired by Nano, each user maintains their own blockchain (account chain). This ensures extremely high throughput and feeless updates.
* **Privacy ("White-Magic Privacy"):** Implemented via Stealth Addresses, Ring Signatures, and X25519 encrypted memos. Users can send private, encrypted notes attached to transactions.
* **Game Mechanics & Economy:** Features Demurrage (decay of dormant balances) and a Quadratic Voting DAO system where voting power scales logarithmically with a user's token balance and trust score. FHE (Fully Homomorphic Encryption) using Microsoft SEAL ensures the Game Server can compute game logic blindly over encrypted user scores.

## Codebase Structure & Porting
* **Language Pivot:** The project originated heavily in Node.js/JavaScript but is undergoing a massive, systematic port to **Go (Golang)** for institutional-grade performance.
* **Key Modules:**
  * **`bobcoin-consensus` (JS):** The original reference implementation of the Block Lattice (`Lattice.js`) and cryptographic utilities.
  * **`go-lattice` (Go):** The high-performance Go port of the consensus engine, implementing strict parity checks against the JS reference.
  * **`game-server` (JS) -> `go-game-server` (Go):** The orchestration layer handling matchmaking (WebRTC/WebSocket), ZK proof endpoints, FHE computation, and the system minting wallet. The Go port implements these natively (e.g., calling `node-seal` via `exec.Command` and simulating SP1 delays) rather than relying on an HTTP bridge.
  * **`supertorrent` (JS) -> `go-supertorrent` (Go):** The decentralized storage and data availability market (Bobtorrent). It uses WebTorrent for file hosting and enforces SPoRA for mining.
  * **`proof-of-play` (Rust):** The native SP1 Zero-Knowledge verification service.
  * **`frontend` (React/Vite):** A Progressive Web App (PWA) with offline capabilities featuring an interactive 3D WebGL block topology dashboard (`@react-three/fiber`), a pure mathematical Web Audio Synthesizer, and zero-trust cryptographic seed generation.

## Technical Patterns & Decisions
* **Strict Semantic Parity:** A major focus of the Go porting effort is ensuring absolute 1:1 execution parity between `Lattice.js` and `lattice.go`. This involves deep regression testing (`lattice_parity_test.go` vs `test_replay_semantics.js`) covering edge cases like same-timestamp replay ordering, durable cold-boot SQLite recovery, cascading multi-account recovery, and HTLC (Atomic Swap) expiries.
* **Governance Enactment Delays:** Both consensus engines have been updated to support `enactmentDelay` for DAO proposals. When a proposal hits its `endTime` and passes, its action (e.g., `MINT_TREASURY`) is delayed from execution until `timestamp >= endTime + enactmentDelay`.
* **Zero-Knowledge & FHE Native Porting:** Instead of using an HTTP Proxy bridge to pass payloads from the Go game server back to the old Node server for processing, the `go-game-server` now executes native `fheUtils.js` scripts directly and simulates SP1 ZK delays internally. This streamlines the architecture towards standalone Go binaries.
* **Testing:** The Go test suite makes extensive use of `httptest` and temporary SQLite databases. Skipping tests (using `t.Skip()`) is heavily preferred over deleting them or "commenting them out" when functionality (like the proxy bridge) is explicitly deprecated.

## Documentation Standards
* Maintain rigorous tracking via `ROADMAP.md` (long-term goals), `TODO.md` (immediate tasks), `CHANGELOG.md`, `HANDOFF.md`, and `IDEAS.md`.
* Ensure extremely detailed, in-depth code comments explaining the 'what', 'why', edge cases, optimizations, and side effects.
* The `UNIVERSAL_INSTRUCTIONS.md` (or equivalent `AGENTS.md`) is the master document guiding AI execution across the entire workspace.