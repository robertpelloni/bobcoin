# AI Agent Instructions (Bobcoin)

> **CRITICAL: THIS MODULE IS PART OF THE OMNI-WORKSPACE.**

ALL AI AGENTS OPERATING IN THIS REPOSITORY MUST READ AND FOLLOW THE UNIVERSAL PROTOCOLS DEFINED AT:
`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`.

## Local Context (Bobcoin)
Refer to the parent monorepo's `DASHBOARD.md` for project-wide structure.
This module handles the economy, governance, and gamified minting layers.

Active Tasks:
- Implement/Verify NFT protocol.
- Verify Atomic Swaps.
- Enhance 3D WebGL Dashboard.
See `docs/UNIVERSAL_INSTRUCTIONS.md` for the master instructions for this project.

## Agent-Specific Notes
- Always check `AGENTS.md` in the root for the latest technical constraints.
- Prioritize "working code" over "perfect theory".

## System Map (v2.1.0)

### Frontend Modules
- **Explorer:** `/frontend/src/pages/Explorer.jsx` - Visualizes block lattice mock data.
- **Trollbox:** `/frontend/src/components/Trollbox.jsx` - Real-time chat (polled) via `/chat`.
- **Quests:** `/frontend/src/components/DailyQuests.jsx` - Daily challenges widget.
- **Rhythm Game:** `/frontend/src/components/RhythmGame.jsx` - WebGL game + Visualizer mode.

### Backend Services
- **Game Server:** Express API on port 3000. Handles `/chat`, `/quests`, `/vote`.
- **Supernode:** WebTorrent client on port 8080. Handles storage proofs.
- **Mobile:** React Native app on local dev port.

### Data Flow
1.  **Frontend** -> **Game Server**: Fetches global stats, posts chat/votes/proofs.
2.  **Mobile** -> **Game Server**: Fetches bankroll/leaderboard stats.
3.  **Supernode** -> **Solana (Mock)**: Submits storage proofs.
