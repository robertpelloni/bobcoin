# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [8.25.0] - 2026-04-04

### Added
- Economic parity regression coverage for the Go lattice:
  - `accept_bid` succeeds only with the exact expected balance increment and marks bids as accepted
  - duplicate `accept_bid` claims are rejected once a bid is closed
  - `data_anchor` requires a positive fee and indexes anchored content correctly on success
- **Publisher Profile Overlay**: The storage workbench now supports publisher avatar URLs and linked proof/attestation URLs as part of signed manifest-anchor metadata.
- **Vault Publisher Cards**: Vault archive cards now render publisher profile overlays including avatar, website, and proof links when present.
- **Proof-Link Searchability**: Vault archive discovery now indexes linked proof URLs so content can be searched and filtered by publisher attestation context.

### Changed
- Continued the semantic Node-vs-Go reconciliation pass by converting more of the remaining economic edge cases into executable Go regression tests.
- The Go status endpoint now reports `Go-Lattice v8.25.0`.

### Validation
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.23.0] - 2026-04-04

### Added
- Go regression coverage for:
  - rejecting a second `SYSTEM_GENESIS` bootstrap after the first chain already exists
  - finalizing expired proposals into terminal governance status (`Passed` / `Rejected`)
- **Saved Archive Presets**: Vault now lets operators save, reapply, and delete named filter presets for recurring archive investigations.
- **Archive Grouping Modes**: Added grouping by owner and by type so anchored content can be reviewed in structured batches rather than only as a flat list.
- **Preset-Driven Archive Workflow**: Saved presets now persist key discovery controls including search, signed-only mode, sorting, grouping, and network query terms.

### Changed
- Tightened Go genesis semantics so the SPoRA/pending bypass only applies to the single initial system bootstrap block, matching the intended Node behavior more closely.
- Proposal status is now refreshed when processing blocks and when serving proposal/vote endpoints, so expired governance items stop appearing perpetually `Active`.
- Vault now supports persistent operator workflows rather than only transient filtering.
- The Go status endpoint now reports `Go-Lattice v8.23.0`.

### Fixed
- Fixed a semantic gap where multiple `SYSTEM_GENESIS` open blocks could be accepted in Go even after the network was already initialized.
- Fixed a governance visibility issue where expired proposals could remain `Active` indefinitely because status was never refreshed outside vote-time checks.

### Validation
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.21.0] - 2026-04-04

### Added
- Go regression coverage for persistence rollback behavior, ensuring failed disk writes do not leave partially-applied in-memory consensus state behind.

### Changed
- Hardened `ProcessBlock()` so a failed `SaveBlock()` now triggers in-memory rollback followed by state reconstruction via audit.
- Strengthened semantic parity protection by asserting that failed persistence cannot leave residual chains, blocks, state hashes, or merkle roots behind.

### Validation
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.20.0] - 2026-04-04
...
