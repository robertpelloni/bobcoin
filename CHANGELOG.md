# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [8.19.0] - 2026-04-04

### Added
- **Degraded Recovery Diagnostics**: The storage workbench now records shard fetch failures, missing shard counts, parity sufficiency, and per-shard failure reasons during restore attempts.
- **Parity Recovery Testing Controls**: Added an optional shard-omission input so operators can simulate missing shards and validate parity reconstruction behavior without needing a real storage outage.
- **Recovery Outcome Surfacing**: Restore results now explicitly indicate when parity reconstruction was used to recover the file.

## [8.18.0] - 2026-04-04

### Added
- Go parity audit regression tests for:
  - invalid block-type rejection after valid genesis initialization
  - deterministic audit-time reconstruction of derived anchor state from chain history
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
- The Go status endpoint now reports `Go-Lattice v8.17.0`.

### Fixed
- Fixed a subtle but important correctness issue where audit iteration over account maps was not a true deterministic state verification strategy.
- Fixed a historical integrity bug where anchor/manifest payload metadata could be mutated after block processing, making later hash verification fail.
- Fixed audit/state verification so derived state is reconstituted from chain history rather than trusting already-materialized in-memory maps.

### Validation
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.17.0] - 2026-04-04

### Added
- **Signed Publisher Metadata**: The storage workbench can now attach publisher alias, website, and statement metadata to a `publish_manifest` anchor block, with the metadata covered by the same signed publication proof.
- **Vault Publisher Identity Surfacing**: Vault archive records now display publisher alias, profile URL, and publisher statement when present.
- **Publisher Searchability**: Vault search now includes publisher identity metadata so users can discover content by publisher context rather than only hashes and locators.

## [8.16.0] - 2026-04-04

### Added
- **Owner Reputation Overlay**: Vault now derives lightweight trust scores and tier labels from anchored content activity, signed anchor counts, and archived data volume.
- **Sovereign Publisher Leaderboard**: Added a ranked archive leaderboard highlighting the most active and attributable archive owners in the current data set.
- **Archive Sorting Controls**: Added sorting modes for recent activity, trust score, size, owner, and name.

### Changed
- **Vault Discovery Surface**: Expanded Vault from search/filter discovery into a trust-aware archive intelligence surface with owner-level provenance context.

## [8.15.0] - 2026-04-04
...
