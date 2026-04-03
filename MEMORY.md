# AI Memory & Architectural Observations

## Codebase Anomalies & Quirks
- **Restored Entry Points:** In v2.6.1, `game-server/server.js` and `database.js` have been fully restored and hardened to handle live frontend UI interactions, replacing the mock JSON/frontend API.
- **Port Mapping Clarification:** `game-server` now defaults to `3001` out-of-the-box in `server.js` (`process.env.PORT || 3001`) to match the Docker host mapping and simplify local development. `frontend` directly targets `http://localhost:3001`.

## Design Preferences & Conventions
- **Strict Completeness:** A feature is not considered "done" unless it is fully represented in the UI, has error handling, and is documented in the Manual. No hidden backend-only features.
- **Robustness over Hacks:** Prefer SQLite/PostgreSQL over raw JSON files for data persistence.
- **Styling:** The project strictly utilizes Vanilla CSS with a "Cyberpunk" aesthetic. Do not introduce TailwindCSS or other utility frameworks unless instructed.
- **Version Control:** The global version is tightly controlled. All AI agents must update `CHANGELOG.md` and reference the version bump in their commit messages.

## Git Submodule Structure
- The `research/forest` and `research/solana` directories exist but are throwing `.gitmodules` mapping errors, indicating they were cloned or moved without proper submodule initialization. They are treated as untracked/modified content by the root git instance.