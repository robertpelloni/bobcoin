# Session Handoff - 2026-04-05 (v8.41.0)

## Executive Summary
This session continued the cross-client replay parity pass by moving from mixed-feature Node-only coverage to a more honestly mirrored cross-client scenario.

The key outcome is that both lattice implementations now exercise mixed governance + HTLC historical ledgers, and the Go side now does so through durable SQLite-backed recovery under demurrage-sensitive conditions.

That is a stronger form of evidence than isolated per-feature regressions because it proves several replay-sensitive systems can remain coherent together inside the same historical ledger.

## What Changed

### 1. Go now has a durable demurrage-sensitive mixed governance + HTLC recovery regression
**File:** `go-lattice/lattice_parity_test.go`

Added a new SQLite-backed recovery test that persists and reloads a mixed-feature ledger involving:
- proposer genesis
- demurrage-sensitive send to a voter
- voter open
- proposal creation after meaningful elapsed time
- vote submission using demurrage-adjusted balance
- HTLC lock
- HTLC claim
- later manifest publication after proposal expiry threshold

The recovered-state assertions verify together that:
- proposer chain length is correct
- voter chain length is correct
- proposal status finalizes to `Passed`
- vote state survives restart
- swap status survives restart as `CLAIMED`
- final proposer frontier balance matches the demurrage-adjusted expected manifest balance
- recovered anchor state includes the published manifest

This is important because it exercises several historically sensitive mechanisms in one persisted ledger:
- demurrage
- governance lifecycle
- HTLC lifecycle
- anchor reconstruction
- restart recovery

### 2. Node replay suite now includes a demurrage-sensitive mixed ledger scenario
**File:** `bobcoin-consensus/test_replay_semantics.js`

Added a new Node replay regression covering a demurrage-sensitive mixed ledger with:
- elapsed-time-sensitive proposer balance decay
- governance proposal + vote
- HTLC lock + claim
- later ledger-time finalizer block

The assertions verify together that:
- proposal status finalizes as `Passed`
- HTLC state remains `CLAIMED`
- final frontier balance matches the expected demurrage-adjusted finalizer balance

This extends the Node reference beyond basic time semantics and into a more realistic multi-feature ledger shape.

## Validation Performed

### Node reference lattice
Commands run:
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
This pass matters because parity confidence gets stronger when the same kind of historical ledger is exercised on both sides.

Before this pass:
- Node had mixed governance + HTLC replay coverage
- Go had strong replay/recovery coverage, but not yet the same demurrage-sensitive mixed ledger shape mirrored across clients

After this pass:
- Node and Go both cover mixed governance + HTLC histories
- Go additionally validates the scenario through persisted restart recovery
- demurrage-sensitive interactions are no longer only an implicit assumption

That is a more honest basis for saying the implementations are converging semantically.

## Findings / Analysis

### Key finding 1: mirrored mixed-feature ledgers are more informative than isolated parity checks
A client pair can appear aligned when you compare:
- votes in isolation
- swaps in isolation
- demurrage in isolation

But the real semantic question is whether all of those systems stay coherent together when historical time advances and a node restarts.

This session took a concrete step toward that stronger test surface.

### Key finding 2: persisted recovery remains the higher-value proving ground
The Node replay suite is useful and now much stronger than before, but the Go SQLite recovery test is especially valuable because restart behavior is where many subtle parity bugs emerge.

That means durable mixed-feature recovery tests should continue to be one of the highest-leverage parity investments.

### Remaining likely high-value edge classes
The next likely targets are:
1. same-timestamp mixed-feature ledgers mirrored across Node and Go
2. larger dependency webs where governance, HTLCs, manifests, and NFT ownership changes coexist
3. even nastier demurrage-sensitive restart histories with more elapsed-time boundaries and multiple accounts
4. explicit fixture-driven cross-client scenario definitions shared conceptually between Node and Go tests

## Recommended Next Move
The best next move remains:
1. build mirrored same-timestamp mixed-feature ledgers across Node and Go
2. extend them to include NFTs or manifests alongside governance + HTLCs
3. continue preferring durable recovery tests on the Go side for the hardest scenarios

## Files Changed In This Session
- `VERSION.md`
- `CHANGELOG.md`
- `TODO.md`
- `MEMORY.md`
- `HANDOFF.md`
- `bobcoin-consensus/test_replay_semantics.js`
- `go-lattice/lattice_parity_test.go`

## Operational Note
No running processes were terminated in this session.
