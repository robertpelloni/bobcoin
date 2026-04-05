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
  - As of v8.28.0, the Go regression suite also covers mixed-history multi-account replay across `send`, `open`, `data_anchor`, `market_bid`, and `accept_bid`, with audit reconstruction expected to rebuild corrupted derived maps deterministically.
  - As of v8.30.0, the Go parity suite also covers durable SQLite-backed recovery of mixed historical ledgers, not just in-memory replay, so restart semantics are now part of the regression surface.
  - As of v8.31.0, the durable recovery suite also covers restart-time reconstruction of NFT ownership changes, claimed swap state, and expired-governance terminal status inside larger multi-account historical ledgers.
  - As of v8.33.0, Go audit replay no longer assumes a single global timestamp sort is sufficient; replay proceeds in dependency-resolving passes so same-timestamp cross-account dependencies can still reconstruct correctly.
  - As of v8.34.0, cold-boot SQLite recovery follows the same dependency-resolving replay model, and persisted block reads are deterministically ordered by timestamp/account/height/hash so restart behavior is both stable and robust against same-timestamp cascading dependencies.
  - As of v8.37.0, Go replay resolves dependencies within each timestamp bucket before advancing to later timestamps, preventing later governance-expiry transitions from invalidating deferred same-timestamp proposal/vote history during replay.
  - As of v8.37.0, vote validity in Go is determined by the block timestamp, not wall-clock time, so historical replay and recovery remain deterministic even long after the original proposal expired in real time.
  - As of v8.38.0, Go HTLC claim validity is also determined by the claim block timestamp rather than wall-clock time, and the default `swap_lock` expiry is derived from the block timestamp rather than machine time, removing another replay-time nondeterminism source.
  - As of v8.39.0, the Node reference lattice has been aligned on the same replay-critical time semantics: proposal votes and HTLC claims are validated against block timestamps, and default HTLC expiry derives from block timestamp rather than `Date.now()`.
  - As of v8.39.0, `bobcoin-consensus/npm test` now provides executable replay-semantics regression coverage for the Node reference implementation instead of having no real test command.
  - As of v8.40.0, the Node reference lattice now refreshes/finalizes proposal status from ledger time during block processing, bringing normal proposal lifecycle advancement closer to the Go implementation.
  - As of v8.40.0, the Node replay suite also covers mixed governance + HTLC histories so cross-client parity work is no longer limited to isolated single-feature time semantics.
  - As of v8.41.0, Go now has durable SQLite-backed recovery coverage for a demurrage-sensitive governance + HTLC ledger, giving the mixed-feature replay work a persisted-restart dimension rather than only in-memory execution.
  - As of v8.41.0, both Node and Go now exercise mixed governance + HTLC historical ledgers, so cross-client parity work has advanced from isolated time semantics into mirrored multi-feature replay scenarios.
  - As of v8.42.0, both Node and Go now also exercise same-timestamp mixed governance + HTLC ledgers, so timestamp-bucket replay behavior is being validated in cross-client mirrored scenarios rather than only in single-feature tests.
  - As of v8.42.0, Go durable recovery now explicitly covers same-timestamp mixed governance + HTLC reconstruction under hostile cross-account ordering, not just same-timestamp single-feature cases.
- Operational convention:
  - In this repo, the in-repo Go lattice defaults to port `4001`.
  - The older Node lattice defaults to port `4000`.
  - Any new Go-facing frontend/archive integration should target `4001` unless explicitly overridden.
