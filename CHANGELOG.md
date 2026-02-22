# Bobcoin Changelog

## [2.1.0] - 2025-02-12
### Added
- **Universal Documentation:** Created `docs/UNIVERSAL_INSTRUCTIONS.md` as the single source of truth for all AI agents.
- **Documentation Overhaul:** Updated `AGENTS.md`, `CLAUDE.md`, `GPT.md`, etc., to reference the universal file.
- **System Dashboard:** (Planned) New `Architecture.jsx` page.
- **Community Features:** Trollbox, News Ticker, UI Sounds.
- **Easter Eggs:** Konami Code "God Mode", Leaderboard Badges.

## [2.0.0] - 2025-02-11
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
