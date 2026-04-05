# Session Handoff - 2026-04-04 (v8.36.0)

## Executive Summary
This pass preserved the newer upstream Vault/provenance work and then layered a deeper Go recovery correctness improvement on top.

The merged result now includes:
- upstream archive diagnostics and typed publisher proof semantics
- stronger Go cold-boot replay correctness for same-timestamp cascading dependencies

That is the right direction for Bobcoin right now: preserve operator-surface improvements while continuing to convert Go lattice parity claims into executable restart-time semantics.

## Rebase / Merge Context
A direct push was rejected because `origin/main` advanced with upstream work including:
- source reliability snapshots from persisted recovery reports
- local persistence of recovery reports for later analysis
- typed publisher proof semantics in Vault and manifest anchors

Resolution strategy:
- preserve all upstream functionality
- rebase the Go recovery hardening work on top
- promote the combined branch to `v8.36.0`

## What This Pass Added

### 1. Cold-boot recovery now replays in dependency-resolving passes
**Files:**
- `go-lattice/lattice.go`

Previously, `Recovery()` loaded persisted blocks and attempted to replay them in a single linear pass. That was too fragile for same-timestamp cross-account dependency chains.

Example failure shape:
- Account A sends to Account B
- Account B opens from that send
- Account B sends to Account C
- Account C opens from that send
- all dependent blocks share the same timestamp

A strict single-pass replay can reject valid `open` blocks before their dependency-producing `send` blocks have been replayed.

### New behavior
`Recovery()` now:
- loads persisted blocks
- replays them in deterministic order
- defers blocks that cannot yet apply
- retries deferred blocks in later passes
- succeeds so long as a pass makes forward progress
- only reports final replay failures once a full pass makes no progress

This brings cold-boot recovery closer to the real dependency shape of a lattice ledger.

### 2. Deterministic persisted replay ordering
**Files:**
- `go-lattice/database.go`

SQLite replay reads are now explicitly ordered by:
- `timestamp ASC`
- `account ASC`
- `height ASC`
- `hash ASC`

This matters because:
1. replay is now reproducible instead of relying on unspecified timestamp-tie behavior
2. tests can intentionally create hostile ordering and still prove correct recovery behavior

### 3. Stronger same-timestamp audit replay regression
**Files:**
- `go-lattice/lattice_parity_test.go`

The earlier same-timestamp audit test is now stricter.

Instead of relying on arbitrary key ordering, it intentionally chooses descending account ordering so deterministic replay starts from a hostile order. That means the test now genuinely proves the dependency-pass logic is doing work.

### 4. New durable same-timestamp cascading recovery regression
**Files:**
- `go-lattice/lattice_parity_test.go`

Added a SQLite-backed restart test covering a cascading same-timestamp dependency chain:
- sender genesis
- sender `send` to relay
- relay `open`
- relay `send` to receiver
- receiver `open`

The test verifies after restart:
- sender chain restored
- relay chain restored
- receiver chain restored
- receiver balance correct
- no stale pending entries remain for the settled cascade

## Upstream Work Preserved In The Merged State
The rebased branch also retains newer operator-facing improvements already landed upstream:
- source reliability snapshots derived from persisted recovery reports
- locally persisted recovery reports for later diagnostics
- typed publisher proof semantics in Vault/workbench/manifest anchoring

So the branch advanced on both sides:
- backend replay correctness
- operator archive/provenance ergonomics

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
This is another meaningful shift away from superficial parity and toward honest semantic parity.

Before this pass:
- audit replay was dependency-aware
- cold-boot recovery was still more linear and more brittle

After this pass:
- both major Go replay surfaces are dependency-aware
- durable restart semantics now cover cascading same-timestamp dependencies
- persisted replay ordering is explicit and reproducible

That substantially improves confidence that the Go lattice will reconstruct valid histories correctly after restart, not just while running in-memory.

## Findings / Analysis

### Key architectural observation
A block lattice is not naturally a single globally ordered chain.

Because of that, any replay path that assumes one global sort is always sufficient is structurally risky. The safer model is:
- deterministic ordering for reproducibility
- dependency-resolving passes for correctness

That principle now governs both:
- `AuditState()`
- `Recovery()`

### Remaining likely edge classes
The next likely high-value replay gaps are:
1. more deeply interleaved same-timestamp multi-account cascades
2. histories mixing same-timestamp dependency chains with governance expiry timing
3. demurrage-sensitive histories where elapsed-time accounting and replay ordering interact in less obvious ways
4. durable restart histories mixing swaps, NFTs, anchors, manifests, and governance in one dependency-heavy ledger

## Recommended Next Move
The best next move remains:
1. build larger same-timestamp mixed-feature restart ledgers
2. combine replay-order stress with demurrage-sensitive balances and governance timing
3. continue turning remaining replay assumptions into durable Go regression tests

## Files Changed In This Session
- `VERSION.md`
- `CHANGELOG.md`
- `HANDOFF.md`
- `TODO.md`
- `MEMORY.md`
- `go-lattice/database.go`
- `go-lattice/lattice.go`
- `go-lattice/lattice_parity_test.go`

## Operational Note
No running processes were terminated in this session.
