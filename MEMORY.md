# Internal Project Memory (Bobcoin)

### Architectural Observations
*   **Dual-Consensus Parity**: The system relies on absolute 1:1 mathematical parity between `bobcoin-consensus` (JS) and `go-lattice` (Go). Any divergence in float precision or logic order results in a network fork.
*   **Block-Lattice Structure**: Each account maintains its own sequential chain. Cross-chain state (like AMM pools or Multisigs) is updated by consensus blocks targeting specific system-links (`AMM_LIQUIDITY`, `DAO_PROPOSAL`).
*   **Systemic Demurrage**: A continuous decay rate is applied to liquid balances. This ensures BOB remains a transactional currency and finances the oracle layer.
*   **SPoRA Mining**: Proof-of-Access is enforced by requiring miners to answer challenges linked to specific data chunks in the "Bobtorrent" dataset.
*   **Total Supply Tracking**: (v8.107.3) The protocol now deterministically tracks total supply by calculating deltas for every block type that creates (rewards), burns (fees), or locks (AMM) BOB.

### Design Preferences
*   **Go Migration**: The project is aggressively moving towards Go for all performance-critical backend services (`go-lattice`, `go-game-server`, `go-supertorrent`).
*   **Strict Typing**: (v8.107.0+) The protocol now enforces explicit `height` and `staked_balance` fields in every block to remove backend compatibility shims.
*   **Multisig Security**: (v8.107.3) Proposing or approving multisig transactions requires the signer to be an explicit member of the vault's participant set.
*   **AI-Enhanced Oracles**: The game server uses statistical analysis (variance, MAD) on input logs to detect and reject robotic macro-usage.

### Build & Tooling
*   **Frontend**: Built with Vite and React. Requires `--legacy-peer-deps` due to package conflicts.
*   **WASM**: Storage and encryption logic often utilize WASM modules (`node-seal`, Go-compiled storage kernel).
*   **Parity Verification**: Parity is verified by replaying shared fixture JSONs onto both engines and comparing the resulting state hashes and Merkle roots.
