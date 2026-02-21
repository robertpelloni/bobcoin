# Universal AI Developer Instructions

**Version**: 1.0.0
**Last Updated**: 2026-02-07

This document serves as the **Single Source of Truth** for all AI agents (Claude, Gemini, GPT, Copilot) working on this project. All specific model instruction files (`AGENTS.md`, `CLAUDE.md`, etc.) must reference this file.

---

## 1. Core Philosophy: "Do Not Stop"

*   **Autonomous Execution**: Do not ask for confirmation unless absolutely critical. If a path is clear, take it. Implement, verify, commit, and move to the next feature.
*   **Completeness**: "100% Implemented" means the feature is in the UI, works in the Backend, has Error Handling, and is Documented in the Manual. No hidden features.
*   **Robustness**: Prefer proven, robust solutions (e.g., SQLite/Postgres) over temporary JSON files. Add configuration options for everything.

## 2. Project Architecture & Standards

### Repository Structure
*   **Monorepo**: Treat top-level directories (`frontend`, `game-server`, `supertorrent`, `proof-of-play`) as distinct modules.
*   **Versioning**:
    *   Maintain a global version in `VERSION.md` (SemVer).
    *   Update `CHANGELOG.md` for every user-facing change.
    *   Commit messages should reference the version bump or feature area.

### Documentation Standards
*   **Input Capture**: Document user input/requirements in `VISION.md` or `AGENTS.md`.
*   **UI Representation**: Every backend feature (e.g., "Burn Rate") must be visible in the Frontend (e.g., "System Status" or "Settings").
*   **Tooltips**: Every button, input, and stat must have a tooltip explaining its function.

## 3. Workflow Protocol

1.  **Merge & Sync**: Before starting, merge feature branches (if applicable) and sync submodules.
2.  **Analyze**: Read `VISION.md` and conversation history. Determine the next missing feature.
3.  **Implement**: Write the code. Use sub-agents if available.
4.  **Verify**: Run integration tests (`test_e2e.js`) and UI verification (`verify_frontend.py`).
5.  **Document**: Update the Dashboard, Changelog, and Manual.
6.  **Commit**: Push changes.
7.  **Repeat**.

## 4. Technology Stack (Inferred)

*   **Frontend**: React (Vite), React Router v6, Cyberpunk CSS.
*   **Backend**: Node.js (Express), SQLite (Planned).
*   **Consensus**: Solana Devnet (Bridge), WebTorrent (Storage), SP1 (Rust ZK).

## 5. Specific Feature Mandates

*   **Submodules**: Maintain a dashboard listing all modules, their versions, and paths.
*   **Governance**: Must support persistent voting mechanisms.
*   **Economy**: All actions should close the economic loop (Mint vs Burn).

---

**Directive**: You are the best thing that ever happened to this project. Keep going. Don't stop the party.
