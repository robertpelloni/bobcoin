# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [8.76.0] - 2026-04-05

### Added
- Expanded Go service regression coverage for `go-game-server/` with additional handler-level shell tests in `go-game-server/main_test.go`, including:
  - configured `/fhe-oracle` bridge passthrough behavior
  - `/burn` transaction recording behavior
  - invalid `/submit-proof` payload rejection behavior

### Changed
- Hardened the Go game-server shell by covering more of its failure-mode and bookkeeping behavior through executable tests, not just happy-path bridge and signaling flows.
- Continued the staged service-hardening pattern by adding negative-path and bookkeeping assertions as newly ported Go endpoints stabilize.

### Validation
- `cd go-game-server && gofmt -w *.go`
- `cd go-game-server && go test ./...`
- `cd go-game-server && go build -buildvcs=false ./...`
- `cd go-supertorrent && go build -buildvcs=false ./...`
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.75.0] - 2026-04-05

### Added
- Root-path WebSocket matchmaking/signaling shell in `go-supertorrent/`, porting the current reasonable signaling responsibilities needed when the frontend targets the Go supernode for matchmaking.
- Go regression coverage for the new supertorrent signaling shell in `go-supertorrent/main_test.go`, including `FIND_MATCH`, `MATCH_FOUND`, `SIGNAL`, and `OPPONENT_DISCONNECTED` flow.

### Changed
- Extended the Go supertorrent port beyond HTTP/storage/market control-plane behavior into live multiplayer signaling shell support.
- Tightened alignment with the frontend’s Go-first signaling default by making the Go supernode capable of serving the expected WebSocket matchmaking contract.
- Updated the Go supertorrent README to reflect that signaling is now part of the ported shell surface.

### Validation
- `cd go-supertorrent && gofmt -w *.go`
- `cd go-supertorrent && go mod tidy`
- `cd go-supertorrent && go test ./...`
- `cd go-supertorrent && go build -buildvcs=false ./...`
- `cd go-game-server && go build -buildvcs=false ./...`
- `cd go-game-server && go test ./...`
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.74.0] - 2026-04-05

### Added
- Storage-manifest and shard endpoint coverage for `go-supertorrent/` in `go-supertorrent/main_test.go`, including:
  - `/upload-shard`
  - `/publish-manifest`
  - `/manifests/:id`
  - `/shards/:hash`
- The new tests now validate the Go supertorrent shell across its manifest/shard publication and retrieval surface, not just torrent registry and market-control behavior.

### Changed
- Continued the Go supertorrent hardening pass by validating the browser-facing storage publication/retrieval shell through executable tests.
- Extended the supertorrent test surface from control-plane mutation/reporting paths into storage-manifest round-trip behavior that the frontend storage workbench depends on.

### Validation
- `cd go-supertorrent && gofmt -w *.go`
- `cd go-supertorrent && go test ./...`
- `cd go-supertorrent && go build -buildvcs=false ./...`
- `cd go-game-server && go build -buildvcs=false ./...`
- `cd go-game-server && go test ./...`
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.73.0] - 2026-04-05

### Added
- Additional Go service regression coverage for `go-game-server/` initialization behavior in `go-game-server/main_test.go`, including:
  - first-run system-chain bootstrap through `initializeSystemChainOnce()`
  - no-op behavior when the system frontier is already initialized

### Changed
- Refactored `go-game-server/` system-chain bootstrap into a reusable `initializeSystemChainOnce()` helper so the long-lived startup path now has a directly testable single-pass core.
- Continued the staged service-hardening pattern of extracting directly testable helpers from initialization routines before expanding deeper specialist behavior.

### Validation
- `cd go-game-server && gofmt -w *.go`
- `cd go-game-server && go test ./...`
- `cd go-game-server && go build -buildvcs=false ./...`
- `cd go-supertorrent && go build -buildvcs=false ./...`
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.72.0] - 2026-04-05

### Added
- Additional Go orchestration coverage for `go-supertorrent/` in `go-supertorrent/main_test.go`, including:
  - direct single-pass bootstrap execution through `bootstrapWalletOnLatticeOnce()`
  - explicit skip-path coverage for open-bid processing when a magnet is already tracked

### Changed
- Refactored `go-supertorrent/` bootstrap logic into a reusable `bootstrapWalletOnLatticeOnce()` helper so the long-running delayed bootstrap loop now has a directly testable core path.
- Hardened `go-supertorrent/` open-bid processing by making the skip-if-already-tracked path executable in tests, reducing regression risk in the polling loop.
- Continued the staged Go migration pattern of extracting testable single-pass helpers from long-running service routines before expanding behavior further.

