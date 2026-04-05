# Session Handoff - 2026-04-05 (v8.51.0)

## Executive Summary
This session continued the parity campaign by taking the richer dual-collector-action same-timestamp mirrored ledger and making it demurrage-sensitive.

That matters because it combines four important replay/economic stress dimensions in one mirrored scenario:
- same-timestamp cross-account dependencies
- same-account sequential actions by a secondary account
- broader mixed-feature state across governance, market, HTLC, NFT, and anchors
- elapsed-time economic pressure from demurrage-sensitive balances

The result is that both Node and Go now exercise a demurrage-sensitive version of the dual-collector-action same-timestamp ledger, and the Go side proves that richer scenario through durable SQLite-backed recovery under hostile ordering.

## What Changed

### 1. Added a demurrage-sensitive mirrored scenario entry to the shared parity catalog
**File:** `testing/parity-scenarios.json`

Added a new mirrored replay scenario:
- `demurrage_multi_account_same_timestamp_dual_collector_actions`

This keeps the shared parity inventory honest about the latest replay/economic surface now being tested across both implementations.

### 2. Node replay suite now covers the demurrage-sensitive dual-collector-action ledger
**File:** `bobcoin-consensus/test_replay_semantics.js`

Added a new Node replay regression with three accounts:
- proposer
- voter
- collector

### Historical ledger shape
The scenario includes:
- proposer genesis far enough in the past for visible demurrage effects
- proposer sends to voter after elapsed time
- voter opens
- proposer sends to collector after more elapsed time
- collector opens
- proposal at timestamp `T`
- voter vote at timestamp `T`
- collector vote at timestamp `T`
- collector market bid at timestamp `T` on the next collector height
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
- voter vote is preserved
- collector vote is preserved
- swap state is `CLAIMED`
- NFT ownership transfers to the collector
- market bid becomes `ACCEPTED`
- manifest anchor is typed `publish_manifest`
- final anchor is typed `data_anchor`

This is stronger than the non-demurrage version because all those states now depend on balances that have materially decayed over time.

### 3. Go now covers durable recovery of the mirrored demurrage-sensitive dual-collector-action ledger
**File:** `go-lattice/lattice_parity_test.go`

Added a new SQLite-backed recovery regression for the mirrored scenario.

The account ordering remains intentionally hostile:
- proposer sorts after voter
- voter sorts after collector

That keeps the test honest while also forcing recovery to reconstruct both state maps and final balances under elapsed-time pressure.

### Recovered-state assertions
The durable recovery test verifies that after restart:
- proposer chain length is correct
- voter chain length is correct
- collector chain length is correct
- recovered proposal status is `Passed`
- recovered voter vote is preserved
- recovered collector vote is preserved
- recovered swap state is `CLAIMED`
- recovered NFT ownership transfers to the collector
- recovered market bid exists and is `ACCEPTED`
- recovered accepted bid attribution points to the proposer
- recovered manifest anchor exists and is typed `publish_manifest`
- recovered data anchor exists and is typed `data_anchor`
- recovered proposer frontier balance matches the expected final demurrage-sensitive balance

That last balance assertion is especially valuable because it checks actual recovered economic state, not just logical state maps.

### 4. Catalog validation now requires the new demurrage-sensitive dual-action scenario
**Files:**
- `bobcoin-consensus/test_replay_semantics.js`
- `go-lattice/parity_scenario_catalog_test.go`

Both Node and Go catalog validation were extended so they now require:
- the new `demurrage_multi_account_same_timestamp_dual_collector_actions` scenario entry
- the upgraded scenario catalog version that includes it

This keeps the new richer replay/economic surface executable in the shared parity inventory.

## Validation Performed

### Node reference lattice
Command run:
- `cd C:/Users/hyper/workspace/bobcoin/bobcoin-consensus && npm test`

Result:
- Node replay semantics tests passed
- shared catalog validation passed
- demurrage-sensitive dual-action scenario validation passed

### Go lattice
Commands run:
- `cd C:/Users/hyper/workspace/bobcoin/go-lattice && gofmt -w *.go`
- `cd C:/Users/hyper/workspace/bobcoin/go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd C:/Users/hyper/workspace/bobcoin/go-lattice && go test ./...`

Result:
- formatting succeeded
- build succeeded
- tests passed
- shared catalog validation passed
- durable recovery of the demurrage-sensitive dual-collector-action scenario passed

### Frontend
Command run:
- `cd C:/Users/hyper/workspace/bobcoin/frontend && npm run build`

Result:
- production build succeeded
- PWA artifacts generated successfully
- non-fatal bundle warnings remain

## Why This Matters
This pass matters because the parity effort is now probing a much more realistic and demanding replay/economic surface.

A client could preserve:
- the dual-collector-action same-timestamp structure
- the market and governance state maps
- the anchor and NFT state

and still be wrong if the actual recovered balances drift once demurrage becomes significant.

By making the richer dual-action mirrored ledger demurrage-sensitive and then asserting recovered frontier balance on the Go side, this pass pushes the parity campaign closer to true economic replay correctness rather than only structural replay correctness.

## Findings / Analysis

### Key finding 1: economic pressure should keep following the richer replay shapes
Earlier work established that demurrage-sensitive scenarios are useful.
This pass shows that adding demurrage to the richer dual-action same-timestamp shape is also worthwhile.

That suggests a good ongoing pattern:
- whenever a structurally richer mirrored scenario proves useful,
- consider whether it also deserves a demurrage-sensitive variant.

### Key finding 2: scenario catalogs are now helping the campaign scale cleanly
The new scenario entry keeps the shared parity inventory aligned with the newly expanded replay surface.

That reinforces the value of the catalog work from the last two passes: as the semantic surface grows, it is easier to maintain when the active mirrored scenarios are explicit rather than buried only in test bodies.

## Remaining likely high-value edge classes
The next likely targets are:
1. even larger same-timestamp webs where more than one secondary account performs same-bucket sequential actions
2. deeper fixture-driven alignment where fragments start informing scenario assembly rather than only validation
3. continued expansion of durable Go recovery coverage for the hardest economic replay shapes
4. broader service/API assumptions outside the lattice core that may still lag the increasingly strong consensus replay semantics now under test

## Recommended Next Move
The best next move remains:
1. continue scaling larger same-timestamp multi-account webs carefully
2. keep the hardest scenarios durable on the Go side via SQLite-backed recovery
3. begin thinking about whether some fragment combinations should start guiding scenario assembly more directly

## Files Changed In This Session
- `VERSION.md`
- `CHANGELOG.md`
- `HANDOFF.md`
- `MEMORY.md`
- `TODO.md`
- `testing/parity-scenarios.json`
- `bobcoin-consensus/test_replay_semantics.js`
- `go-lattice/parity_scenario_catalog_test.go`
- `go-lattice/lattice_parity_test.go`

## Operational Note
No running processes were terminated in this session.
