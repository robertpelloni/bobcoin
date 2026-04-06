# go-game-server

Initial Go port of the Game Server control plane.

## Current Scope
This Go service ports the reasonable orchestration/control-plane behavior from `game-server/server.js`, including:
- runtime system wallet creation/loading
- SQLite bid/transaction persistence
- `/status`
- WebSocket matchmaking/signaling on the root path
- `/bankroll`
- `/mint`
- `/burn`
- `/fhe-oracle` bridge shell
- `/submit-proof` orchestration shell with optional verification bridge
- `/transactions`
- `/market/bids`
- `/market/bid`
- `/market/accept`
- lattice system-chain bootstrap
- system `send` block construction/signing/submission for mint flows

## Current Reasonable Gaps
The original Node service still contains additional behavior that has not yet been fully mirrored here, including:
- true native FHE oracle parity beyond the current `/fhe-oracle` bridge shell
- full SP1/ZK backend verification parity beyond the current `/submit-proof` orchestration shell and optional verification bridge
- deeper marketplace/gameplay orchestration nuances beyond the initial control-plane port

This Go port therefore focuses first on the core game-server control plane and lattice bridge surface, without overclaiming full feature parity yet.

By default, the Go game-server now targets the Go supertorrent shell at `http://localhost:8000` through `SUPERNODE_URL`, aligning the two Go service shells out of the box.

## Build
```bash
cd go-game-server
go build -buildvcs=false ./...
```
