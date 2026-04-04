# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
