# Session Handoff - 2026-02-07

## Overview
This session focused on completing the "Phase II: Decentralized Oracle" and starting "Phase III: Sovereign Network" features for Bobcoin.
We have successfully integrated a real Rust-based ZK Service (SP1), implemented a persistent Governance DAO, and closed the economic loop with a "Burn" mechanism for storage and items.

## Architecture State

1.  **Frontend (`frontend/`)**:
    - React + Vite + React Router v6.
    - Cyberpunk Theme.
    - Pages: Dashboard (Rhythm Game), Supernode (Storage), Wallet (Privacy), Governance (DAO), Manual (Docs), System (Status).
    - **Key Config**: `vite.config.js` reads version from `VERSION.md`.

2.  **Game Server (`game-server/`)**:
    - Node.js Express (Port 3000 -> 3001).
    - Acts as Orchestrator/Oracle.
    - **Governance**: Persists proposals to `proposals.json`.
    - **ZK**: Proxies verification requests to `zk-service`.
    - **Burn**: Exposes `/burn` endpoint calling the Bridge.

3.  **Supernode (`supertorrent/`)**:
    - Node.js Express (Port 8080 -> 8081).
    - **Storage**: WebTorrent client. Persists magnet links to `torrents.json`.
    - **Bridge**: `BobcoinBridge` class handles Solana interactions (Mint/Burn/Memo).
    - **Note**: Currently running against Solana Devnet. Faucet rate limits are handled gracefully via mock fallbacks.

4.  **ZK Service (`proof-of-play/`)**:
    - Rust Actix Web Server (Port 8080 internal).
    - Uses `sp1-sdk` to execute the `proof-of-play` ELF binary.
    - Verifies: `score == perfects * 100 + greats * 50`.

## Recent Changes (v2.1.0)
- **ZK Integration**: Frontend -> GameServer -> ZK Service flow verified.
- **Economic Loop**: `burnTokens` implemented. Marketplace and "Pay-to-Seed" feature consume BOB.
- **System Dashboard**: New `/system` page visualizing the architecture.
- **Standardization**: Added `AGENTS.md`, `CLAUDE.md`, `VERSION.md`, `CHANGELOG.md`.

## Next Steps (Roadmap)
1.  **On-Chain Governance**: Move `proposals.json` logic to a Solana Program (SPL Governance).
2.  **ZK Proving**: Currently we only *execute* the trace (`client.execute`). Upgrade to *prove* (`client.prove`) once compute resources allow (requires heavy lifting).
3.  **Mobile Light Node**: Explore React Native port for mobile mining.
4.  **Storage Marketplace**: Expand the "Pay-to-Seed" into a full bid/ask market for storage.

## Known Issues / Notes
- **Rate Limits**: Solana Devnet faucet frequently 429s. The Bridge has robust fallback logic to return "mock" signatures so the UI demo doesn't break.
- **Ports**:
    - Frontend: 5173
    - Game Server: 3001 (Host) -> 3000 (Container)
    - Supernode: 8081 (Host) -> 8080 (Container)
    - ZK Service: 8080 (Internal only)
- **Dependencies**: Use `npm install --legacy-peer-deps` in `supertorrent` due to Solana/LightProtocol version mismatches.

## Commands
- **Start Full Stack**: `docker-compose up --build`
- **Verify Frontend**: `python verify_frontend.py`
- **E2E Test**: `node test_e2e.js`
