# Session Handoff - 2026-04-05 (v8.37.0)

## Executive Summary
This session continued the Go parity hardening pass by targeting a deeper replay-order/governance interaction bug class.

The key outcome is that Go replay is now more historically correct for proposal/vote lifecycles:
- replay finishes dependency resolution inside each timestamp bucket before moving to later timestamps
- vote validity is now checked against the block's timestamp instead of wall-clock time

Those two changes close an important category of false replay failures that could have appeared during audit or cold-boot recovery.

## What Changed

### 1. Timestamp-bucket replay semantics for audit and recovery
**File:** `go-lattice/lattice.go`

Previously, replay was dependency-resolving across the full ordered list, but it could still let later-timestamp blocks run before all earlier-timestamp deferred blocks had been fully settled.

That was a real correctness risk for governance history.

### Failure shape identified
A subtle but valid history can look like this:
- account A creates a proposal at timestamp `T`
- account B votes on that proposal at the same timestamp `T`
- deterministic ordering places the vote before the proposal, so the vote is deferred
- a later block at timestamp `T+Δ` gets processed in the same replay pass
- that later block advances proposal status refresh beyond the proposal end time
- the deferred vote is retried later and now incorrectly fails because the proposal appears closed

That means a replay engine could incorrectly reject a historically valid vote just because later timestamps were allowed to overtake unresolved same-timestamp work.

### New behavior
Both `AuditState()` and `Recovery()` now:
- process blocks in deterministic order
- isolate work by timestamp bucket
- resolve dependencies within each timestamp bucket until no more progress is possible
- only then advance to the next timestamp bucket

This preserves deterministic replay while also respecting temporal correctness.

### 2. Vote validation no longer depends on wall-clock time
**File:** `go-lattice/lattice.go`

A second issue surfaced during this pass:
- vote validation compared proposal expiry against `time.Now()`
- that makes historical replay nondeterministic and eventually wrong
- a historically valid vote could fail years later simply because the machine clock moved on

### New behavior
Vote validation now compares proposal expiry against `block.Timestamp`.

That means:
- replay is deterministic
- historical validation is based on ledger time, not wall-clock time
- cold-boot recovery and audit no longer become less correct as real time passes

### 3. New governance replay regression coverage
**File:** `go-lattice/lattice_parity_test.go`

Added regression coverage for three important cases:

#### A. Historical vote validity is based on block time
A new test proves that a vote with an old historical timestamp can still replay correctly when it was cast before the proposal's expiry, even though the current machine clock is far beyond that expiry.

#### B. Audit replay survives same-timestamp proposal/vote dependencies with later expiry
A new audit regression proves that:
- a `proposal` and dependent `vote` at the same timestamp can replay correctly under hostile account ordering
- a later post-expiry block does not incorrectly invalidate the deferred vote during replay
- final governance state is reconstructed correctly as `Passed`

#### C. Cold-boot SQLite recovery survives the same governance pattern
A new durable recovery regression proves the same scenario survives restart from SQLite, not just in-memory audit replay.

## Validation Performed

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
This is a meaningful upgrade in semantic honesty.

The important insight is that replay correctness is not just about dependency ordering in the abstract. It is also about temporal boundaries.

If later timestamps are allowed to overtake unresolved earlier-timestamp work, then replay can invent failures that never happened on the original ledger.

And if proposal expiry is checked against wall-clock time, then the same ledger can become "less valid" every day in replay, which is fundamentally wrong for deterministic consensus reconstruction.

This session removed both of those failure modes.

## Findings / Analysis

### Key finding 1: dependency-aware replay was necessary but not yet sufficient
The earlier replay-pass hardening solved a broad class of same-timestamp dependency problems.

But governance exposed the next layer:
- dependency resolution must happen before later timestamp buckets are allowed to mutate derived time-sensitive state
- otherwise replay can be structurally deterministic and still semantically wrong

### Key finding 2: replay must use ledger time, not observer time
Consensus replay cannot safely depend on `time.Now()` for historical validation.

For honest replay semantics, the only valid temporal reference is the ledger's own timestamp model.

The new vote fix aligns Go with that principle.

### Remaining likely high-value edge classes
The next likely edge classes are:
1. same-timestamp mixed-feature ledgers combining governance with swaps, manifests, and NFT transfers
2. demurrage-sensitive histories where multiple dependent actions happen around meaningful elapsed-time boundaries
3. larger restart ledgers where several cross-account dependency chains coexist inside the same timestamp bucket
4. service-level behavior outside the lattice core that may still rely on wall-clock assumptions

## Recommended Next Move
The best next move remains:
1. build larger mixed-feature same-timestamp restart ledgers
2. stress demurrage-sensitive replay boundaries with dependency-heavy histories
3. continue removing any remaining wall-clock-dependent validation from replay-critical paths

## Files Changed In This Session
- `VERSION.md`
- `CHANGELOG.md`
- `TODO.md`
- `MEMORY.md`
- `HANDOFF.md`
- `go-lattice/lattice.go`
- `go-lattice/lattice_parity_test.go`

## Operational Note
No running processes were terminated in this session.
