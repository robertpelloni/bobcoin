# Session Handoff - 2026-04-04 (v8.12.0)

## Executive Summary
This pass was a rebase-and-hardening session on top of the newer Bobcoin storage/archive branch. The work preserved the recently-added Go storage WASM archive surface, manifest publication flow, and dedicated Vault archive browser, while adding a second layer of systemic compatibility and consensus hardening.

The central objective was to prevent silent integration failures across three moving targets:
1. the React frontend,
2. the hardened Go consensus node,
3. older Node-era client payload assumptions still present in parts of the app and service ecosystem.

The result is a merged baseline that keeps the newer archive/browser experience intact while restoring or hardening the older lattice compatibility flows that the wider product still depends on.

## High-Level Outcomes
- Preserved the newer Vault archive browser and embedded storage workbench from the upstream branch.
- Restored direct legacy data-anchor publishing inside Vault so earlier storage paths were not lost.
- Added binary-safe cloak-mode encryption for legacy file uploads.
- Restored missing Go-Lattice compatibility endpoints used throughout the frontend.
- Added ingress-side normalization in the Go node so older clients remain compatible with stricter consensus validation.
- Fixed the frontend `Block` model so it no longer discards critical consensus fields.
- Fixed the achievement engine signing path.
- Restored Go-side state visibility for governance proposals, votes, storage bids, and data anchors.

## Rebase / Merge Context
A direct push was rejected because `origin/main` had advanced beyond the local branch with the following already-landed storage/archive features:
- v8.8.0: end-to-end supernode publication flow
- v8.9.0: browser-side retrieval UX
- v8.10.0: Go-lattice manifest anchoring
- v8.11.0: Vault archive browser and embedded storage workbench

Rather than overwrite those changes, this session rebased onto `origin/main` and resolved conflicts by combining the newer archive-facing Vault with the local compatibility-hardening work.

## Detailed Changes

### 1. Frontend block-model parity restoration
**Files:**
- `frontend/src/Block.js`
- `frontend/src/AchievementService.js`

**Problem found:**
The frontend `Block` model was behind both the Node and Go consensus expectations. Several pages passed `height`, `staked_balance`, `zk_proof`, and related metadata, but the block constructor silently dropped them. This created a subtle runtime bug: page-level code looked correct while the serialized block sent over the network was incomplete.

**Fix applied:**
- Expanded the React-side `Block` model to preserve:
  - `height`
  - `staked_balance`
  - `zk_proof`
  - `timestamp`
- Updated block hashing to incorporate the same compatibility fields expected by the older Node-side model.
- Added a `sign()` alias that forwards to `signBlock()` for compatibility.
- Updated achievement unlocking so it now:
  - reads frontier state,
  - preserves liquid and staked balances,
  - sets block height correctly,
  - signs asynchronously with `await block.signBlock(...)`.

**Impact:**
The frontend now emits structurally correct blocks for hardened Go validation instead of silently dropping required state fields.

### 2. Go-Lattice API parity restoration
**Files:**
- `go-lattice/main.go`
- `go-lattice/lattice.go`

**Problem found:**
The React app and background services still rely on several Node-era lattice endpoints, but the Go node did not expose all of them. This meant builds could pass while runtime page behavior failed or degraded.

**Endpoints added/restored:**
- `GET /pending/:account`
- `GET /chain/:account`
- `GET /anchors`
- `GET /proposals`
- `GET /market/bids`
- `GET /multisigs`

**Compatibility improvement:**
- `GET /frontier/:account` now returns the payload the frontend actually expects:
  - `frontier`
  - `balance`
  - `staked_balance`
  - `height`

**Ingress normalization:**
A legacy-normalization step now runs before Go validation to populate missing:
- `timestamp`
- `height`
- `staked_balance` for non-staking blocks

This keeps consensus strict while still accepting payloads from older or partially-upgraded clients.

### 3. Go-side state visibility parity
**File:**
- `go-lattice/lattice.go`

**Problem found:**
Some block types were validated but not fully reflected in Go-side in-memory state, which meant frontend pages reading Go endpoints did not always see the state they expected.

