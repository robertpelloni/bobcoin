# Agent Instructions (AGENTS.md)

This file contains instructions for future agents working on the Bobcoin repository.

## Project Overview

Bobcoin is a Proof-of-Useful-Stake (PoUS) blockchain system combining storage mining (Supernode), gameplay verification (Proof of Play), and a Block Lattice architecture.

### Tech Stack

-   **Frontend:** React 18, Vite, Tailwind CSS, `react-three-fiber` (v8), `react-router-dom` (v6).
-   **Game Server:** Node.js (Express), SQLite (`sqlite3`), `better-sqlite3` (optional).
-   **Supernode:** Node.js, `webtorrent`, `express`.
-   **Mobile:** React Native (Expo).
-   **Documentation:** Markdown in `docs/` folder.

### Key Directories

-   `frontend/`: The main React application (Dashboard, Game, Manual).
-   `game-server/`: The API server handling user data, governance, and market logic.
-   `supertorrent/`: The decentralized storage node implementation.
-   `mobile/`: The React Native mobile light node simulation.
-   `docs/`: Project documentation and guides.
-   `scripts/`: Integration and verification scripts.

### Development Guidelines

1.  **React Versioning:** The frontend explicitly uses **React 18** to maintain compatibility with `react-three-fiber` v8. Do not upgrade to React 19 without verifying 3D library support.
2.  **Polyfills:** The frontend requires `vite-plugin-node-polyfills` and a manual `window.Buffer` polyfill in `main.jsx` for Solana wallet adapter support.
3.  **Database:** The `game-server` uses a local `database.sqlite` file. Ensure schemas are migrated correctly in `database.js`.
4.  **Verification:** Always run `node scripts/integration_test.js` after backend changes and `python verification/verify_frontend.py` after frontend changes.

### Known Issues & Workarounds

-   **WebGL in Docker/CI:** Visual verification scripts may fail or show black screens if GPU acceleration is unavailable. Use screenshots for manual review.
-   **Wallet Adapter:** The Solana Wallet Adapter requires HTTPS or localhost context.
-   **Mobile API:** The mobile app points to `localhost:3001`. Use `10.0.2.2` for Android Emulator or tunnel (ngrok) for physical devices.

### Feature Flags

-   **Mock Data:** The frontend falls back to mock data if API calls fail (e.g., `Supernode.jsx`).
-   **Theme:** Light/Dark mode preference is stored in `localStorage`.

### Future Roadmap

-   **Phase 14:** Implement ZK-Proof verification service using SP1 (Rust).
-   **Phase 15:** Migrate `game-server` logic to on-chain smart contracts (Fuel VM or Solana Program).
