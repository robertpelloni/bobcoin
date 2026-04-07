# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [8.88.0] - 2026-04-06

### Changed
- **Aggressive 3D Deferral**: The `CyberGrid3D` component is now lazy-loaded with a dedicated Suspense boundary in `SystemStatus.jsx`. This prevents the `three.js` stack and its associated React-Three-Fiber hooks from being analyzed as a required dependency for the `SystemStatus` page's initial definition.
- **Bundle Health Breakthrough**: This change, combined with existing route splitting, reduced the main entry bundle size from ~1.5MB to ~50kB, ensuring the wallet UI remains extremely responsive regardless of the graphics stack complexity.

### Validation
- `cd frontend && npm run build` (Build confirmed: index.js is now 49.99 kB).

## [8.87.0] - 2026-04-05

### Added
- Expanded Go regression coverage for the new supertorrent compatibility proxy shell in `go-supertorrent/main_test.go`, including:
  - proxied `/submit-proof`
  - proxied `/fhe-oracle`
  - proxied market bid/list/accept lifecycle
- The new tests now validate that the Go supertorrent compatibility shell can forward more of the frontend’s Go-first traffic surface, not just mint and transactions.

### Changed
- Redirected `go-supertorrent/`’s dedicated `/status` endpoint to behave as a compatibility proxy to the game-server status surface, while preserving the root-path local supernode status shell.
- Tightened alignment with the frontend’s Go-first HTTP routing by making the explicit `/status` compatibility endpoint report game-server status semantics rather than local supernode shell semantics.
- Updated `go-supertorrent` tests and documentation to reflect the distinction between root local status and proxied game-service status.
- Hardened the Go supertorrent compatibility proxy shell by covering a broader slice of forwarded gameplay/control traffic.
- Continued the staged migration pattern of making newly broadened compatibility layers executable in tests immediately rather than leaving them as unverified glue.

### Validation
- `cd go-supertorrent && gofmt -w *.go`
- `cd go-supertorrent && go test ./...`
- `cd go-supertorrent && go build -buildvcs=false ./...`
- `cd go-game-server && go build -buildvcs=false ./...`
- `cd go-game-server && go test ./...`
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`

## [8.86.0] - 2026-04-05

### Added
- Additional Go regression coverage for `go-game-server/` bridge decision behavior in `go-game-server/main_test.go`, including:
  - explicit rejection when an external `/verify` bridge returns `verified: false`
  - fallback success when the external verification bridge fails but the current score-threshold fallback still permits minting

### Changed
- Hardened the Go game-server proof-submission shell by covering more of its bridge-failure and bridge-rejection decision logic, not just the happy-path bridge case.
- Continued the staged migration pattern of validating specialist bridge-shell semantics before claiming deeper backend parity.

### Validation
- `cd go-game-server && gofmt -w *.go`
- `cd go-game-server && go test ./...`
- `cd go-game-server && go build -buildvcs=false ./...`
- `cd go-supertorrent && go build -buildvcs=false ./...`
- `cd bobcoin-consensus && npm test`
- `cd go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd go-lattice && go test ./...`
- `cd frontend && npm run build`
