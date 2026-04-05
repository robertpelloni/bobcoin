# Session Handoff - 2026-04-05 (v8.39.0)

## Executive Summary
This session extended the replay-determinism hardening work beyond the Go port and into the Node reference lattice.

That was the right next move because the Go side had just eliminated multiple wall-clock-dependent replay bugs, but the Node reference still retained the same semantic hazards via `Date.now()`.

The result is a more honest cross-client parity position:
- Go replay remains ledger-time-driven
- Node reference replay is now aligned on the same replay-critical time semantics
- Node now has executable replay regressions instead of an empty placeholder test command

## What Changed

### 1. Node governance vote validation now uses ledger time
**File:** `bobcoin-consensus/Lattice.js`

Previously, the Node reference validated proposal voting using:
- `Date.now() > new Date(proposal.endTime).getTime()`

That meant a historically valid vote could fail in replay simply because the machine clock had advanced beyond the proposal's end time.

### New behavior
Node voting now checks proposal expiry against:
- `block.timestamp`

This matches the corrected Go behavior and makes historical vote replay deterministic instead of observer-time-dependent.

### 2. Node HTLC claim validation now uses ledger time
**File:** `bobcoin-consensus/Lattice.js`

Previously, Node validated HTLC claim expiry using:
- `Date.now() > swap.expiry`

That created the same replay hazard seen earlier in Go:
- a historically valid claim could fail later just because replay happened long after the original claim event

### New behavior
Node HTLC claims now validate using:
- `block.timestamp > swap.expiry`

This makes Node swap replay historically deterministic as well.

### 3. Node default HTLC expiry is now deterministic
**File:** `bobcoin-consensus/Lattice.js`

Previously, Node created implicit HTLC expiry using:
- `Date.now() + 3600000`

That meant the same `swap_lock` block could materialize different expiry values depending on when it was replayed.

### New behavior
Node now derives default HTLC expiry from ledger time:
- `block.timestamp + 3600000`

This matches the newer Go behavior and removes another cross-client nondeterminism source.

## New Node Regression Coverage
**Files:**
- `bobcoin-consensus/test_replay_semantics.js`
- `bobcoin-consensus/package.json`

Added a dedicated replay-semantics regression script for the Node reference implementation.

### New cases covered
1. **Historical governance vote validation**
   - verifies a vote is accepted because its block timestamp is before proposal expiry
   - does not depend on the current wall clock

2. **Historical HTLC claim validation**
   - verifies a swap claim is accepted because its block timestamp is before swap expiry
   - does not depend on the current wall clock

3. **Deterministic default HTLC expiry derivation**
   - verifies omitted HTLC expiry defaults to `block.timestamp + 1h`
   - proves Node materializes the same swap state on replay

### Test command improvement
`bobcoin-consensus/package.json` previously had a placeholder test script that always failed.

It now runs:
- `node test_replay_semantics.js`

So Node replay semantics are now executable and validated, not just assumed.

## Validation Performed

### Node reference lattice
Command run:
- `cd C:/Users/hyper/workspace/bobcoin/bobcoin-consensus && npm test`

Result:
- Node replay semantics tests passed

### Go lattice
Commands run:
- `cd C:/Users/hyper/workspace/bobcoin/go-lattice && go build -buildvcs=false -o bobcoin-go-lattice.exe .`
- `cd C:/Users/hyper/workspace/bobcoin/go-lattice && go test ./...`

Result:
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
This pass matters because parity cannot honestly be claimed if the reference client and the Go port disagree on replay-critical time semantics.

Before this pass:
- Go had been hardened away from wall-clock replay logic
- Node still had `Date.now()`-driven behavior for proposal voting and HTLCs

That meant the two clients could diverge historically even if they appeared functionally similar at a feature level.

After this pass:
- the Node reference is materially closer to Go on historical validation rules
- both clients now derive replay-critical governance and HTLC time behavior from ledger time instead of observer time
- both sides now have executable regression coverage for the relevant semantic area

## Findings / Analysis

### Key finding 1: parity work must sometimes move the reference too
The recent Go hardening exposed that some "reference" behavior in Node was not actually a good semantic target because it was observer-time-dependent.

That is an important lesson:
- parity is not always "copy the old behavior"
- sometimes parity requires correcting both clients toward deterministic ledger semantics

### Key finding 2: replay-critical time semantics are now becoming a project-wide invariant
A clear invariant is emerging across the lattice core:
- replay-critical validation should use block timestamps
- replay-critical derived defaults should use block timestamps
- observer time is acceptable for UI/status surfaces, but not historical consensus replay

That principle now holds across both Go and Node in the governance and HTLC paths.

### Remaining likely high-value edge classes
The next likely targets are:
1. mixed governance + HTLC histories across both clients
2. same-timestamp dependency webs that combine governance, swaps, and manifests
3. demurrage-sensitive cross-client replay parity under dependency-heavy histories
4. any remaining Node or service-side validation paths that still depend on `Date.now()` in historically sensitive ways

## Recommended Next Move
The best next move remains:
1. build mixed governance + HTLC replay ledgers across Go and Node
2. stress same-timestamp multi-feature histories
3. continue auditing both implementations for any remaining wall-clock-dependent replay semantics

## Files Changed In This Session
- `VERSION.md`
- `CHANGELOG.md`
- `TODO.md`
- `MEMORY.md`
- `HANDOFF.md`
- `bobcoin-consensus/Lattice.js`
- `bobcoin-consensus/package.json`
- `bobcoin-consensus/test_replay_semantics.js`

## Operational Note
No running processes were terminated in this session.
