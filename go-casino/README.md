# go-casino

Initial Go port of the Bobcoin Autonomous Casino Bot.

## Current Scope
This Go service ports the autonomous game logic from `bobcoin-consensus/casino.js`, including:
- wallet creation/loading
- automatic bankroll bootstrapping via the Game Server
- lattice interaction (fetching pending bets, submitting receive/send blocks)
- provably fair game logic based on block hashes
- automatic payout orchestration

## Build
```bash
cd go-casino
go build -buildvcs=false ./...
```
