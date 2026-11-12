# bobcoin — "replace money with dancing"

An experimental cryptocurrency/game-economy project: a coin earned through
*play* — specifically dancing (rhythm-game play) — instead of mining or
purchase. The repo is a sprawling multi-component workspace rather than a
single program:

| Component | What it is |
|---|---|
| `bobcoin-consensus/` | The consensus layer |
| `proof-of-play/` | The proof-of-play mechanism (earn by playing) |
| `rust-lattice/`, `go-lattice/` | Lattice/data-structure implementations in Rust and Go |
| `game-server/`, `go-game-server/` | Game servers the economy plugs into |
| `go-casino/` | Casino games component |
| `go-supertorrent/` | Torrent-based distribution component |
| `frontend/` | Web frontend |
| `research/`, `docs/` | Design research and documentation |

## Status — read before believing anything

This is an **experiment, not a currency**. There is no live chain, no live
network, no economic value here, no audited cryptography, and nothing in this
repo should be treated as a financial instrument or used to store value.

The tree is a bot-assisted working workspace (session markers, build reports,
per-assistant instruction files included) where several architectural attempts
sit side by side — the Go and Rust variants of the same components are
alternatives, not a stack. Version numbers in commit messages (v8.116.x as of
November 2026) reflect the author's internal release cadence, not a shipped
product.

Part of Robert Pelloni's bob\* ecosystem (bob's game, bobzilla, …). Concept
stage; kept for the design work and the proof-of-play idea.

## Last significant activity

- **2026-11-12** — merge of a Jules session branch into main.
- **2026-11-09–10** — a run of v8.116.7–v8.116.9 releases: AI Oracle /
  neural-governance telemetry, stealth-address scanning, vitality-proof
  endpoints, E2E tests. These are incremental workspace commits, not a
  launch — the "no live chain" status above still holds.

## Links

- Author: https://robertpelloni.com
- Related: bob's game (robertpelloni/bobsgameonline)
