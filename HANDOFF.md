# Session Handoff - 2026-04-05 (v8.38.0)

## Executive Summary
This session continued the replay-determinism hardening pass by removing another wall-clock dependency from the Go lattice: HTLC swap expiry validation.

The key outcome is that Go replay and recovery are now more historically honest for swap lifecycles as well as governance lifecycles.

In practical terms:
- swap claims are validated against ledger time (`block.Timestamp`), not machine time
- default swap expiries are derived from the block timestamp, not `time.Now()`
- durable tests now cover both historical HTLC claims and recovery of implicit/default expiry semantics

## What Changed

### 1. Swap-claim expiry validation now uses ledger time
**File:** `go-lattice/lattice.go`

Previously, Go validated `swap_claim` expiry using `time.Now().UnixMilli()`.

That had the same class of problem the proposal/vote logic had before the last pass:
- a historically valid claim could fail later simply because replay happened long after the original event
- cold-boot recovery would become less correct as real time advanced
- audit and recovery could diverge from the actual ledger semantics

### New behavior
`swap_claim` now checks:
- `block.Timestamp > swap.Expiry`

instead of:
- `time.Now().UnixMilli() > swap.Expiry`

That makes HTLC replay historically deterministic.

### 2. Default swap expiry is now derived from block time
**File:** `go-lattice/lattice.go`

A second nondeterminism existed in `swap_lock` materialization:
- when no expiry was provided, Go defaulted to `time.Now() + 1h`

That meant the same historical `swap_lock` block could materialize different expiry values depending on when it was replayed.

### New behavior
When `swap_lock` omits an explicit expiry, Go now derives it from ledger time:
- `block.Timestamp + 3600000`

This means:
- the same block always yields the same swap expiry on replay
- recovery remains deterministic
- persisted state reconstruction does not drift with observer time

## New Regression Coverage
**File:** `go-lattice/lattice_parity_test.go`

### 1. Historical swap claim uses block time, not wall clock
Added a regression proving that:
- a swap locked in the distant past can still be claimed successfully during replay when the claim block timestamp is before the HTLC expiry
- the test remains valid even though real-world time is far beyond the swap expiry

This is the direct HTLC analogue of the earlier historical governance vote fix.

### 2. SQLite-backed recovery reconstructs default swap expiry deterministically
Added a durable recovery regression proving that:
- a `swap_lock` persisted without an explicit expiry still reconstructs a deterministic expiry after cold boot
- the recovered expiry equals `lockBlock.Timestamp + 1h`
- a subsequent claim with a valid block timestamp succeeds on the recovered lattice

That turns another replay assumption into executable proof.

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
This is another meaningful step away from feature-count parity and toward honest historical semantics.

The broader pattern now visible in the Go port is:
- any replay-critical validation tied to wall-clock time is suspect
- any default state materialization tied to wall-clock time is suspect

Those patterns have now been removed for:
- proposal/vote expiry
- swap claim expiry
- implicit/default HTLC expiry derivation

That materially improves restart and audit determinism.

## Findings / Analysis

### Key finding 1: wall-clock drift is a recurring replay hazard
This pass confirms a useful rule of thumb for the Go lattice:
- if a consensus/replay path references `time.Now()` for historical validation or derived state, it is probably wrong or at least dangerously nondeterministic

Replay-critical logic should almost always derive from:
- the block timestamp
- persisted state
- deterministic ordering

### Key finding 2: default-derived fields matter just as much as validation
It is not enough to fix validation checks.

Even when a block validates, replay can still diverge if derived state is generated from observer time instead of ledger time. The `swap_lock` default expiry issue was exactly that kind of bug.

### Remaining likely high-value edge classes
The next likely targets are now:
1. larger mixed-feature same-timestamp ledgers combining governance and HTLCs
2. demurrage-sensitive restart histories with multiple dependent actions around meaningful elapsed-time boundaries
3. additional replay-critical paths that may still depend on wall-clock time outside the lattice core
4. Node reference-side semantic mismatches where Node still uses `Date.now()` for historical validation

## Recommended Next Move
The best next move remains:
1. build mixed governance + HTLC restart ledgers
2. stress demurrage-sensitive replay boundaries under dependency-heavy histories
3. continue auditing replay-critical logic for any remaining wall-clock-derived semantics

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
