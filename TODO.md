# Immediate Action Items & Bug Fixes

## Critical Backend Infrastructure
- [x] **Remove Mock APIs:** Removed `frontend/src/api.js` mocks and reconnected UI components to the actual `localhost:3001` endpoints (Transactions, Minting, Burning, Market, Governance).
- [x] **Update E2E Test:** Refactored `test_e2e.js` to call the real backend endpoints and verified the full application flow.
- [x] **Go API Parity Hardening:** Restored missing Go-Lattice compatibility endpoints (`/pending`, `/chain`, `/anchors`, `/proposals`, `/market/bids`, `/multisigs`) and normalized legacy client blocks at ingress.
- [x] **Go API Parity Hardening (Phase 2):** Added `/frontier`, `/anchors/:account`, `/votes/:proposalHash`, `/nfts`, `/nfts/:account`, and `/multisig/:account`, plus broader bootstrap snapshot parity.
- [x] **Vault Encryption Hardening:** Replaced the incorrect JSON-style file cloaking flow with binary-safe AES-256-GCM encryption metadata for uploaded artifacts.
<<<<<<< HEAD
- [x] **SP1 ZK Service Robustness:** Current `/submit-proof` path is now ported into `go-game-server/` with optional verification-bridge support. It now detects and integrates the `cargo-prove` toolchain for real RISC-V ZK verification. (v8.108.0)
=======
- [x] **SP1 ZK Service Robustness:** Current `/submit-proof` path is now ported into `go-game-server/` with optional verification-bridge support, but full parity still requires wiring it to the real Rust backend verification endpoint and semantics when SP1 is running.
>>>>>>> origin/jules-7611463505171352863-953fce19