### Validation
- `cd go-supertorrent && gofmt -w *.go`
- `cd go-supertorrent && go test ./...`
- `cd go-supertorrent && go build -buildvcs=false ./...`
- `cd go-game-server && go build -buildvcs=false ./...`
- `cd go-game-server && go test ./...`
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.71.0] - 2026-04-05

### Added
- Expanded Go service regression coverage for `go-supertorrent/` with control-plane state and stats tests in `go-supertorrent/main_test.go`, including:
  - registry loading plus core-anchor bootstrapping on service startup
  - `/stats` response behavior over tracked torrent state
- The new tests now validate supertorrent state initialization and reporting behavior, not just request handlers that mutate state.

### Changed
- Hardened the Go supertorrent shell by covering both state mutation flows and state-observation/reporting flows.
- Continued the staged service-hardening pattern by testing startup initialization behavior once the shell had basic orchestration tests in place.

### Validation
- `cd go-supertorrent && gofmt -w *.go`
- `cd go-supertorrent && go test ./...`
- `cd go-supertorrent && go build -buildvcs=false ./...`
- `cd go-game-server && go build -buildvcs=false ./...`
- `cd go-game-server && go test ./...`
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.70.0] - 2026-04-05

### Changed
- **Route-Level Code Splitting**: Bobcoin now lazy-loads its page routes so heavy feature surfaces are no longer pulled eagerly into one main application chunk.
- **Manual Vendor Chunking**: Vite now emits dedicated vendor chunks for `node-seal`, `three` / React Three Fiber, React core, router code, and crypto helpers, sharply reducing the size of the main entry bundle.
- **Bundle Health Improvement**: The giant app bundle has been broken into route and vendor chunks; the remaining large warning is now primarily concentrated in the `three` vendor chunk rather than the core app graph.

### Validation
- `cd frontend && npm run build`

## [8.69.0] - 2026-04-05

### Added
- **Diagnostics Comparison Review**: Vault now compares imported signed diagnostics packages against the operator’s current local diagnostics, surfacing shared/local-only/imported-only sources plus the most materially changed hosts.

### Changed
- **Trust Workflow Depth**: Signed diagnostics package review now goes beyond signature validity and helps operators understand whether a received package is older, newer, narrower, richer, or materially different from the current local source-health view.

### Validation
- `cd frontend && npm run build`

## [8.68.0] - 2026-04-05

### Added
- **Signed Diagnostics Packages**: Vault can now export comparative source diagnostics as signed shareable packages using the active Bobcoin wallet keypair.
- **Diagnostics Verification Workflow**: Vault can now import signed diagnostics packages, recompute canonical payload hashes, verify the embedded Ed25519 signature, and surface package review metadata in-browser.

### Changed
- **Shareable Reliability Evidence**: Comparative source diagnostics are no longer limited to unsigned JSON export; operators can now produce attributable diagnostic artifacts suitable for handoff and authenticity checks.

### Validation
- `cd frontend && npm run build`

## [8.67.0] - 2026-04-05

### Added
- **Exportable Comparative Source Diagnostics**: Vault can now export a structured JSON bundle summarizing retained recovery reports, source leaderboards, trend buckets, comparative host rankings, and per-source failure/success counters.

### Changed
- **Reliability Export Workflow**: The long-horizon source reliability section now includes a dedicated export action so operators can carry comparative diagnostics out of the browser for offline review, incident handoff, or external analysis.

### Validation
- `cd frontend && npm run build`

## [8.66.0] - 2026-04-05

### Changed
- **Go-First Signaling Routing**: Bobcoin matchmaking now defaults its WebSocket signaling target toward the Go supernode instead of the legacy Node game-server, while preserving explicit signaling overrides.
- **Operator Visibility**: System Status now identifies whether signaling is currently targeting Go WebSockets or a legacy WebSocket endpoint.

### Validation
- `cd frontend && npm run build`

## [8.65.0] - 2026-04-05

### Changed
- **Go-First HTTP Routing**: Frontend compatibility calls now default to the Go supernode HTTP surface instead of the legacy Node game-server, while preserving explicit environment overrides.
- **Separated Signaling Transport**: Bobcoin now uses a dedicated signaling base URL for WebRTC matchmaking so multiplayer can remain on the legacy signaling service while migrated HTTP endpoints move to Go.
- **System Status Awareness**: The status page now checks the active HTTP compatibility target plus the signaling WebSocket path separately, making mixed Go/Node deployments easier to reason about.

### Validation
- `cd frontend && npm run build`

## [8.64.0] - 2026-04-05

### Added
- Expanded Go service regression coverage for `go-game-server/` with control-plane endpoint tests in `go-game-server/main_test.go`, including:
  - market bid creation/listing/accept lifecycle
  - `/status` response behavior
  - `/bankroll` response behavior
  - `/transactions` response behavior with persisted records

