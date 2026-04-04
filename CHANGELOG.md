# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

### Added
- Go parity audit regression tests for:
  - invalid block-type rejection after valid genesis initialization
  - deterministic audit-time reconstruction of derived anchor state from chain history
  - normal-mode block processing reaching merkle updates without deadlock
- Legacy-hash tolerance during audit for older anchor/manifest blocks whose payloads had previously been mutated with derived fields after signing.

### Changed
- Reworked `AuditState()` to replay the ledger onto a shadow Go lattice instead of only checking signature/height loops.
- `AuditState()` now rebuilds and re-derives runtime state maps from block history, including:
  - pending transactions
  - proposals
  - votes
  - market bids
  - swaps
  - NFTs
  - anchors
  - multisigs
  - AMM pool state
- Recovery now logs and skips invalid persisted blocks instead of silently pretending all recovered blocks succeeded.
- The Go status endpoint now reports `Go-Lattice v8.20.0`.
- Fixed a latent normal-mode merkle-update deadlock by separating lock-free merkle derivation from the public locked helper.

### Fixed
- Fixed a subtle but important correctness issue where audit iteration over account maps was not a true deterministic state verification strategy.
- Fixed a historical integrity bug where anchor/manifest payload metadata could be mutated after block processing, making later hash verification fail.
- Fixed audit/state verification so derived state is reconstituted from chain history rather than trusting already-materialized in-memory maps.

### Validation
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.19.0] - 2026-04-04
...
