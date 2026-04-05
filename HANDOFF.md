# Session Handoff - 2026-04-05 (v8.47.0)

## Executive Summary
This session continued the parity campaign by taking the larger three-account same-timestamp mixed ledger and making it demurrage-sensitive.

That is an important escalation because it combines three separate stress dimensions in one mirrored historical scenario:
- replay-order pressure from same-timestamp multi-account interactions
- broader mixed-feature pressure from governance, market, HTLC, NFT, and anchor state
- elapsed-time pressure from demurrage-sensitive balances feeding later block validity

The result is that both lattice implementations now exercise a demurrage-sensitive three-account same-timestamp mixed ledger, and the Go side proves the scenario through durable SQLite-backed recovery under hostile ordering.

## What Changed

### 1. Node replay suite now covers a demurrage-sensitive three-account same-timestamp mixed ledger
**File:** `bobcoin-consensus/test_replay_semantics.js`

Added a new Node replay regression with:
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
- manifest anchor is typed `publish_manifest`
- final anchor is typed `data_anchor`

This is stronger than the non-demurrage version because all of those states now depend on balances that have decayed over meaningful elapsed time.

### 2. Go now covers durable recovery of the mirrored demurrage-sensitive three-account same-timestamp ledger
**File:** `go-lattice/lattice_parity_test.go`

Added a new SQLite-backed recovery regression for the mirrored demurrage-sensitive broader ledger.

The account ordering is again intentionally hostile:
- proposer sorts after voter
- voter sorts after collector

That keeps the replay test honest while also forcing recovery to reconstruct balances and derived state correctly under elapsed-time pressure.

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
- recovered proposer frontier balance matches the expected final demurrage-sensitive balance

That last balance assertion is important because it validates not only logical state maps, but also the concrete recovered economic state of the proposer chain.

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
This pass matters because replay and recovery bugs often hide in the interaction between:
- ordering
- derived state
- economics

A client might preserve all the right maps and ownership transitions, yet still drift on the actual recovered balances once elapsed time becomes significant.

By making the larger same-timestamp mixed ledger demurrage-sensitive, this pass pushes parity testing closer to real semantic/economic correctness instead of only structural correctness.

## Findings / Analysis

### Key finding 1: demurrage-sensitive mixed ledgers are a stronger economic parity surface
Prior passes established strong coverage for:
- replay order
- lifecycle semantics
- ownership semantics
- anchor reconstruction

This pass adds another layer:
- whether those histories still reconstruct correctly when liquid balances have materially decayed over time

That is a more honest approximation of actual economic replay correctness.

### Key finding 2: frontier balance assertions are worth keeping in recovery tests
The broader mixed-state assertions are valuable, but explicitly checking the recovered frontier balance adds an important economic correctness signal.

That pattern is worth continuing in future durable recovery tests whenever demurrage is a meaningful part of the historical ledger.

### Remaining likely high-value edge classes
The next likely targets are:
1. even larger multi-account same-timestamp webs with more than one recipient-side same-bucket dependency surface
2. fixture-driven mirrored historical scenarios so Node and Go stay explicitly aligned as test complexity grows
3. broader API/service assumptions outside the lattice core that may still lag the increasingly strong replay semantics now present in consensus/state tests
4. eventual explicit scenario catalogs so semantic coverage is easier to audit feature-by-feature

## Recommended Next Move
The best next move remains:
1. continue scaling the same-timestamp multi-account mixed ledgers carefully
2. keep the hardest scenarios durable on the Go side via SQLite-backed recovery
3. begin considering fixture-driven mirrored scenario definitions as complexity increases further

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