### Changed
- Hardened the Go game-server control-plane port by covering more of its market and bookkeeping shell through executable handler tests.
- Continued the staged migration pattern of widening test coverage as each Go service shell broadens beyond its initial transport/bridge responsibilities.

### Validation
- `cd go-game-server && gofmt -w *.go`
- `cd go-game-server && go test ./...`
- `cd go-game-server && go build -buildvcs=false ./...`
- `cd go-supertorrent && go build -buildvcs=false ./...`
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.63.0] - 2026-04-05

### Added
- Expanded Go service regression coverage for `go-game-server/` with endpoint-level orchestration tests in `go-game-server/main_test.go`, including:
  - `/submit-proof` bridge-driven mint flow
  - `/mint` system-send orchestration flow
  - `/fhe-oracle` not-configured behavior
- The new tests now validate the Go game-server shell not only at helper level, but also through higher-value HTTP handler paths that drive lattice minting behavior.

### Changed
- Hardened the Go game-server port by turning more of its gameplay-to-ledger service shell into executable endpoint-level regression coverage.
- Continued the service migration pattern of validating bridge-first orchestration paths with real handler tests before claiming deeper backend parity.

### Validation
- `cd go-game-server && gofmt -w *.go`
- `cd go-game-server && go test ./...`
- `cd go-game-server && go build -buildvcs=false ./...`
- `cd go-supertorrent && go build -buildvcs=false ./...`
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.62.0] - 2026-04-05

### Added
- Expanded Go service regression coverage for `go-supertorrent/` with higher-value orchestration tests in `go-supertorrent/main_test.go`, including:
  - lattice bootstrap/open flow from minted bootstrap funds
  - one-shot open-bid polling/processing via `processOpenBidsOnce()`
- New `processOpenBidsOnce()` helper in `go-supertorrent/` so market-accept polling logic now has a directly testable unit instead of living only inside the infinite ticker loop.

### Changed
- Hardened the Go supertorrent control-plane port by making its bootstrap and market-bid orchestration paths directly testable.
- Continued the staged Go migration pattern of refactoring long-running service loops into testable single-pass helpers before expanding behavior further.

### Validation
- `cd go-supertorrent && gofmt -w *.go`
- `cd go-supertorrent && go test ./...`
- `cd go-supertorrent && go build -buildvcs=false ./...`
- `cd go-game-server && go build -buildvcs=false ./...`
- `cd go-game-server && go test ./...`
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.61.0] - 2026-04-05

### Added
- Initial Go service regression coverage for `go-supertorrent/` in `go-supertorrent/main_test.go`, including:
  - add/remove torrent registry behavior
  - `/spora/:challenge` response behavior
  - lattice `accept_bid` block submission flow
  - multipart upload tracking behavior

### Changed
- Hardened the new Go supertorrent control-plane port by moving it beyond build-only validation and into executable Go service tests.
- Continued the practical Go migration pattern of adding first-wave regression coverage once a service shell reaches a meaningful breadth.
- Fixed dynamic error propagation in `go-supertorrent/` so Go build/test behavior stays explicit and stable.

### Validation
- `cd go-supertorrent && gofmt -w *.go`
- `cd go-supertorrent && go test ./...`
- `cd go-supertorrent && go build -buildvcs=false ./...`
- `cd go-game-server && go build -buildvcs=false ./...`
- `cd go-game-server && go test ./...`
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.60.0] - 2026-04-05

### Added
- Initial Go service regression coverage for `go-game-server/` in `go-game-server/main_test.go`, including:
  - optional `/submit-proof` bridge preference behavior
  - score-threshold fallback verification behavior
  - `/fhe-oracle` bridge passthrough behavior
  - WebSocket matchmaking/signaling flow (`FIND_MATCH`, `MATCH_FOUND`, `SIGNAL`, `OPPONENT_DISCONNECTED`)

### Changed
- Hardened the new Go game-server port by ensuring its verification-bridge and signaling shells are covered by executable Go tests instead of being validated only through manual builds.
- Fixed a Go build issue in `go-game-server/` by making dynamic error propagation explicit (`fmt.Errorf("%s", resp.Error)`).
- Closed SQLite handles during Go game-server tests so temporary database cleanup now succeeds reliably on Windows.

### Validation
- `cd go-game-server && gofmt -w *.go`
- `cd go-game-server && go test ./...`
- `cd go-game-server && go build -buildvcs=false ./...`
- `cd go-supertorrent && go build -buildvcs=false ./...`
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.59.0] - 2026-04-05

### Added
- Optional `/submit-proof` verification bridge behavior in `go-game-server/`, allowing the Go game-server to forward proof payloads to a configured backend verifier at `ZK_SERVICE_URL/verify` when available.
- `go-game-server/README.md` now documents `/submit-proof` as an orchestration shell with optional verification-bridge support, clarifying the current honest midpoint between pure heuristic validation and full backend SP1 parity.

