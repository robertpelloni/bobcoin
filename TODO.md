# Immediate Action Items & Bug Fixes

## Critical Backend Infrastructure
- [x] **Remove Mock APIs:** Removed `frontend/src/api.js` mocks and reconnected UI components to the actual `localhost:3001` endpoints (Transactions, Minting, Burning, Market, Governance).
- [x] **Update E2E Test:** Refactored `test_e2e.js` to call the real backend endpoints and verified the full application flow.
- [ ] **SP1 ZK Service Robustness:** Current `/submit-proof` endpoint assumes SP1 execution output. Upgrade this to actually call the rust backend verification endpoint when SP1 is running.

## Enhancements & Refactoring
- [x] **Error Handling:** Added a robust global `ErrorBoundary` in the React frontend to catch and gracefully display component crashes.
- [x] **Configuration:** Moved hardcoded ports (`3001`, `8081`, `4000`) into a centralized `.env` configuration file at the workspace root, integrated via `dotenv` across all backend Node.js microservices and Vite environment variables.
- [ ] **Database Migrations:** Formalize SQLite schema migrations in the game-server rather than running them ad-hoc on startup.
- [ ] **Rate Limiting:** Implement proper retry logic and backoff on the frontend for when the Solana Devnet Faucet hits a 429 Error.

## UI/UX Polish
- [x] **Tooltips:** Ensured every button, input, and stat across major pages has a descriptive tooltip.
- [x] **Mobile Responsiveness:** Audited the CSS and injected global media queries to ensure desktop dashboard views collapse gracefully on mobile screens.
- [x] **Version Display:** Injected the global version string dynamically into the footer using Vite defines.