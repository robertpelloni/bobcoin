# Immediate Action Items & Bug Fixes

## Critical Backend Infrastructure
- [x] **Remove Mock APIs:** Removed `frontend/src/api.js` mocks and reconnected UI components to the actual `localhost:3001` endpoints (Transactions, Minting, Burning, Market, Governance).
- [x] **Update E2E Test:** Refactored `test_e2e.js` to call the real backend endpoints and verified the full application flow.
- [x] **Go API Parity Hardening:** Restored missing Go-Lattice compatibility endpoints (`/pending`, `/chain`, `/anchors`, `/proposals`, `/market/bids`, `/multisigs`) and normalized legacy client blocks at ingress.
- [x] **Go API Parity Hardening (Phase 2):** Added `/frontier`, `/anchors/:account`, `/votes/:proposalHash`, `/nfts`, `/nfts/:account`, and `/multisig/:account`, plus broader bootstrap snapshot parity.
- [x] **Vault Encryption Hardening:** Replaced the incorrect JSON-style file cloaking flow with binary-safe AES-256-GCM encryption metadata for uploaded artifacts.
- [ ] **SP1 ZK Service Robustness:** Current `/submit-proof` endpoint assumes SP1 execution output. Upgrade this to actually call the rust backend verification endpoint when SP1 is running.

## Recommended Next Pass
- [ ] **Cloaked Retrieval Flow:** Add first-class encrypted download/decrypt support in the Vault so cloaked files can be restored directly inside the UI.
- [ ] **Chunk Splitting Audit:** The frontend still emits a >500 kB main chunk. Introduce manual chunking for `node-seal`, `three.js`, and heavy dashboard routes.
- [x] **Governance Finalization (Basic):** Proposal status now refreshes in Go and expired items resolve to terminal states on processing/read paths.
- [ ] **Governance Finalization (Full 1:1):** Audit and implement any remaining Node-vs-Go governance semantics beyond status refresh, especially if explicit execution/enactment phases are added later.
- [ ] **Consensus Parity Audit (Final):** The Go audit engine now replays chain history on a shadow lattice, and direct regression tests now cover `accept_bid`, `data_anchor`, bootstrap edge cases, mixed-history replay, durable SQLite-backed cold-boot recovery, larger multi-account historical restart scenarios, same-timestamp replay ordering, same-timestamp cascading recovery from SQLite, proposal/vote expiry replay semantics, and HTLC expiry replay semantics. The Node reference now also uses ledger-time semantics for proposal voting and HTLCs, finalizes proposal status on later ledger-time blocks, supports typed `publish_manifest` anchor processing, and has both mixed governance+HTLC and same-timestamp mixed-feature replay coverage, including NFT ownership transitions, manifest anchors, larger three-account mixed ledgers, demurrage-sensitive three-account variants, dual-collector-action variants, and demurrage-sensitive dual-collector-action variants. Shared parity scenario and fixture-fragment catalogs now exist and include explicit Node/Go test references, but the remaining semantic differences still need explicit reconciliation for the nastiest replay-order corner cases, even larger multi-account mixed-feature webs, deeper fixture-driven execution alignment, and any service-side behavior outside the lattice core.
- [ ] **Service Porting Plan:** Decide explicitly which Node services remain canonical (`game-server`, `supertorrent`) and which will be fully moved into Go. Initial work has now started via `go-supertorrent/`, which ports the supernode control plane, wallet/bootstrap flow, torrent registry, SPoRA endpoint, upload tracking, and lattice market-accept loop into Go, and `go-game-server/`, which now ports the game-server control plane for system wallet/bootstrap, mint/burn orchestration, proof-submission orchestration, transaction/bid persistence, market/status endpoints, and WebSocket matchmaking/signaling. Full WebTorrent/WebRTC transport parity plus true ZK/FHE service parity are still pending.
- [ ] **Deep Parity Tests:** Add more end-to-end Go tests for mixed historical ledgers plus any remaining lifecycle/economic edge cases not yet captured by the growing regression suite.

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
