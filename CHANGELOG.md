# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
