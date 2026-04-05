# Session Handoff - 2026-04-05 (v8.45.0)

## Executive Summary
This session continued the parity plan by extending the mirrored same-timestamp mixed-feature ledgers from governance + HTLC + NFT coverage into richer manifest/anchor coverage.

The key outcome is that both lattice implementations now exercise same-timestamp mixed ledgers that preserve:
- governance lifecycle
- HTLC lifecycle
- NFT ownership transfer
- manifest-style anchor state
- later data-anchor finalization

That is a stronger cross-client parity surface because it tests not only lifecycle and ownership semantics, but also richer anchor reconstruction semantics inside one replay-sensitive historical ledger.

## What Changed

### 1. Node reference lattice now supports `publish_manifest`
**File:** `bobcoin-consensus/Lattice.js`

Previously, the Node reference lattice only supported `data_anchor` in its anchor-processing path.

That left an honest parity gap with the Go implementation, which already supported both:
- `data_anchor`
- `publish_manifest`

### New behavior
Node now supports `publish_manifest` blocks by:
- enforcing zero balance change for manifest publication
- validating `manifestId`, `locator`, and `manifestUrl`
- storing the resulting anchor with explicit typed metadata:
  - `id`
  - `owner`
  - `timestamp`
  - `type: 'publish_manifest'`

At the same time, the existing Node `data_anchor` branch was strengthened so it also stores anchors with an explicit `type: 'data_anchor'` field and retains payload fields directly.

This is a useful parity step because the Node reference can now participate in manifest-style anchor replay instead of only simpler anchor flows.

### 2. Node replay suite now covers a same-timestamp governance + HTLC + NFT + manifest ledger
**File:** `bobcoin-consensus/test_replay_semantics.js`

Added a new Node replay regression where:
- proposer opens from genesis
- proposer sends funds to voter
- voter opens
- proposal occurs at timestamp `T`
- vote occurs at timestamp `T`
- NFT mint occurs at timestamp `T`
- NFT transfer occurs at timestamp `T`
- HTLC lock occurs at timestamp `T`
- HTLC claim occurs shortly after
- `publish_manifest` occurs later
- `data_anchor` occurs later as another anchor/finalizer step

### Node assertions
The scenario verifies together that:
- proposal finalizes as `Passed`
- swap state is `CLAIMED`
- NFT ownership transfers to the voter
- manifest anchor is stored with `type: 'publish_manifest'`
- later anchor is stored with `type: 'data_anchor'`

This is now a materially broader mixed-feature replay test than the previous same-timestamp Node scenarios.

### 3. Go now covers durable recovery of the mirrored same-timestamp governance + HTLC + NFT + manifest ledger
**File:** `go-lattice/lattice_parity_test.go`

Added a SQLite-backed recovery regression for the mirrored richer mixed ledger.

The persisted historical path now includes:
- proposer genesis
- send to voter
- voter open
- proposal at timestamp `T`
- vote at timestamp `T`
- NFT mint at timestamp `T`
- NFT transfer at timestamp `T`
- HTLC lock at timestamp `T`
- HTLC claim shortly after
- `publish_manifest`
- later `data_anchor`

### Recovered-state assertions
The durable recovery test verifies that after restart:
- proposer chain length is correct
- voter chain length is correct
- proposal status is `Passed`
- vote state is preserved
- swap state is `CLAIMED`
- NFT ownership was transferred to the voter
- recovered manifest anchor exists and has `type: 'publish_manifest'`
- recovered data anchor exists and has `type: 'data_anchor'`

This is a stronger proving ground than the prior NFT-aware scenario because it validates both ownership state and multiple anchor types inside one recovered historical ledger.

## Validation Performed

### Node reference lattice
Command run:
- `cd C:/Users/hyper/workspace/bobcoin/bobcoin-consensus && npm test`

Result:
- Node replay semantics tests passed

### Go lattice
Commands run:
- `cd C:/Users/hyper/workspace/bobcoin/go-lattice && gofmt -w *.go`
- `cd C:/Users/hyper/workspace/bobcoin/go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd C:/Users/hyper/workspace/bobcoin/go-lattice && go test ./...`

Result:
- formatting succeeded
- build succeeded
- tests passed

### Frontend
Command run:
- `cd C:/Users/hyper/workspace/bobcoin/frontend && npm run build`

Result:
- production build succeeded
- PWA artifacts generated successfully
- non-fatal bundle warnings remain

## Why This Matters
This pass matters because manifest-style anchors are part of the real historical state surface, not optional decoration.

A system could preserve:
- proposal status
- vote state
- swap state
- NFT ownership

and still drift semantically if:
- manifest anchors are missing on one client
- anchor typing differs across clients
- richer archive/publication history does not survive replay and recovery correctly

By adding `publish_manifest` support on Node and then exercising mirrored same-timestamp manifest-aware ledgers on both sides, this pass makes the parity work more honest and more complete.

## Findings / Analysis

### Key finding 1: anchor typing is an important part of semantic parity
It is not enough for anchors to merely exist.

For parity-sensitive recovery and downstream features, the anchor also needs to preserve:
- what kind of anchor it is
- who owns it
- when it was created
- which payload fields belong to it

That is why adding typed `publish_manifest` handling on the Node side was worth doing.

### Key finding 2: mixed-feature replay surfaces keep getting more valuable as they broaden
This pass combined, inside one replay-sensitive historical ledger:
- governance
- votes
- swaps
- NFTs
- manifest publication
- anchor finalization

That is a much better approximation of real historical state pressure than narrow, isolated feature tests.

### Remaining likely high-value edge classes
The next likely targets are:
1. larger multi-account same-timestamp webs with more than two accounts across governance, HTLCs, NFTs, manifests, and anchors
2. deeper demurrage-sensitive same-timestamp histories where elapsed-time effects and bucket-order effects coexist in one richer ledger
3. fixture-driven mirrored scenario definitions to make Node and Go historical ledgers even more explicitly aligned
4. remaining service-level or API-level historical assumptions outside the lattice core

## Recommended Next Move
The best next move remains:
1. extend mirrored same-timestamp mixed ledgers to larger multi-account webs
2. keep the hardest scenarios durable on the Go side via SQLite-backed recovery
3. continue deliberately combining hostile ordering with broader state surfaces

## Files Changed In This Session
- `VERSION.md`
- `CHANGELOG.md`
- `HANDOFF.md`
- `MEMORY.md`
- `TODO.md`
- `bobcoin-consensus/Lattice.js`
- `bobcoin-consensus/test_replay_semantics.js`
- `go-lattice/lattice_parity_test.go`

## Operational Note
No running processes were terminated in this session.
