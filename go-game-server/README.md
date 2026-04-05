# go-game-server

Initial Go port of the Game Server control plane.

## Current Scope
This Go service ports the reasonable orchestration/control-plane behavior from `game-server/server.js`, including:
- runtime system wallet creation/loading
- SQLite bid/transaction persistence
- `/status`
- `/bankroll`
- `/mint`
- `/burn`
- `/transactions`
- `/market/bids`
- `/market/bid`
- `/market/accept`
- lattice system-chain bootstrap
- system `send` block construction/signing/submission for mint flows

## Current Reasonable Gaps
The original Node service still contains additional behavior that has not yet been fully mirrored here, including:
- WebSocket matchmaking for multiplayer signaling
- FHE oracle endpoints
- SP1/ZK verification flow in `/submit-proof`
- marketplace router/database nuances beyond the initial control-plane port

This Go port therefore focuses first on the core game-server control plane and lattice bridge surface, without overclaiming full feature parity yet.

## Build
```bash
cd go-game-server
go build -buildvcs=false ./...
```