**Fix applied:**
- Added vote tracking storage in Go.
- Restored proposal creation and vote accounting state updates.
- Restored storage-market bid visibility in Go.
- Enriched anchored data with:
  - `id`
  - `owner`
  - `timestamp`
- Preserved multisig and AMM logic already present in the hardened Go client.

**Impact:**
Explorer, Governance, Storage Market, MultiSig, and Vault flows now have a substantially stronger chance of seeing consistent state when backed by the Go client.

### 4. Vault merge: archive browser plus legacy cloaked publishing
**Files:**
- `frontend/src/pages/Vault.jsx`
- `frontend/src/pages/Vault.css`
- `frontend/src/cryptoUtils.js`

**Problem found:**
The upstream branch had already transformed Vault into a Go-lattice archive browser and manifest workspace. The local hardening pass had also added a direct cloaked data-anchor flow, but in an older Vault implementation. A naive merge would have caused one of those product directions to erase the other.

**Merge strategy used:**
- Kept the newer archive browser concepts:
  - manifest archive summaries
  - personal archive view
  - network manifest stream
  - embedded `StorageWasmWorkbench`
- Reintroduced the legacy direct data-anchor publisher as a dedicated compatibility panel inside Vault.
- Added a refresh flow that attempts to load:
  - legacy lattice frontier balance,
  - Go-lattice manifest anchors,
  - legacy data anchors,
  while degrading gracefully if some services are unavailable.

**Cloak-mode hardening:**
The previous cloaked upload logic incorrectly reused JSON wallet-vault encryption helpers for arbitrary binary file payloads. That was replaced with binary-safe helpers:
- `encryptFileForVault()`
- `decryptFileFromVault()`

These now:
- derive an AES-256-GCM key from the sovereign secret plus salt,
- encrypt raw file bytes,
- preserve IV and salt metadata,
- anchor the relevant metadata on-chain for later restoration.

**Impact:**
Vault now supports both the newer manifest-native archive workflow and the older direct encrypted anchor path, instead of forcing the product to choose one and regress the other.

## Validation Performed

### Go node
Commands executed:
- `cd C:/Users/hyper/workspace/bobcoin/go-lattice && gofmt -w lattice.go main.go`
- `cd C:/Users/hyper/workspace/bobcoin/go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd C:/Users/hyper/workspace/bobcoin/go-lattice && go test ./...`

Result:
- formatting succeeded
- build succeeded
- `go test` completed successfully (`[no test files]`)
- fresh `bobcoin-go-lattice.exe` produced

### Frontend
Command executed:
- `cd C:/Users/hyper/workspace/bobcoin/frontend && npm run build`

Result:
- production build succeeded
- PWA artifacts generated successfully
- remaining warnings are non-fatal:
  - browser externalization warnings from dependency graph
  - large main chunk warning (>500 kB)

## Remaining Gaps / Recommended Next Work

### 1. Complete cloaked retrieval UX for legacy anchors
Upload-side encryption is now technically sound, but the dedicated restore flow for legacy cloaked data anchors is not yet first-class in Vault. The metadata is now available, so the next logical step is direct decrypt-and-download support.

### 2. Complete governance parity
Proposal and vote state tracking are better now, but full parity still needs:
- `GET /votes/:proposalHash`
- proposal expiration/finalization logic
- restart/recovery validation across persisted governance history

### 3. Reduce bundle weight
The frontend build still reports a large primary chunk. The most likely next optimization targets are:
- `node-seal`
- `three.js`
- route-level heavy archive and dashboard features

### 4. Audit port defaults across Go services
There is now visible product drift between services using `4000` vs `4001` as the Go-lattice or lattice default. This should be normalized in one focused pass to reduce environment confusion.

## Files Changed In This Pass
- `CHANGELOG.md`
- `HANDOFF.md`
- `TODO.md`
- `VERSION.md`
- `frontend/src/AchievementService.js`
- `frontend/src/Block.js`
- `frontend/src/cryptoUtils.js`
- `frontend/src/pages/Vault.css`
- `frontend/src/pages/Vault.jsx`
- `go-lattice/lattice.go`
- `go-lattice/main.go`

## Release / Git State
- Release target after merge: `8.12.0`
- This session preserved upstream archive work and layered compatibility hardening on top.
- No running processes were terminated in this session.
