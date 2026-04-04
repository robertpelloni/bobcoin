# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [8.26.0] - 2026-04-04

### Added
- **Exportable Recovery Reports**: The restore diagnostics panel can now download a structured JSON recovery report containing manifest identity, parity status, omitted-shard inputs, shard failure reasons, and restored-file metadata.
- **Recovery Incident Capture**: Operators can now preserve machine-readable restore evidence for debugging or postmortem analysis instead of relying only on transient UI output.

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
...
