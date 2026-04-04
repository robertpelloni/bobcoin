# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

### Added
- Additional Go-Lattice API parity routes to close more of the Node-to-Go gap:
  - `GET /frontier`
  - `GET /anchors/:account`
  - `GET /votes/:proposalHash`
  - `GET /nfts`
  - `GET /nfts/:account`
  - `GET /multisig/:account`
- First-pass Go support for additional block types and state models:
  - `achievement_unlock`
  - `swap_lock`
  - `swap_claim`
  - `transfer_nft`
  - `publish_manifest`
- `HTLCSwap` state tracking and Go snapshot coverage for swaps.
- Go unit tests covering deterministic multisig address derivation and snapshot parity maps.

### Changed
- Improved Go bootstrap exports so `/bootstrap` now returns a cleaner explicit state snapshot rather than dumping the entire lattice struct.
- Improved Go bootstrap imports so proposal, vote, market, swap, NFT, anchor, and multisig maps can be restored alongside chains and blocks.
- Updated the frontend Go archive target default from `http://localhost:4000` to `http://localhost:4001` to match the in-repo Go lattice service.
- Aligned Go vote-power math with the current Node implementation (`sqrt(balance)`) for closer governance parity.
- Hardened Go consensus so unknown block types are now rejected explicitly.
- Delayed Go state-root mutation until after block validation/state application succeeds, preventing false state-hash drift on rejected blocks.

### Fixed
- Fixed a major parity hole where `open` blocks would become invalid after strict invalid-type rejection was introduced; Go now handles `open` as the receive-style path with a genesis bypass.
- Fixed missing per-account archive and NFT query routes required by the newer Go-manifest archive UI.
- Fixed Go-side manifest anchor visibility so `publish_manifest` records now enter the anchor index instead of existing only as chain history.
- Fixed deterministic multisig identity drift by deriving the Go vault address from the participant set rather than using the creation block hash.
- Fixed a frontend archive misconfiguration where `GO_LATTICE_URL` pointed at the old Node-lattice default port.

### Validation
- `cd go-lattice && gofmt -w *.go`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.14.0] - 2026-04-04

### Added
- **Archive Discovery Controls**: `Vault.jsx` now supports search and filtering across anchored content by name, owner, locator, manifest ID, ciphertext hash, proof hash, and type.
- **Provenance Badging**: Anchors now surface richer provenance cues in the Vault, including signed/unsigned state, ciphertext presence, locator presence, and cloaked legacy-anchor status.
- **Searchable Network Stream**: The network archive feed in Vault is now queryable so operators can inspect anchored content across the broader network rather than browsing blindly.

### Changed
- **Vault Archive UX**: Reworked the archive view to behave like a searchable intelligence surface rather than a static list, while preserving both Go-manifest anchors and legacy data-anchor compatibility.

## [8.13.0] - 2026-04-04
...
