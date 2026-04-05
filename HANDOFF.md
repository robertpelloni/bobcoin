# Session Handoff - 2026-04-05 (v8.46.0)

## Executive Summary
This session continued the parity campaign by scaling the same-timestamp mixed-feature ledger shape from two accounts to three accounts.

That matters because larger same-timestamp replay webs are more realistic and more dangerous than smaller ones. Once three accounts interact, replay must preserve not just one cross-account dependency and one local state sequence, but multiple overlapping state surfaces at once.

The result is that both lattice implementations now exercise a broader same-timestamp ledger combining:
- governance lifecycle
- vote preservation
- market bid / accept-bid lifecycle
- HTLC lifecycle
- NFT ownership transfer
- manifest publication
- later data-anchor finalization

And the Go side proves that broader historical ledger through durable SQLite-backed recovery under hostile account ordering.

## What Changed

### 1. Node replay suite now covers a three-account same-timestamp mixed ledger
**File:** `bobcoin-consensus/test_replay_semantics.js`

Added a new Node replay regression with three accounts:
- proposer
- voter
- collector

### Historical ledger shape
The scenario includes:
- proposer genesis
- proposer sends to voter
- voter opens
- proposer sends to collector
- collector opens
- proposal at timestamp `T`
- vote at timestamp `T`
- collector market bid at timestamp `T`
- proposer NFT mint at timestamp `T`
- proposer NFT transfer to collector at timestamp `T`
- proposer HTLC lock at timestamp `T`
- proposer `publish_manifest` at timestamp `T`
- proposer HTLC claim shortly after
- proposer `accept_bid` later
- proposer `data_anchor` finalizer later

### Node assertions
The scenario verifies together that:
- proposal finalizes as `Passed`
- swap state is `CLAIMED`
- NFT ownership transfers to the collector
- market bid becomes `ACCEPTED`
- accepted bid records the proposer as `acceptedBy`
- manifest anchor is typed `publish_manifest`
- final anchor is typed `data_anchor`

This is now a much broader replay harness than the earlier two-account mixed ledgers.

### 2. Go now covers durable recovery of the mirrored three-account same-timestamp mixed ledger
**File:** `go-lattice/lattice_parity_test.go`

Added a new SQLite-backed recovery regression for the mirrored three-account historical ledger.

The account ordering is intentionally hostile:
- proposer sorts after voter
- voter sorts after collector

That means deterministic replay order is not naturally favorable to dependency reconstruction, which is exactly what we want for an honest recovery test.

### Recovered-state assertions
The durable recovery test verifies that after restart:
- proposer chain length is correct
- voter chain length is correct
- collector chain length is correct
- recovered proposal status is `Passed`
- recovered vote state is preserved
- recovered swap state is `CLAIMED`
- recovered NFT ownership transfers to the collector
- recovered market bid exists and is `ACCEPTED`
- recovered accepted bid attribution points to the proposer
- recovered manifest anchor exists and is typed `publish_manifest`
- recovered data anchor exists and is typed `data_anchor`

This is a significantly stronger recovery surface because it validates multiple cross-account state machines in one persisted same-timestamp ledger.

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
This pass matters because small mixed ledgers can still hide replay weaknesses that only appear once a third account adds another dependency web.

A client might correctly preserve:
- proposal state
- vote state
- swap state
- NFT state

in a two-account ledger, yet still drift once:
- a third account introduces another live chain
- market bid state must also reconstruct correctly
- same-timestamp replay now spans more independent accounts and more concurrent state surfaces

This session directly attacked that higher-value parity surface.

## Findings / Analysis

### Key finding 1: larger multi-account same-timestamp webs are the next honest escalation
The prior work established that same-timestamp mixed ledgers were valuable.

This pass confirms that scaling them to more accounts is worthwhile because it forces replay to preserve more interacting state at once:
- cross-account governance dependency
- collector-side market state
- proposer-side ownership and swap state
- later finalizer-based lifecycle advancement

### Key finding 2: accepted-bid reconstruction is a useful additional state surface
By including `market_bid` + `accept_bid` in the broader same-timestamp mixed ledger, this pass added another meaningful recovered-state dimension beyond proposals, swaps, NFTs, and anchors.

That helps move the parity effort from narrow feature slices toward more realistic multi-feature state webs.

### Remaining likely high-value edge classes
The next likely targets are:
1. deeper demurrage-sensitive variants of the larger three-account same-timestamp ledger
2. even larger multi-account webs with more than one same-timestamp recipient-side action surface
3. fixture-driven mirrored historical scenarios so Node and Go stay explicitly aligned as coverage grows
4. service-level or API-layer historical assumptions outside the lattice core that still lag the replay hardening already underway in consensus/state code

## Recommended Next Move
The best next move remains:
1. add a demurrage-sensitive version of the larger three-account same-timestamp mixed ledger
2. keep the hardest scenarios durable on the Go side via SQLite-backed recovery
3. continue broadening mirrored Node replay scenarios as the Go durable surface grows

## Files Changed In This Session
- `VERSION.md`
- `CHANGELOG.md`
- `HANDOFF.md`
- `MEMORY.md`
- `TODO.md`
- `bobcoin-consensus/test_replay_semantics.js`
- `go-lattice/lattice_parity_test.go`

## Operational Note
No running processes were terminated in this session.
