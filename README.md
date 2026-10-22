# bobcoin — "replace money with dancing"

An experimental cryptocurrency/game-economy project: a coin earned through *play* — specifically dancing (rhythm-game play) — instead of mining or purchase. The repo is a sprawling multi-component workspace rather than a single program:

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

This is an **experiment, not a currency**. There is no live chain with economic value here, no audited cryptography, and nothing in this repo should be treated as a financial instrument or used to store value. The tree is a bot-assisted working workspace (session markers, build reports, per-assistant instruction files included) where several architectural attempts sit side by side — the Go and Rust variants of the same components are alternatives, not a stack.

Part of Robert Pelloni's bob* ecosystem (bob's game, bobzilla, …). Concept stage; kept for the design work and the proof-of-play idea.
