# Session Handoff - 2026-04-05 (v8.50.0)

## Executive Summary
This session continued the parity campaign by introducing a richer three-account same-timestamp mirrored scenario where a secondary account performs more than one same-bucket action on its own chain.

That matters because previous multi-account same-timestamp ledgers already stressed cross-account replay ordering, but they still left room for a simpler per-secondary-account shape. This pass adds a stronger pattern:
- one secondary account votes on governance
- that same account then immediately places a market bid
- both actions occur in the same timestamp bucket
- both actions must still reconstruct correctly alongside the proposer's own same-timestamp governance, NFT, HTLC, and manifest actions

The result is a broader same-timestamp replay surface across both Node and Go, and a more realistic test of mixed same-account + cross-account ordering pressure.

## What Changed

### 1. Added a new mirrored three-account same-timestamp dual-collector-action scenario
**Files:**
- `testing/parity-scenarios.json`
- `testing/parity-fixture-fragments.json`

Added a new mirrored replay scenario entry:
- `multi_account_same_timestamp_dual_collector_actions`

Added a supporting shared fixture fragment:
- `collector-vote-extension`

This explicitly records that the scenario includes a same-timestamp collector-side governance action in addition to the collector-side market flow.

This is useful because the shared catalogs are now describing not just bigger scenarios, but structurally richer ones.

### 2. Node replay suite now covers the dual-collector-action ledger
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

This is stronger than prior scenarios because the collector account now performs two same-timestamp sequential actions on its own chain that also depend on broader mixed-ledger state.

### 3. Go now covers durable recovery of the mirrored dual-collector-action same-timestamp ledger
**File:** `go-lattice/lattice_parity_test.go`

Added a new SQLite-backed recovery regression for the mirrored scenario.

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

This is a stronger proving ground because it requires recovery to preserve:
- two different voter accounts
- same-account same-timestamp sequential collector actions
- proposer-side same-timestamp ownership/swap/manifest setup
- later accepted-bid and finalizer effects

### 4. Catalog validation now requires the new dual-action structure
**Files:**
- `bobcoin-consensus/test_replay_semantics.js`
- `go-lattice/parity_scenario_catalog_test.go`

The shared scenario/fragment catalog validation was extended so both Node and Go now require:
- the new `multi_account_same_timestamp_dual_collector_actions` scenario
- the new `collector-vote-extension` fragment
- valid scenario-to-fragment references for that richer mirrored scenario

That keeps the new structure executable rather than just documented.

## Validation Performed

### Node reference lattice
Command run:
- `cd C:/Users/hyper/workspace/bobcoin/bobcoin-consensus && npm test`

Result:
- Node replay semantics tests passed
- shared catalog validation passed
- dual-action scenario validation passed

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
- durable recovery of the dual-collector-action scenario passed

### Frontend
Command run:
- `cd C:/Users/hyper/workspace/bobcoin/frontend && npm run build`

Result:
- production build succeeded
- PWA artifacts generated successfully
- non-fatal bundle warnings remain

## Why This Matters
This pass matters because replay correctness is not only about whether several accounts can coexist in one timestamp bucket. It is also about whether an individual non-proposer account can perform a short same-timestamp sequence on its own chain while the broader mixed ledger is also evolving.

That is a subtler and more realistic failure surface than simpler one-action-per-secondary-account patterns.

A client could preserve:
- the proposer's same-timestamp chain
- a single cross-account vote dependency
- a single collector-side market action

and still drift once the collector has to perform two same-bucket actions in sequence.

This pass explicitly attacked that higher-value surface.

## Findings / Analysis

### Key finding 1: same-account sequencing inside same-timestamp mixed ledgers is worth testing explicitly
The parity campaign has already shown that same-timestamp cross-account dependencies matter.

This pass adds a complementary insight:
- same-account sequential actions inside the same timestamp bucket are also worth treating as a distinct replay pressure surface

Especially when one action also depends on broader mixed-ledger state.

### Key finding 2: fragment catalogs become more useful as scenario structure gets richer
The new `collector-vote-extension` fragment is a good example of why the shared fragment vocabulary helps:
- it gives the project a reusable name for this structural variation
- it makes the scenario catalog more informative
- it makes future richer scenarios easier to describe without burying structure only in test code

## Remaining likely high-value edge classes
The next likely targets are:
1. even larger same-timestamp webs with more than one secondary account performing same-bucket sequential actions
2. demurrage-sensitive variants of the new dual-collector-action structure
3. deeper fixture-driven alignment where fragments begin informing more than catalog validation
4. broader service/API assumptions outside the lattice core that still lag the increasingly strong replay semantics already present here

## Recommended Next Move
The best next move remains:
1. add a demurrage-sensitive variant of the new dual-collector-action scenario
2. continue scaling larger mirrored same-timestamp multi-account webs carefully
3. keep the hardest scenarios durable on the Go side via SQLite-backed recovery

## Files Changed In This Session
- `VERSION.md`
- `CHANGELOG.md`
- `HANDOFF.md`
- `MEMORY.md`
- `TODO.md`
- `testing/parity-scenarios.json`
- `testing/parity-fixture-fragments.json`
- `bobcoin-consensus/test_replay_semantics.js`
- `go-lattice/parity_scenario_catalog_test.go`
- `go-lattice/lattice_parity_test.go`

## Operational Note
No running processes were terminated in this session.
