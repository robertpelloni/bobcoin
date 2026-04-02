# Immediate Action Items & Bug Fixes

## Critical Backend Infrastructure
- [x] **Restore `game-server/server.js`:** The primary Express entry point for the game server is missing from the repository. Needs to be recreated to handle `/submit-proof`, `/burn`, and mount the `market.js` router.
- [x] **Restore `supertorrent/server.js` (or entry point):** Verify and restore the Express server for the Supernode that handles `/stats`, `/add-torrent`, and `/remove-torrent`.
- [ ] **Remove Mock APIs:** Once backend servers are restored, remove `frontend/src/api.js` mocks and reconnect UI components (`Mobile.jsx`, `StorageMarket.jsx`) to actual endpoints.

## Enhancements & Refactoring
- [ ] **Error Handling:** Add robust global error boundaries in the React frontend.
- [ ] **Configuration:** Move hardcoded ports (`3000`, `3001`, `8080`, `8081`) into centralized `.env` or configuration files.
- [ ] **Database Migrations:** Formalize SQLite schema migrations in the game-server rather than running them ad-hoc on startup.
- [ ] **Rate Limiting:** Implement proper retry logic and backoff on the frontend for when the Solana Devnet Faucet hits a 429 Error.

## UI/UX Polish
- [ ] **Tooltips:** Ensure every button, input, and stat across all pages has a descriptive tooltip as mandated by project instructions.
- [ ] **Mobile Responsiveness:** Audit the Cyberpunk CSS framework to ensure all desktop dashboard views collapse gracefully on mobile screens.
- [ ] **Version Display:** Inject the global version string dynamically into the footer or header of the UI layout.