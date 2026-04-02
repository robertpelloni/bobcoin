# Session Handoff - 2026-04-01

## Overview
This session focused on continuing "Phase III: Sovereign Network" features for Bobcoin.
We have successfully implemented the Mobile Light Node functional simulation in the frontend, updating the placeholder to feature Proof of Walk (step counter) and Background Storage Mining.

## Architecture State

1.  **Frontend (`frontend/`)**:
    - React + Vite + React Router v6.
    - Cyberpunk Theme.
    - Pages: Dashboard (Rhythm Game), Supernode (Storage), Wallet (Privacy), Governance (DAO), Manual (Docs), System (Status), **Mobile (Light Node Simulator)**.
    - **Key Config**: `vite.config.js` reads version from `VERSION.md`.
    - **Mock API**: Added `api.js` to simulate `mintTokens` and `burnTokens` while backend is being reconstructed.

2.  **Game Server (`game-server/`)**:
    - Node.js Express (Port 3000 -> 3001).
    - Acts as Orchestrator/Oracle.
    - **Governance**: Persists proposals to SQLite (`database.sqlite`).
    - **ZK**: Proxies verification requests to `zk-service`.
    - **Market**: Manages active bids for storage marketplace (`market.js`).

3.  **Supernode (`supertorrent/`)**:
    - Node.js Express (Port 8080 -> 8081).
    - **Storage**: WebTorrent client. Persists magnet links to `torrents.json`.
    - **Bridge**: `BobcoinBridge` class handles Solana interactions (Mint/Burn/Memo).
    - **Note**: Currently running against Solana Devnet. Faucet rate limits are handled gracefully via mock fallbacks.

4.  **ZK Service (`proof-of-play/`)**:
    - Rust Actix Web Server (Port 8080 internal).
    - Uses `sp1-sdk` to execute the `proof-of-play` ELF binary.
    - Verifies: `score == perfects * 100 + greats * 50`.

## Recent Changes (v2.3.0)
- **Mobile Light Node**: Replaced placeholder UI with functional simulated UI for step-counting (Proof of Walk) and background storage mining.
- **Frontend API Mock**: Added missing `api.js` wrapper to support UI development until the full express backend is re-synced.

## Next Steps (Roadmap)
1.  **On-Chain Governance**: Move `proposals.json`/SQLite logic to a Solana Program (SPL Governance).
2.  **ZK Proving**: Currently we only *execute* the trace (`client.execute`). Upgrade to *prove* (`client.prove`) once compute resources allow (requires heavy lifting).
3.  **Mobile Light Node**: Port the React simulation to an actual React Native application for physical device mining.
4.  **Storage Marketplace**: Expand the "Pay-to-Seed" into a full bid/ask market for storage, bridging the new `StorageMarket.jsx` with the Supernode accept logic.

## Known Issues / Notes
- **Missing Backend Services**: The root directory is currently missing the main Express entry points (`server.js`) for the game-server and supertorrent due to what appears to be a repository desync or an incomplete AI commit in a previous session. A mock API is filling the gap.
- **Rate Limits**: Solana Devnet faucet frequently 429s. The Bridge has robust fallback logic to return "mock" signatures so the UI demo doesn't break.
- **Dependencies**: Use `npm install --legacy-peer-deps` in `supertorrent` due to Solana/LightProtocol version mismatches.

## Commands
- **Start Full Stack**: `docker-compose up --build`
- **Verify Frontend**: `python verify_frontend.py`
- **E2E Test**: `node test_e2e.js`
