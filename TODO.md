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
- [ ] **Governance Finalization:** Proposal vote export is now present in Go, but proposal closure/finalization logic still needs to be ported 1:1.
- [ ] **Consensus Parity Audit (Final):** Reconcile the remaining semantic differences between Node and Go for `accept_bid`, `data_anchor` economics, snapshot recovery semantics, and any remaining service-side behaviors outside the lattice core.
- [ ] **Service Porting Plan:** Decide explicitly which Node services remain canonical (`game-server`, `supertorrent`) and which will be fully moved into Go.

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
- [x] **Tooltips:** Ensured every button, input, and stat across major pages has a descriptive tooltip.
- [x] **Mobile Responsiveness:** Audited the CSS and injected global media queries to ensure desktop dashboard views collapse gracefully on mobile screens.
- [x] **Version Display:** Injected the global version string dynamically into the footer using Vite defines.
- [x] **Gamified Onboarding:** Built an interactive terminal requiring users to physically mash their keyboard to securely generate the 64-character entropy seed required to initialize their wallet.
- [x] **WebRTC Multiplayer:** Built a full WebSocket signaling server + `simple-peer` WebRTC client enabling peer-to-peer competitive rhythm game matches with live score streaming.
