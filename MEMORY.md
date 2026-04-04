# AI Memory & Architectural Observations

## Codebase Anomalies & Quirks
- **Restored Entry Points:** In v2.6.1, `game-server/server.js` and `database.js` have been fully restored and hardened to handle live frontend UI interactions, replacing the mock JSON/frontend API.
- **Port Mapping Clarification:** `game-server` now defaults to `3001` out-of-the-box in `server.js` (`process.env.PORT || 3001`) to match the Docker host mapping and simplify local development. `frontend` directly targets `http://localhost:3001`.

## Design Preferences & Conventions
- **Strict Completeness:** A feature is not considered "done" unless it is fully represented in the UI, has error handling, and is documented in the Manual. No hidden backend-only features.
- **Robustness over Hacks:** Prefer SQLite/PostgreSQL over raw JSON files for data persistence.
- **Styling:** The project strictly utilizes Vanilla CSS with a "Cyberpunk" aesthetic. Do not introduce TailwindCSS or other utility frameworks unless instructed.
- **Version Control:** The global version is tightly controlled. All AI agents must update `CHANGELOG.md` and reference the version bump in their commit messages.

## Git Submodule Structure
- The `research/forest` and `research/solana` directories exist but are throwing `.gitmodules` mapping errors, indicating they were cloned or moved without proper submodule initialization. They are treated as untracked/modified content by the root git instance.

## Go Port Reality Check (v8.13.0)
- The Go lattice is now much closer to Node parity, but the repository is still a hybrid system rather than a pure-Go platform.
- Newly closed parity gaps:
  - Go now exposes additional compatibility routes: `/frontier`, `/anchors/:account`, `/votes/:proposalHash`, `/nfts`, `/nfts/:account`, `/multisig/:account`.
  - Go now supports more block/state types: `achievement_unlock`, `swap_lock`, `swap_claim`, `transfer_nft`, `publish_manifest`.
  - Go bootstrap snapshots now include proposals, votes, market bids, swaps, NFTs, anchors, and multisigs.
  - Go now rejects unknown block types explicitly and delays state-hash mutation until successful block application.
- Remaining architectural truth:
  - `game-server` and `supertorrent` are still Node services.
  - Rust/SP1 remains the correct place for proof generation/verification.
  - Some semantics still need final reconciliation between Node and Go, especially around economic edge cases and non-lattice service behavior.
- Audit architecture note:
  - As of v8.19.0, the Go `AuditState()` routine no longer only loops over existing maps; it replays ordered blocks onto a shadow lattice and re-derives runtime state from history.
  - Legacy anchor/manifest blocks may contain payloads that were historically mutated with derived fields (`id`, `owner`, `timestamp`, `type`) after signing, so audit hash checks must tolerate and normalize that legacy condition.
  - A latent merkle deadlock was identified in normal-mode block processing when a locked write path attempted to call a merkle helper that re-acquired a read lock. Internal lock-free merkle derivation should be used from locked callers.
  - As of v8.21.0, failed Go persistence writes are expected to roll back in-memory state and trigger audit-based reconstruction rather than leaving partially-applied consensus mutations resident in memory.
  - As of v8.22.0, `SYSTEM_GENESIS` bypass semantics are intentionally single-use only; once any chain exists, later `SYSTEM_GENESIS` opens should be rejected rather than treated as valid bootstrap events.
  - As of v8.22.0, proposal status is refreshed in Go both during block processing and proposal/vote reads so expired governance records do not remain indefinitely `Active`.
  - As of v8.24.0, the Go test suite explicitly covers the economic parity path for `accept_bid` and `data_anchor`, so these behaviors are now guarded by regression tests rather than only manual reasoning.
  - As of v8.26.0, the Go regression suite also covers swap lifecycle behavior, NFT transfer ownership semantics, and publish-manifest anchor replay through audit reconstruction.
- Operational convention:
  - In this repo, the in-repo Go lattice defaults to port `4001`.
  - The older Node lattice defaults to port `4000`.
  - Any new Go-facing frontend/archive integration should target `4001` unless explicitly overridden.
