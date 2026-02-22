# Universal Agent Instructions

> **"Data is the Currency. Seeding is Mining. Play is Work."**

These instructions are the source of truth for all AI models (Claude, Gemini, GPT, etc.) working on the Bobcoin repository.

## 1. Core Principles

*   **No Speculation:** Bobcoin is a "Game Point System" and "Proof of Play" prototype. Avoid all financial terminology related to ICOs, sales, or investment. Focus on "Arcade Economy" and "Fun".
*   **Privacy First:** All "Layer 1" features described in documentation (Ring Signatures, Stealth Addresses) are *goals*. The current implementation uses simulations or mock data where real cryptography is too heavy for the prototype.
*   **Real Implementation:** When possible, implement real logic.
    *   *Storage:* Real `webtorrent` seeding.
    *   *Game:* Real `three.js` rendering and score calculation.
    *   *Backend:* Real `sqlite3` database and API endpoints.
*   **Tech Stack Strictness:**
    *   **Frontend:** React 18 (NOT 19), Vite, `react-router-dom` v6.
    *   **Backend:** Node.js v18+, Express.
    *   **Mobile:** React Native (Expo).

## 2. Directory Structure

*   `/frontend`: Main React Web App (Dashboard, Game, Manual).
*   `/game-server`: Express API + SQLite DB (User data, Market, Governance).
*   `/supertorrent`: WebTorrent Node (Proof of Storage).
*   `/mobile`: React Native Mobile App (Light Node simulation).
*   `/docs`: All project documentation.
*   `/scripts`: Integration tests and utilities.

## 3. Versioning & Changelog

*   **Always** update `CHANGELOG.md` when completing a task.
*   **Always** increment the version number in `VERSION.md` (SemVer: Major.Minor.Patch).
*   Git commit messages should reference the new version (e.g., `v2.1.0: Added feature X`).

## 4. Workflows

### A. Implementing a Feature
1.  **Plan:** Analyze requirements and existing code. Update `TODO.md`.
2.  **Code:** Implement changes. Use existing patterns (e.g., `api.js` for fetch calls).
3.  **Verify:**
    *   Run `node scripts/integration_test.js` for backend.
    *   Run `python verification/verify_frontend.py` for frontend visuals.
4.  **Document:** Update `MANUAL.jsx` if user-facing. Update `CHANGELOG.md`.

### B. Handling "Missing" Features
If the user asks for a feature that is described in `VISION.md` but not code:
1.  Implement a **UI representation** first (Mock/Simulation).
2.  Wire it to a backend endpoint (even if the endpoint just returns static data).
3.  Plan the real implementation in `ROADMAP.md`.

## 5. Known Constraints

*   **WebGL:** `react-three-fiber` v8 is used. Do not upgrade to v9/React 19 without resolving peer dependency conflicts.
*   **Wallet:** The Solana Wallet Adapter requires a polyfill for `Buffer` and `global` in `vite.config.js` and `main.jsx`.
*   **Mobile:** The mobile app points to `localhost:3001`. Use `10.0.2.2` for Android Emulator.

## 6. Handoff Protocol

When finishing a session:
1.  Merge all feature branches to `main`.
2.  Ensure `scripts/integration_test.js` passes.
3.  Write a `HANDOFF.md` summarizing the state for the next model.
