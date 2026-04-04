# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

### Added
- Mixed-history replay regression coverage for the Go lattice:
  - multi-account replay involving `send`, `open`, `data_anchor`, `market_bid`, and `accept_bid`
  - deterministic audit reconstruction of mixed derived state across accounts after manual corruption of runtime maps
- Additional helper coverage for account-open SPoRA generation in the Go parity test suite.
- **Failure Categorization**: Restore diagnostics now classify shard failures into categories such as operator omission, integrity mismatch, network fetch failure, missing shard, and unknown failure.
- **Source Attribution**: Recovery diagnostics now record the attempted shard source reference and source host for each failed shard, making outage/corruption attribution more actionable.
- **Failure Summary Reporting**: The recovery diagnostics panel now aggregates failure counts by category, improving operator triage during degraded restores.

### Changed
- Continued the parity strategy of testing replay and reconstruction across more realistic historical ledger shapes instead of only isolated single-feature flows.

### Validation
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.27.0] - 2026-04-04

### Added
- Additional Go economic/lifecycle parity regression tests for:
  - `swap_lock` state creation and locked amount tracking
  - `swap_claim` successful lifecycle transition to `CLAIMED`
  - `transfer_nft` ownership enforcement and recipient ownership updates
  - `publish_manifest` anchor reconstruction during audit replay
- **Exportable Recovery Reports**: The restore diagnostics panel can now download a structured JSON recovery report containing manifest identity, parity status, omitted-shard inputs, shard failure reasons, and restored-file metadata.
- **Recovery Incident Capture**: Operators can now preserve machine-readable restore evidence for debugging or postmortem analysis instead of relying only on transient UI output.

### Changed
- Continued the parity strategy of converting remaining semantic gaps into executable Go tests instead of relying on manual equivalence claims.
- Hardened test expectations around demurrage-sensitive values using tolerances where protocol economics naturally decay balances over time.

### Validation
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.25.0] - 2026-04-04
...