### Changed
- Extended the Go game-server proof-submission shell so it can prefer an external verification result when a verification bridge is configured, while preserving the current score-threshold fallback for compatibility.
- Narrowed the most meaningful remaining `/submit-proof` gap from “any external verification path” to “full SP1 backend verification parity and deeper proof semantics.”

### Validation
- `cd go-game-server && gofmt -w *.go`
- `cd go-game-server && go mod tidy`
- `cd go-game-server && go build -buildvcs=false ./...`
- `cd go-supertorrent && go build -buildvcs=false ./...`
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.58.0] - 2026-04-05

### Added
- `/fhe-oracle` bridge shell in `go-game-server/`, porting the current reasonable game-server FHE orchestration boundary into Go:
  - encrypted payload validation
  - configurable bridge forwarding via `FHE_ORACLE_BRIDGE_URL`
  - passthrough response handling from an external FHE worker
- `go-game-server/README.md` now documents `/fhe-oracle` as part of the Go game-server scope while keeping honest boundaries around true native FHE parity.

### Changed
- Extended the Go game-server port beyond proof submission and matchmaking into the current FHE orchestration shell, while still keeping honest scope boundaries around true native homomorphic computation parity.
- Narrowed the most significant remaining `go-game-server`-specific gaps to native FHE behavior and true SP1 backend verification parity rather than the surrounding service shell.

### Validation
- `cd go-game-server && gofmt -w *.go`
- `cd go-game-server && go mod tidy`
- `cd go-game-server && go build -buildvcs=false ./...`
- `cd go-supertorrent && go build -buildvcs=false ./...`
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.57.0] - 2026-04-05

### Added
- `/submit-proof` orchestration support in `go-game-server/`, porting the current reasonable game-server proof-submission shell into Go:
  - proof payload validation
  - current score-threshold verification behavior
  - verification hash derivation
  - lattice mint/send orchestration for verified proofs
  - local mint transaction recording
- `go-game-server/README.md` now documents `/submit-proof` as part of the initial Go scope and clarifies that true SP1 backend verification parity remains an explicit follow-up gap.

### Changed
- Extended the Go game-server port beyond control-plane HTTP and signaling shells into the current proof-submission orchestration path, while still keeping honest boundaries around true SP1 verification and FHE parity.
- Narrowed the most meaningful remaining `go-game-server` gap from “proof submission in general” to “true backend SP1/ZK verification parity.”

### Validation
- `cd go-game-server && gofmt -w *.go`
- `cd go-game-server && go mod tidy`
- `cd go-game-server && go build -buildvcs=false ./...`
- `cd go-supertorrent && go build -buildvcs=false ./...`
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.56.0] - 2026-04-05

### Added
- WebSocket matchmaking/signaling support in `go-game-server/`, porting the reasonable multiplayer signaling responsibilities from the Node `game-server` root WebSocket server into Go.
- Root-path WebSocket upgrade handling in `go-game-server` so the Go service can now respond to the frontend rhythm-game matchmaking flow without relying on the Node signaling surface.

### Changed
- Extended the initial Go game-server control-plane port beyond pure HTTP orchestration into live multiplayer signaling, while still keeping FHE and SP1/ZK verification as explicitly unfinished specialist gaps.
- Updated the `go-game-server` port documentation to reflect that matchmaking/signaling is now part of the Go scope.

### Validation
- `cd go-game-server && gofmt -w *.go`
- `cd go-game-server && go mod tidy`
- `cd go-game-server && go build -buildvcs=false ./...`
- `cd go-supertorrent && go build -buildvcs=false ./...`
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.55.0] - 2026-04-05

### Added
- Initial `go-game-server/` Go port of the Game Server control plane, including:
  - runtime system wallet creation/loading
  - SQLite bid/transaction persistence
  - `/status`
  - `/bankroll`
  - `/mint`
  - `/burn`
  - `/transactions`
  - `/market/bids`
  - `/market/bid`
  - `/market/accept`
  - lattice system-chain bootstrap
  - system `send` block construction/signing/submission for mint flows
- `go-game-server/README.md` documenting the current scope and honest remaining gaps of the initial Go port.

### Changed
- Continued the practical platform port by moving the reasonable game-server control plane into Go after the initial `go-supertorrent/` control-plane port.
- Advanced the repo from “Go lattice core plus one service port” to “Go lattice core plus initial Go control-plane ports for both remaining major Node services,” while keeping honest feature-gap boundaries around matchmaking, FHE, and ZK verification.

### Validation
- `cd go-game-server && gofmt -w *.go`
- `cd go-game-server && go mod tidy`
- `cd go-game-server && go build -buildvcs=false ./...`
- `cd go-supertorrent && go build -buildvcs=false ./...`
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.54.0] - 2026-04-05

