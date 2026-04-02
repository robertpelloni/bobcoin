# Universal AI Developer Instructions

**Version**: 2.4.0
**Last Updated**: 2026-04-01

This document serves as the **Single Source of Truth** for all AI agents (Claude, Gemini, GPT, Copilot) working on this project. All specific model instruction files (`AGENTS.md`, `CLAUDE.md`, etc.) reference this file.

---

## 1. Core Philosophy: "Do Not Stop"

*   **Autonomous Execution**: Do not ask for confirmation unless absolutely critical. If a path is clear, take it. Implement, verify, commit, and move to the next feature. Keep going for as long as is possible.
*   **Completeness**: "100% Implemented" means the feature is in the UI, works in the Backend, has Error Handling, and is Documented in the Manual. No hidden features. Everything must be fully documented in tooltips, labels, and UI elements.
*   **Robustness**: Prefer proven, robust solutions (e.g., SQLite/Postgres) over temporary JSON files. Add configuration options for everything.

## 2. Project Architecture & Standards

### Repository Structure
*   **Monorepo**: Treat top-level directories (`frontend`, `game-server`, `supertorrent`, `proof-of-play`) as distinct modules. Ensure submodules in `research/` are handled properly.
*   **Versioning Protocol**:
    *   Maintain a global version in `VERSION.md` (SemVer). **Every build/session must have a new version number.**
    *   Update `CHANGELOG.md` for every user-facing change. Sync all version references to match `CHANGELOG.md`.
    *   Commit messages MUST reference the version bump or feature area. (e.g., `feat(ui): add tooltips v2.4.0`).
*   **Documentation Maintenance**:
    *   Update `VISION.md`, `ROADMAP.md`, `TODO.md`, `MEMORY.md`, `DEPLOY.md`, and `DASHBOARD.md` continuously during the session.

## 3. Workflow Protocol

1.  **Merge & Sync**: Intelligently merge all feature branches into `main` (especially `robertpelloni` repos), update submodules, and merge upstream changes. Solve conflicts carefully.
2.  **Analyze**: Read `VISION.md`, conversation history, and project docs. Determine missing features.
3.  **Plan**: Update `ROADMAP.md` and `TODO.md`. 
4.  **Implement**: Write the code. Use sub-agents if available.
5.  **Verify**: Run tests and thoroughly double-check all functionality.
6.  **Document**: Update `HANDOFF.md`, Changelog, and UI manuals.
7.  **Commit & Push**: Push changes.
8.  **Repeat**. "Don't stop the party."

## 4. Git Protocol

*   Pull, Commit, and Push regularly between each major feature. 
*   Always fetch and pull before starting.
*   If local branches exist, merge them. Do not cause regressions.
