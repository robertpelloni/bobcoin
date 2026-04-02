# Immediate Action Items & Bug Fixes

## Critical Backend Infrastructure
- [ ] **Remove Mock APIs:** Now that backend servers are restored, the highest priority is to remove `frontend/src/api.js` mocks and reconnect UI components (`Governance.jsx`, `Wallet.jsx`, `Mobile.jsx`, `StorageMarket.jsx`) to the actual `localhost:3001` endpoints.
- [ ] **Update E2E Test:** Refactor `test_e2e.js` to call the real backend endpoints and verify the full, un-mocked application flow.

## Enhancements & Refactoring
- [ ] **Error Handling:** Add robust global error boundaries in the React frontend.
- [ ] **Configuration:** Move hardcoded ports (`3000`, `3001`, `8080`, `8081`) into centralized `.env` or configuration files.
- [ ] **Database Migrations:** Formalize SQLite schema migrations in the game-server rather than running them ad-hoc on startup.
- [ ] **Rate Limiting:** Implement proper retry logic and backoff on the frontend for when the Solana Devnet Faucet hits a 429 Error.

## UI/UX Polish
- [ ] **Tooltips:** Ensure every button, input, and stat across all pages has a descriptive tooltip as mandated by project instructions.
- [ ] **Mobile Responsiveness:** Audit the Cyberpunk CSS framework to ensure all desktop dashboard views collapse gracefully on mobile screens.
- [ ] **Version Display:** Inject the global version string dynamically into the footer or header of the UI layout.