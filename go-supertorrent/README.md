# go-supertorrent

Initial Go port of the SuperTorrent / supernode control plane.

## Current Scope
This Go service ports the reasonable control-plane behavior from `supertorrent/server.js`, including:
- wallet creation/loading
- persisted torrent registry
- core anchor tracking
- root-path WebSocket matchmaking/signaling shell
- `/status` compatibility proxy to the game-server status surface
- `/stats` for local supernode state
- `/add-torrent`
- `/remove-torrent`
- `/upload`
- `/spora/:challenge`
- lattice bootstrap/open flow
- market bid polling and `accept_bid` claim submission

## Current Reasonable Gap
The original Node service still relies on `webtorrent` for a full BitTorrent/WebRTC seeding engine.
That exact transport stack is not yet mirrored here.

This Go port therefore focuses first on the supernode control plane, persistence, SPoRA service surface, compatibility proxy shell, and lattice integration, while leaving full torrent-engine parity as a later step.

## Default Port
- `8000` by default via `SUPERNODE_PORT`

This aligns the Go supertorrent shell with the frontend's Go-first supernode defaults.

## Build
```bash
cd go-supertorrent
go build -buildvcs=false ./...
```
