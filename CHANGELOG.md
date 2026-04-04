# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [8.28.0] - 2026-04-04

### Added
- **Failure Categorization**: Restore diagnostics now classify shard failures into categories such as operator omission, integrity mismatch, network fetch failure, missing shard, and unknown failure.
- **Source Attribution**: Recovery diagnostics now record the attempted shard source reference and source host for each failed shard, making outage/corruption attribution more actionable.
- **Failure Summary Reporting**: The recovery diagnostics panel now aggregates failure counts by category, improving operator triage during degraded restores.

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
