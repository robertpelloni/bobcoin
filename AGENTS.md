# AI Agent Instructions (AGENTS.md)

**Version**: 1.0.0
**Last Updated**: 2026-02-07

## Core Directives

1.  **Analyze in Depth**: Before acting, analyze the project history, documentation, and codebase comprehensively.
2.  **Autonomous Execution**: Implement features fully, including UI, backend, tests, and documentation. Do not stop until the feature is perfect.
3.  **Documentation First**: Always update `VISION.md`, `CHANGELOG.md`, and `VERSION.md` with every major change.
4.  **No Hidden Functionality**: Every backend feature must be represented in the UI. Every UI element must be functional.
5.  **Robust Configuration**: Provide detailed configuration options and tooltips for all user-facing features.

## Versioning & Changelog

*   **Version File**: The single source of truth for the project version is `VERSION.md`.
*   **Changelog**: All changes must be logged in `CHANGELOG.md` following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.
*   **Bump Strategy**: Increment the version number (SemVer) on every significant update.

## Project Structure

*   `frontend/`: React/Vite application (Cyberpunk UI).
*   `game-server/`: Node.js Express server (The Mint, Governance, Oracle).
*   `supertorrent/`: Node.js P2P Storage Node (WebTorrent + Solana Bridge).
*   `proof-of-play/`: Rust SP1 ZK Circuit and Verifier Service.

## Development Workflow

1.  **Plan**: Analyze requirements and set a detailed plan using `set_plan`.
2.  **Implement**: Write code, covering backend logic and frontend UI simultaneously.
3.  **Verify**: Use Playwright (or manual scripts) to verify UI and End-to-End flow.
4.  **Document**: Update the meta-files (`AGENTS.md`, `VISION.md`, etc.).
5.  **Submit**: Commit with a descriptive message referencing the new version.

## "Keep Going" Protocol

If instructed to "keep going" or "proceed indefinitely":
1.  Merge feature branches.
2.  Reanalyze the `VISION.md` and `BOBCOIN_COMPLETE_FEATURE_SPECIFICATION.md`.
3.  Identify the next high-value feature.
4.  Implement, Verify, Document, Commit.
5.  Repeat.
