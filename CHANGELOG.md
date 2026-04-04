# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [8.31.0] - 2026-04-04

### Added
- **Preset Export / Import**: Vault now supports exporting saved archive presets to JSON and importing them back into the UI.
- **Batch Archive Actions**: Added batch-oriented operator actions for exporting the currently visible archive result set and copying all visible locators in one step.
- **Grouped Archive Workflow**: The new preset/grouping model is now paired with concrete workflow actions, turning Vault into a more complete archive operations surface.

## [8.30.0] - 2026-04-04

### Added
- Persistent mixed-history recovery regression coverage for the Go lattice:
  - replaying a durable SQLite-backed ledger through cold-boot recovery
  - reconstructing multi-account `send`, `open`, `publish_manifest`, `market_bid`, and `accept_bid` state from stored history
  - verifying recovered anchor and accepted-bid metadata after process restart semantics

### Changed
- Continued the parity strategy of escalating from isolated in-memory replay tests to durable persistence-and-recovery replay tests.

### Validation
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.29.0] - 2026-04-04
...