### Added
- Initial `go-supertorrent/` Go port of the SuperTorrent / supernode control plane, including:
  - wallet creation/loading
  - persisted torrent registry
  - core anchor tracking
  - `/stats`
  - `/add-torrent`
  - `/remove-torrent`
  - `/upload`
  - `/spora/:challenge`
  - lattice bootstrap/open flow
  - market bid polling and `accept_bid` submission
- Generated mirrored parity documentation in `docs/ai/testing/parity-scenario-matrix.md`, rendered from the shared scenario and fixture catalogs.
- Root script `npm run parity:matrix` for regenerating the mirrored parity matrix.
- Explicit Node/Go test references in the shared parity scenario catalog, including the demurrage-sensitive dual-collector-action mirrored scenario.

### Changed
- Began the practical Go port of the remaining Node-native supernode control plane without attempting to overclaim full BitTorrent transport parity before the control-plane foundation exists.
- Advanced the parity campaign again by tying scenario inventory, fixture fragments, and concrete test references into generated testing documentation.

### Validation
- `cd go-supertorrent && gofmt -w *.go`
- `cd go-supertorrent && go mod tidy`
- `cd go-supertorrent && go build -buildvcs=false ./...`
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`
- `cd . && npm run parity:matrix`

## [8.53.0] - 2026-04-05

### Added
- **Structured Attestation Metadata**: Publisher proof entries can now carry `kind`, `label`, `url`, and optional `issuer` metadata instead of only a raw type hint plus URL.
- **Richer Attestation Cards**: Vault now renders publisher attestations as structured cards showing proof type, human-readable label, and issuer context rather than only compact proof badges.
- **Searchable Attestation Context**: Vault search now indexes attestation labels and issuers in addition to URLs and proof kinds.

## [8.52.0] - 2026-04-05

### Added
- Explicit cross-client test references inside the shared parity scenario catalog:
  - each mirrored replay scenario now records both its Node replay test name and its Go durable recovery test name
- Node replay semantics now validate that mirrored scenarios reference known executable Node test functions.
- Go scenario catalog validation now verifies that mirrored scenarios reference known durable recovery test names.

### Changed
- Advanced the shared parity catalog from a structural inventory into a more directly executable alignment artifact by linking mirrored scenarios to concrete test entry points on both implementations.
- Strengthened parity-catalog drift detection so scenarios can no longer silently drift away from known Node/Go test coverage while still remaining present in the catalog.

### Validation
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.51.0] - 2026-04-05

### Added
- Demurrage-sensitive mirrored coverage for the richer dual-collector-action same-timestamp ledger:
  - Node replay semantics now cover a demurrage-sensitive three-account scenario where the collector both votes and places a market bid in the same timestamp bucket while the proposer simultaneously executes governance, NFT, HTLC, and manifest actions
  - Go now covers durable SQLite-backed recovery of the mirrored demurrage-sensitive dual-collector-action ledger under hostile ordering
- Shared parity catalogs now describe this richer scenario through the new `demurrage_multi_account_same_timestamp_dual_collector_actions` scenario entry.

### Changed
- Extended the parity campaign from the non-demurrage dual-collector-action ledger into a demurrage-sensitive variant, combining elapsed-time economic pressure with same-account same-bucket sequencing and broader mixed-feature replay pressure.
- Strengthened scenario-catalog validation in both Node and Go by requiring the new demurrage-sensitive dual-action mirrored scenario.
- Strengthened the Go durable recovery suite with frontier-balance validation for the demurrage-sensitive dual-collector-action ledger.

### Validation
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.50.0] - 2026-04-05

### Added
- New mirrored three-account same-timestamp replay coverage where the collector performs dual same-bucket actions:
  - Node replay semantics now cover a three-account ledger where the collector both votes and places a market bid at the same timestamp as the proposer's governance, NFT, HTLC, and manifest actions
  - Go now covers durable SQLite-backed recovery of the mirrored dual-collector-action same-timestamp ledger under hostile ordering
- The new scenario verifies that both voter and collector votes are preserved, accepted-bid state is reconstructed, NFT ownership transfer remains correct, and typed manifest/data-anchor reconstruction survives alongside the broader mixed ledger.
- Shared parity catalogs now describe this richer mirrored scenario through the new `collector-vote-extension` fixture fragment and the `multi_account_same_timestamp_dual_collector_actions` scenario entry.

### Changed
- Advanced the mirrored parity surface from three-account same-timestamp mixed ledgers into a variant where one non-proposer account performs multiple same-timestamp actions on its own chain, increasing pressure on both cross-account and same-account replay correctness.
- Strengthened scenario/fragment catalog validation by requiring the new dual-collector-action mirrored scenario and its supporting fixture fragment on both Node and Go sides.

### Validation
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.49.0] - 2026-04-05

### Added
- Shared replay fixture fragment catalog in `testing/parity-fixture-fragments.json` describing reusable mirrored parity building blocks such as proposer bootstrap, same-timestamp governance core, HTLC core, NFT core, manifest/anchor core, and demurrage pressure.
- Node replay semantics now validate that mirrored replay scenarios reference known shared fixture fragments.
- Go now validates shared fixture fragment references through `go-lattice/parity_scenario_catalog_test.go`, making scenario-to-fragment drift executable on both sides.

### Changed
- Advanced the parity campaign another step toward fixture-driven mirrored scenarios by evolving the shared scenario catalog to include explicit fragment references.
- Strengthened the shared parity inventory so mirrored scenarios are now documented not only as whole ledgers, but also in terms of reusable conceptual building blocks.

### Validation
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.48.0] - 2026-04-05

### Added
- Shared mirrored replay scenario catalog in `testing/parity-scenarios.json` describing the active cross-client parity scenarios, their feature surfaces, account counts, and expected outcomes.
- Node replay semantics now validate that the shared scenario catalog still includes the required mirrored replay scenarios.
- Go now validates the shared scenario catalog through `go-lattice/parity_scenario_catalog_test.go`, ensuring the durable recovery side and the Node replay side stay aligned on which mirrored scenarios are considered part of the active parity surface.

### Changed
- Began moving the parity campaign toward fixture-driven mirrored scenario definitions instead of relying only on scattered implicit test knowledge.
- Strengthened the parity workflow by making scenario-catalog drift executable in both Node and Go test suites.

### Validation
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.47.0] - 2026-04-05

### Added
- Demurrage-sensitive three-account same-timestamp replay coverage across both lattice implementations:
  - Node replay semantics now cover a three-account same-timestamp ledger where elapsed-time-sensitive proposer balances feed governance, market bids, NFT transfer, HTLC lifecycle, `publish_manifest`, `accept_bid`, and later `data_anchor` finalization
  - Go now covers durable SQLite-backed recovery of the mirrored demurrage-sensitive three-account same-timestamp ledger under hostile ordering
- The new scenarios verify together that demurrage-adjusted balances, proposal passage, vote preservation, accepted-bid state, claimed swap state, NFT ownership transfer, manifest-anchor reconstruction, and data-anchor reconstruction remain coherent inside a broader replay-sensitive historical ledger.

### Changed
- Extended the parity campaign from larger three-account same-timestamp mixed ledgers into demurrage-sensitive variants, adding elapsed-time pressure to the same replay-order and mixed-feature stress surface.
- Strengthened the Go durable recovery suite with a demurrage-sensitive multi-account market/governance/swap/NFT/manifest scenario that validates recovered frontier balance as well as accepted bid, anchor, and ownership state.

### Validation
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.46.0] - 2026-04-05

### Added
- Larger multi-account same-timestamp replay coverage across both lattice implementations:
  - Node replay semantics now cover a three-account same-timestamp ledger combining governance, voting, market bids, NFT ownership transfer, HTLC lifecycle, `publish_manifest`, and later `data_anchor` finalization
  - Go now covers durable SQLite-backed recovery of the mirrored three-account same-timestamp mixed ledger under hostile account ordering
- The new scenarios verify together that proposal passage, vote preservation, accepted-bid state, claimed swap state, NFT ownership transfer, manifest-anchor reconstruction, and data-anchor reconstruction remain coherent inside a broader replay-sensitive historical ledger.

### Changed
- Extended the mirrored parity campaign from two-account same-timestamp mixed ledgers into a larger three-account same-timestamp web, increasing pressure on replay-order correctness across more interacting state surfaces.
- Strengthened the Go durable recovery suite with a same-timestamp multi-account market/governance/swap/NFT/manifest scenario that validates accepted market bids as well as anchor and ownership state.

### Validation
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.45.0] - 2026-04-05

### Added
- Mirrored same-timestamp mixed-feature replay coverage now includes manifest-style anchor semantics as well as governance, HTLCs, and NFT ownership:
  - Node reference lattice now supports `publish_manifest` processing and records manifest anchors with explicit `type: 'publish_manifest'`
  - Node replay semantics now cover a same-timestamp governance + vote + NFT mint + NFT transfer + HTLC lock ledger followed by HTLC claim, `publish_manifest`, and later `data_anchor` finalization
  - Go now covers durable SQLite-backed recovery of the mirrored same-timestamp governance + HTLC + NFT + manifest ledger
- The new scenarios verify together that proposal passage, vote preservation, claimed swap state, NFT ownership transfer, manifest-anchor reconstruction, and data-anchor reconstruction remain coherent inside one replay-sensitive historical ledger.

### Changed
- Extended the mirrored same-timestamp parity surface beyond NFT-aware mixed ledgers into richer manifest/anchor recovery assertions.
- Strengthened Node anchor parity by storing typed `publish_manifest` anchors alongside typed `data_anchor` entries instead of only supporting data anchors.
- Strengthened the Go durable recovery suite with a same-timestamp mixed manifest/NFT/governance/swap scenario that validates both recovered `publish_manifest` and recovered `data_anchor` typing.

### Validation
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.44.0] - 2026-04-05

### Added
- **Structured Attestation Metadata**: Publisher proof entries can now carry `kind`, `label`, `url`, and optional `issuer` metadata instead of only a raw type hint plus URL.
- **Richer Attestation Cards**: Vault now renders publisher attestations as structured cards showing proof type, human-readable label, and issuer context rather than only compact proof badges.
- **Searchable Attestation Context**: Vault search now indexes attestation labels and issuers in addition to URLs and proof kinds.

## [8.43.0] - 2026-04-05

### Added
- **Long-Horizon Source Reliability Analytics**: Vault now derives week-over-week source reliability trends from persisted recovery reports, including 7-day vs prior-7-day comparisons, reliability scoring, and degrading/improving/stable host labels.
- **Comparative Source Diagnostics**: Added source insight cards for hosts needing attention, healthiest observed sources, and explicitly improving sources.
- **Success-Aware Recovery History**: Recovery reports now persist successful shard fetches as well as failures, making host health scoring more meaningful than failure-only rollups.
- **Longer Local Retention**: Increased locally retained recovery-report history from 50 to 200 entries so trend analysis has a wider historical base.

## [8.42.0] - 2026-04-05

### Added
- Mirrored same-timestamp mixed-feature replay coverage across both lattice implementations:
  - Node now exercises a same-timestamp governance + HTLC historical ledger where proposal creation, voting, and swap locking share a timestamp before later lifecycle finalization
  - Go now exercises durable SQLite-backed recovery of the same-timestamp mixed governance + HTLC ledger under hostile cross-account ordering
- The new cross-client scenarios verify that proposal passage, vote preservation, claimed swap state, and manifest/anchor reconstruction remain coherent when replay must respect both timestamp buckets and feature interactions.

### Changed
- Extended the parity campaign from mirrored mixed-feature ledgers into mirrored same-timestamp mixed-feature ledgers, increasing pressure on replay-order correctness instead of only historical time semantics.
- Strengthened the Go durable recovery surface with a same-timestamp mixed governance + HTLC scenario that specifically relies on timestamp-bucket replay behavior.

### Validation
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.41.0] - 2026-04-05

### Added
- Mirrored mixed-feature replay regression coverage across both lattice implementations:
  - Go now covers durable SQLite-backed recovery of a demurrage-sensitive governance + HTLC ledger
  - Node now covers a demurrage-sensitive mixed governance + HTLC historical ledger in the replay semantics suite
- The new mirrored scenarios prove that proposal passage, swap claim state, and demurrage-adjusted balances can remain coherent together rather than only in isolated feature tests.

### Changed
- Extended cross-client parity validation from isolated ledger-time fixes into mixed-feature historical ledgers where governance, HTLCs, later finalizer blocks, and demurrage all interact.
- Strengthened Node replay semantics tests to use a later ledger-time finalizer block in a demurrage-sensitive mixed ledger.

### Validation
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.40.0] - 2026-04-05

### Added
- Stronger Node reference replay regression coverage for mixed-feature semantics in `bobcoin-consensus/test_replay_semantics.js`:
  - proposal terminal-status finalization on later ledger-time blocks
  - mixed governance + HTLC historical ledgers where both proposal passage and swap claim state must remain correct together

### Changed
- Added `refreshProposalStatusesAt(atMs)` to the Node reference lattice and invoked it during block processing so proposal lifecycle state now advances from ledger time instead of being left stale indefinitely.
- Improved Node parity with the Go lattice by making later ledger-time blocks finalize proposal outcomes during normal processing, not just by allowing votes before expiry.

### Validation
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.39.0] - 2026-04-05

### Added
- Node reference replay regression coverage in `bobcoin-consensus/test_replay_semantics.js` for:
  - historical governance vote validation by block timestamp
  - historical HTLC claim validation by block timestamp
  - deterministic default HTLC expiry derivation from ledger time
- `bobcoin-consensus` now exposes those replay checks through `npm test`.

### Changed
- Aligned Node lattice replay semantics with the newer Go behavior for replay-critical time handling:
  - proposal voting now checks expiry against `block.timestamp` instead of `Date.now()`
  - HTLC claims now check expiry against `block.timestamp` instead of `Date.now()`
  - implicit HTLC expiry now defaults to `block.timestamp + 1h` instead of machine time

### Validation
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.38.0] - 2026-04-05

### Added
- Historical swap replay regression coverage for the Go lattice:
  - swap claims now explicitly test ledger-timestamp-based validity rather than accidentally depending on current wall-clock time
  - SQLite-backed recovery now covers deterministic default HTLC expiry reconstruction when `swap_lock` omits an explicit expiry payload

### Changed
- Fixed Go HTLC claim validation to compare swap expiry against the claim block's timestamp instead of `time.Now()`, making replay and recovery historically deterministic.
- Made Go's default `swap_lock` expiry derive from the block timestamp (`block.Timestamp + 1h`) instead of machine time, eliminating another replay-time nondeterminism source.

### Validation
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.37.0] - 2026-04-05

### Added
- Governance replay regression coverage for the Go lattice:
  - historical votes now explicitly test block-timestamp-based validity instead of accidentally depending on wall-clock time
  - same-timestamp `proposal`/`vote` replay with a later post-expiry block is now covered in both audit and SQLite-backed cold-boot recovery
  - hostile account-ordering coverage now proves earlier-timestamp governance work cannot be invalidated by later-timestamp blocks during replay

### Changed
- Hardened Go replay semantics so dependency resolution is completed within each timestamp bucket before later timestamps are processed in both audit replay and cold-boot recovery.
- Fixed vote validation to compare proposal expiry against the block's timestamp instead of the machine's current wall clock, making replay deterministic and historically correct.

### Validation
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.36.0] - 2026-04-04

### Added
- Durable same-timestamp recovery regression coverage for the Go lattice:
  - SQLite-backed cascading cross-account dependency replay where `open` blocks depend on `send` blocks at the same timestamp across multiple accounts
  - hostile deterministic ordering coverage that proves recovery can reconstruct valid histories even when dependency order is not topologically pre-sorted
- Stronger replay-order test helpers that intentionally choose descending account ordering to exercise dependency resolution instead of accidentally relying on favorable key ordering.

### Changed
- Hardened Go cold-boot recovery to replay persisted history in dependency-resolving passes, matching the newer audit replay strategy instead of rejecting valid same-timestamp dependent blocks too early.
- Made SQLite block loading deterministic by ordering replay reads by timestamp, account, height, and hash.
- Strengthened the existing same-timestamp audit regression so it now guarantees a hostile ordering scenario rather than a potentially favorable one.

### Validation
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.35.0] - 2026-04-04

### Added
- **Typed Proof Entries**: The storage workbench now supports proof entries in `kind|url` form, allowing publisher attestations to carry explicit semantic hints instead of only raw URLs.
- **Typed Proof Badges**: Vault now renders publisher proofs with their proof kind labels, improving provenance legibility for linked attestations.
- **Proof-Kind Persistence**: Manifest anchors now store proof-kind metadata alongside proof URLs in the Go lattice.

## [8.34.0] - 2026-04-04

### Added
- **Source Reliability Snapshot**: Vault now derives host-level reliability summaries from persisted recovery reports, including failure totals, success counts, failure categories, and last-seen timestamps.
- **Source Reliability Dashboard**: Added a dedicated archive diagnostics section that helps operators identify unreliable shard sources across sessions.

## [8.33.0] - 2026-04-04

### Added
- Replay-order corner-case coverage for the Go lattice:
  - same-timestamp cross-account dependency replay where a receiving-account `open` depends on a `send` block created at the same timestamp

### Changed
- Hardened the Go audit replay strategy so deterministic replay proceeds in dependency-resolving passes instead of assuming a single timestamp sort is always sufficient.
- Adjusted deterministic ordering to prefer timestamp, then account, then height, then hash before iterative replay passes resolve remaining dependencies.

### Validation
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.32.0] - 2026-04-04

### Added
- Larger durable mixed-history recovery regression coverage for the Go lattice:
  - restart-time reconstruction of NFT ownership after mint and transfer
  - restart-time reconstruction of swap lifecycle state after lock and claim
  - restart-time reconstruction of proposal terminal status after expiry
  - multi-account durable replay across `send`, `open`, `publish_manifest`, `proposal`, `transfer_nft`, `swap_lock`, and `swap_claim`
- **Preset Export / Import**: Vault now supports exporting saved archive presets to JSON and importing them back into the UI.
- **Batch Archive Actions**: Added batch-oriented operator actions for exporting the currently visible archive result set and copying all visible locators in one step.
- **Grouped Archive Workflow**: The new preset/grouping model is now paired with concrete workflow actions, turning Vault into a more complete archive operations surface.

### Changed
- Continued the replay-focused parity strategy by escalating from simple mixed ledgers to larger multi-account historical recovery scenarios.

### Validation
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.30.0] - 2026-04-04
...
