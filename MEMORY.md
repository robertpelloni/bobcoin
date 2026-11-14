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

### Recent Validation (v8.114.2)
*   **Demurrage & Governance Parity**: Successfully ran the `test_e2e_governance.cjs` end-to-end integration suite, completely verifying absolute 1:1 mathematical parity between `bobcoin-consensus` (JS) and `go-lattice` (Go).
*   **Scope of Verification**: The simulated verification includes complex multi-account cross-actions at identical timestamps, ensuring the execution order of `UPDATE_DEMURRAGE`, `AMM_SWAPS`, quadratic voting tallying, and total supply calculation matches precisely with zero precision drift between the Node.js floats and Go implementations.
*   **Status**: No divergences in balances or block heights were detected. The demurrage decay calculations and governance quorum mechanisms are stable under stress-tested scenarios, validating the system state for v8.114.2.

### Session Note (v8.117.0, 2026-11-14)
* **Dashboard is the product surface**: `/` embeds all 17 routes in 8 tabs; standalone routes are deep-link/fullscreen views only. Guarded by `testing/dashboard_coverage.py`.
* **Tooltip rule is now enforced, not aspirational**: every `<button>` needs a descriptive `title=`; the old TODO claim was false for ~62 buttons.
* **Windows is a first-class runtime**: `start.ps1`/`stop.ps1` + tray via recorded `.services.pids`; POSIX `start.sh` mirrors ports/logs. All heavyweight children run BelowNormal/niced.
* **Nothing was running at session start**: ports 3001/4001/8000/4173 free; MS Edge CDP live on 9222 with no page targets listed.

