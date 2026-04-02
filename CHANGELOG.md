# Bobcoin Changelog

## [2.3.0] - 2026-02-12 (Phase 4 Catalyst)
### Added
- **Real-Time Trollbox:** Upgraded the global chat from HTTP polling to WebSockets using `socket.io`. Messages now broadcast instantly.
- **Mobile Proof-of-Work:** Replaced the fake `setTimeout` hashrate simulator in the React Native app with a genuine CPU-bound SHA-256 loop that searches for valid hash prefixes (difficulty scaling mock).
- **Mobile UI Expansion:** Upgraded the mobile app with Tab Navigation (Mining, Quests, Wallet) and wired them to the Game Server APIs.
- **Client-Side ZK Strategy:** Documented the migration plan for compiling the SP1 Rust Prover to WebAssembly (Wasm) in `docs/ZK_CLIENT_MIGRATION.md`.
- **Git Hygiene:** Updated `.gitignore` to properly exclude node_modules, build artifacts, and local SQLite DBs from commits.

## [2.2.0] - 2026-02-12
### Added
- **Project Overhaul & Assessment:** Deep analysis of the current state of all submodules (`frontend/`, `game-server/`, `supertorrent/`, `mobile/`, `proof-of-play/`).
- **IDEAS.md:** Generated innovative concepts for project pivots (e.g., BaaS, WebRTC Chat, Shake-to-Mine) and structural refactoring (Turborepo, TypeScript).
- **TODO.md Rewrite:** Comprehensively categorized all missing, partially mocked, and unimplemented features to guide future AI agents.

## [2.1.0] - 2026-02-12
### Added
- **Universal Documentation:** Created `docs/UNIVERSAL_INSTRUCTIONS.md` as the single source of truth for all AI agents.
- **System Dashboard:** `Architecture.jsx` page.
- **Community Features:** Trollbox, News Ticker, UI Sounds.
- **Easter Eggs:** Konami Code "God Mode", Leaderboard Badges.

## [2.0.0] - 2026-02-11
### Added
- **WebGL Rhythm Game:** Complete rewrite using `react-three-fiber` with 3D note highway, particle effects, and neon grid.
- **Supernode UI:** Real-time dashboard for managing `webtorrent` seeds and viewing peer stats.
- **Governance:** Voting UI backed by `sqlite3` database.
- **Manual:** Comprehensive in-app documentation.
- **System Status:** Real-time visualizer for TPS and Block Lattice.
- **Mobile App:** React Native shell with simulated mining graph.

### Fixed
- **React 19 Conflicts:** Downgraded frontend dependencies to React 18 to fix WebGL crashes.
- **Wallet Adapter:** Added Polyfills for `Buffer` to fix Solana wallet connection.

## [1.0.0] - Initial Prototype
- Basic Express Server.
- CLI-based Supernode.
- 2D DOM-based Rhythm Game.
