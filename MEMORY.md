# AI Memory & Architectural Observations

## Codebase Anomalies & Quirks
- **Missing Entry Points:** In v2.3.0, it was discovered that the root entry scripts for the Express backend (`game-server/server.js`) are absent, likely due to a previous AI execution error, failed git merge, or local desync. The frontend currently relies on a mocked `api.js` to simulate interactions.
- **Port Mapping Confusion:** There is historical confusion in the codebase regarding port 3000 vs 3001 and 8080 vs 8081. The Docker containers run on 3000/8080 internally but are mapped to 3001/8081 on the host to avoid local conflicts. All external fetch calls from the UI must target the `3001`/`8081` host ports.

## Design Preferences & Conventions
- **Strict Completeness:** A feature is not considered "done" unless it is fully represented in the UI, has error handling, and is documented in the Manual. No hidden backend-only features.
- **Robustness over Hacks:** Prefer SQLite/PostgreSQL over raw JSON files for data persistence.
- **Styling:** The project strictly utilizes Vanilla CSS with a "Cyberpunk" aesthetic. Do not introduce TailwindCSS or other utility frameworks unless instructed.
- **Version Control:** The global version is tightly controlled. All AI agents must update `CHANGELOG.md` and reference the version bump in their commit messages.

## Git Submodule Structure
- The `research/forest` and `research/solana` directories exist but are throwing `.gitmodules` mapping errors, indicating they were cloned or moved without proper submodule initialization. They are treated as untracked/modified content by the root git instance.