## Recommended Next Pass
- [x] **Cloaked Retrieval Flow**: Added first-class encrypted download/decrypt support in the Vault so cloaked files can be restored directly inside the UI using client-side AES-256-GCM decryption.
- [x] **Remove temporary legacy block shim**: Audited all frontend pages and ensured explicit `height` and `staked_balance` fields are provided, enabling the removal of the backend compatibility shim.
- [x] **Chunk Splitting Audit:** Route-level lazy loading and manual vendor chunking now split the Bobcoin frontend into route chunks plus dedicated `node-seal`, `three`, router, React, and crypto vendor chunks. The remaining size warning was addressed by aggressively deferring the 3D topology component, resulting in a ~50kB main bundle.
- [x] **Exportable Comparative Source Diagnostics:** Vault now exports retained recovery-report comparisons, source leaderboards, trend buckets, and per-source reliability summaries as portable JSON.
- [x] **Signed Shareable Diagnostics Packages:** Vault now exports and verifies signed comparative diagnostics packages using Bobcoin wallet signatures.
- [x] **Diagnostics Comparison Review:** Vault now compares imported signed diagnostics packages against the current local diagnostics view, surfacing freshness, overlap, and changed-source deltas.
- [x] **Signaling Migration Plan:** WebRTC matchmaking signaling now has a Go-native default path via the supernode while retaining explicit override capability for legacy/specialized deployments.
- [x] **Signaling Hardening:** Added root-path WebSocket signaling in Go services, implemented multi-hop peer discovery in the Gossip protocol, and added automatic peer pruning for stale connections.
- [x] **Governance Finalization (Execution):** Implemented protocol-level action execution for `Passed` proposals in the Go lattice, including `MINT_TREASURY` and `UPDATE_DEMURRAGE`.
- [x] **Governance Finalization (Full 1:1):** Audit and implement any remaining Node-vs-Go governance semantics beyond execution and status refresh, especially if explicit enactment delays are added.
<<<<<<< HEAD
- [x] **Consensus Parity Audit (Final):** The Go audit engine now replays chain history on a shadow lattice, and direct regression tests now cover `accept_bid`, `data_anchor`, bootstrap edge cases, mixed-history replay, durable SQLite-backed cold-boot recovery, larger multi-account historical restart scenarios, same-timestamp replay ordering, same-timestamp cascading recovery from SQLite, proposal/vote expiry replay semantics, and HTLC expiry replay semantics. The Node reference now also uses ledger-time semantics for proposal voting and HTLCs, finalizes proposal status on later ledger-time blocks, supports typed `publish_manifest` anchor processing, and has both mixed governance+HTLC and same-timestamp mixed-feature replay coverage, including NFT ownership transitions, manifest anchors, larger three-account mixed ledgers, demurrage-sensitive three-account variants, dual-collector-action variants, and demurrage-sensitive dual-collector-action variants. Shared parity scenario and fixture-fragment catalogs now exist and include explicit Node/Go test references. (Finalized in v8.107.2)
- [x] **Service Porting Plan:** Go services (`go-game-server`, `go-supertorrent`, `go-lattice`) are now canonical. Initial work has now started via `go-supertorrent/`, which ports the supernode control plane, wallet/bootstrap flow, torrent registry, SPoRA endpoint, upload tracking, shard/manifest publication shell, manifest listing, lattice market-accept loop, and now also includes a WebSocket matchmaking/signaling shell plus a compatibility proxy layer for Go-first HTTP/game orchestration paths. Initial Go regression tests now cover the supertorrent control-plane shell across startup restoration, dedicated `/status` compatibility behavior, stats reporting, manifest/shard round-trips, manifest listing, signaling flow, proxy behavior, proxied mint/transactions/submit-proof/FHE/market paths, absolute manifest/shard URL compatibility behavior, root local status behavior, and negative-path storage errors. `go-game-server/` ports the game-server control plane for system wallet/bootstrap, mint/burn orchestration, proof-submission orchestration, FHE bridge orchestration, transaction/bid persistence, market/status endpoints, and WebSocket matchmaking/signaling, with tests covering signaling/bridge shells, mint/proof/FHE handler paths, bridge rejection/fallback decision behavior, market/status/bookkeeping handler paths, burn persistence, invalid-proof rejection, and system-chain initialization behavior. The two Go service shells now align on `8000` as the default supernode port path. (v8.108.0)
=======
- [x] **Consensus Parity Audit (Final):** The Go audit engine now replays chain history on a shadow lattice, and direct regression tests now cover `accept_bid`, `data_anchor`, bootstrap edge cases, mixed-history replay, durable SQLite-backed cold-boot recovery, larger multi-account historical restart scenarios, same-timestamp replay ordering, same-timestamp cascading recovery from SQLite, proposal/vote expiry replay semantics, and HTLC expiry replay semantics. The Node reference now also uses ledger-time semantics for proposal voting and HTLCs, finalizes proposal status on later ledger-time blocks, supports typed `publish_manifest` anchor processing, and has both mixed governance+HTLC and same-timestamp mixed-feature replay coverage, including NFT ownership transitions, manifest anchors, larger three-account mixed ledgers, demurrage-sensitive three-account variants, dual-collector-action variants, and demurrage-sensitive dual-collector-action variants. Shared parity scenario and fixture-fragment catalogs now exist and include explicit Node/Go test references, but the remaining semantic differences still need explicit reconciliation for the nastiest replay-order corner cases, even larger multi-account mixed-feature webs, deeper fixture-driven execution alignment, and any service-side behavior outside the lattice core.
- [x] **Service Porting Plan:** Decide explicitly which Node services remain canonical (`game-server`, `supertorrent`) and which will be fully moved into Go. Initial work has now started via `go-supertorrent/`, which ports the supernode control plane, wallet/bootstrap flow, torrent registry, SPoRA endpoint, upload tracking, shard/manifest publication shell, manifest listing, lattice market-accept loop, and now also includes a WebSocket matchmaking/signaling shell plus a compatibility proxy layer for Go-first HTTP/game orchestration paths. Initial Go regression tests now cover the supertorrent control-plane shell across startup restoration, dedicated `/status` compatibility behavior, stats reporting, manifest/shard round-trips, manifest listing, signaling flow, proxy behavior, proxied mint/transactions/submit-proof/FHE/market paths, absolute manifest/shard URL compatibility behavior, root local status behavior, and negative-path storage errors. `go-game-server/` ports the game-server control plane for system wallet/bootstrap, mint/burn orchestration, proof-submission orchestration, FHE bridge orchestration, transaction/bid persistence, market/status endpoints, and WebSocket matchmaking/signaling, with tests covering signaling/bridge shells, mint/proof/FHE handler paths, bridge rejection/fallback decision behavior, market/status/bookkeeping handler paths, burn persistence, invalid-proof rejection, and system-chain initialization behavior. The two Go service shells now align on `8000` as the default supernode port path. Full WebTorrent/WebRTC transport parity plus true native ZK/FHE service parity are still pending.
>>>>>>> origin/jules-7611463505171352863-953fce19
- [x] **Deep Parity Tests:** Added deterministic hash matching between the Node.js fixture generation and the Go block properties.
- [x] **Cross-Feature Pressure Scenario:** Implement a complex same-timestamp scenario involving governance, HTLCs, and NFTs to stress-test replay determinism.
- [x] **Go Game Server Hardening:** Enhance AI Oracle variance analysis and metadata validation for proof submissions.
- [x] **Multisig Participant Check:** Ensure only vault members can propose or approve transactions. (v8.107.3)
- [x] **Neural Governance Mock:** Add endpoint for proposal risk auditing.
- [x] **Supply Rebuild Logic:** Ensure total supply is accurately recalculated during chain audit and recovery. (v8.107.3)
- [x] **AMM Liquidity Parity:** Implement `amm_add_liquidity` and `amm_remove_liquidity` with 1:1 parity. (v8.107.3)

## System Ready
- All Phase III and Phase IV core features are mathematically completed and natively implemented across the Node.js ecosystem.
- The single remaining task (`Full ZK Proving`) requires an updated environment with the proper `rustc`/`cargo` compiler installed.

## UI/UX Polish
- [x] **Go Storage WASM Integration (Frontend v1):** Added browser-side Go storage runtime loading, manifest generation, and a Supernode workbench for zero-trust upload preprocessing.
- [x] **Go Storage Publication Flow (Frontend v2):** Extended the workbench to upload prepared shards to the Go supernode and publish a persisted manifest registry entry.
- [x] **Go Storage Retrieval Flow (Frontend v3):** Added manifest loading, shard download, client-side reconstruction, Go WASM decryption, and restored-file download support.
- [x] **Go Lattice Manifest Anchoring (Frontend v4):** Added signed `publish_manifest` block submission plus recent-anchor visibility for wallet-attributed storage publications.
- [x] **Vault Archive Integration (Frontend v5):** Promoted manifest anchors into the dedicated Vault archive surface with personal/network archive views and embedded storage tooling.
- [x] **Cross-Surface Anchor Reuse (Frontend v6):** Reused manifest anchors inside Storage Market and Gallery so archived manifests can directly feed bidding and NFT minting flows.
- [x] **Archive Discovery & Provenance (Frontend v7):** Added Vault search/filter controls plus richer signed/cloaked provenance badging across archive records.
- [x] **Archive Trust & Reputation Overlay (Frontend v8):** Added owner trust scoring, tier labels, leaderboard ranking, and archive sorting modes in the Vault intelligence surface.
- [x] **Signed Publisher Metadata (Frontend v9):** Added publisher alias/website/statement metadata to manifest anchors and surfaced it in Vault discovery results.
- [x] **Degraded Recovery Diagnostics (Frontend v10):** Added missing-shard diagnostics, parity sufficiency reporting, and manual shard-omission testing controls to the restore flow.
- [x] **Source Reliability Snapshot (Frontend v16):** Added host-level reliability summaries derived from persisted recovery reports inside the Vault diagnostics surface.
- [x] **Typed Publisher Proof Semantics (Frontend v17):** Added proof kind parsing/persistence and typed proof badges for publisher attestation links.
- [x] **Long-Horizon Source Reliability Analytics (Frontend v18):** Added comparative source health scoring, week-over-week trend labels, and wider local recovery-report retention.
- [x] **Structured Publisher Attestations (Frontend v19):** Added proof labels/issuers plus richer attestation cards for publisher identity evidence.
- [x] **Saved Archive Presets & Grouping (Frontend v11):** Added reusable filter presets plus owner/type grouping modes to the Vault archive intelligence surface.
- [x] **Publisher Profile Overlay (Frontend v12):** Added avatar/profile/proof-link metadata to manifest anchors and surfaced those linked identity cues inside Vault archive cards.
- [x] **Exportable Recovery Reports (Frontend v13):** Added downloadable JSON recovery reports capturing shard failures, parity sufficiency, omitted-shard tests, and restored-file metadata.
- [x] **Corruption/Source Attribution (Frontend v14):** Added shard failure categorization, source host attribution, and summarized failure counts inside restore diagnostics.
- [x] **Batch Archive Actions (Frontend v15):** Added preset import/export plus batch export/copy actions for the currently visible archive result set.
- [x] **Tooltips:** Ensured every button, input, and stat across major pages has a descriptive tooltip.
- [x] **Mobile Responsiveness:** Audited the CSS and injected global media queries to ensure desktop dashboard views collapse gracefully on mobile screens.
- [x] **Version Display:** Injected the global version string dynamically into the footer using Vite defines.
- [x] **Gamified Onboarding:** Built an interactive terminal requiring users to physically mash their keyboard to securely generate the 64-character entropy seed required to initialize their wallet.
- [x] **WebRTC Multiplayer:** Built a full WebSocket signaling server + `simple-peer` WebRTC client enabling peer-to-peer competitive rhythm game matches with live score streaming.
- [x] **Identity Verification UI (Frontend v20):** Integrated real-time "Zero-Trust" checking for publisher attestations in the Vault, backed by the Go supernode's new `VerifierService`.

- [x] **Multi-Node Sync Hardening**: Gossip loops now ban peers submitting cryptographically invalid block batches.
<<<<<<< HEAD
- [x] **Solana RPC Integration**: Deepen bridge relayers with real Solana RPC connectivity.
- [x] **ZK Native Verification**: Finalize SP1 native verification wrapper in `go-game-server`.
=======

## Ledger Engine Core
- [x] **Account Chain Data Structures:** Implement asynchronous block lattice DAG foundations for handling disjoint state structures natively across peer accounts.
- [x] **Transaction Validation Logic:** Create verification logic (signatures, previous hashes, bounds checks) specifically for asynchronous, parallel account chains.

## Phase V: Ongoing
- [x] **Game Engine SDK Endpoints:** Create a generic wrapper around `/submit-proof` to allow cross-game earning for Unity/Unreal.
- [x] **Neural Governance:** Connect a local LLM API into the backend to provide Constitutional Compatibility checks on proposals before voting.
- [x] **Lattice Arcade Rebrand:** Complete visual branding updates inside the frontend code.

## Phase VI: Emerging Horizons
- [x] **Physical Mining via Wearables:** Create a prototype endpoint accepting signed Apple Health / Google Fit payloads to issue Proof of Vitality tokens.
- [ ] **Native ZK Proving via WASM:** Move the SP1 execution down into the browser by porting the prover loop into a native WASM layer injected into Vite, removing backend dependencies entirely.
>>>>>>> origin/jules-7611463505171352863-953fce19
