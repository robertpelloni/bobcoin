# Session Handoff - 2026-04-05 (v8.65.0)

## Executive Summary
This pass shifts Bobcoin closer to the Go-first runtime by changing the frontend to prefer the Go supernode for migrated HTTP compatibility endpoints while keeping multiplayer signaling explicitly separated. The practical result is that previously ported Go endpoints are now easier to consume by default without accidentally breaking the still-legacy WebRTC signaling path.

## What This Pass Added

### 1. Split HTTP compatibility routing from signaling routing
**Files:**
- `frontend/src/api.js`
- `frontend/src/components/RhythmGame.jsx`

Changes:
- HTTP compatibility requests now default to `VITE_GAME_HTTP_URL || VITE_SUPERNODE_URL || http://localhost:8000`
- signaling now uses its own base URL: `VITE_GAME_SIGNALING_URL || VITE_GAME_SERVER_URL || http://localhost:3001`
- WebRTC matchmaking no longer depends on the same base constant as mint/burn/bankroll/proof/oracle HTTP calls

This removes a key coupling that was preventing the Go HTTP port from being the natural default.

### 2. Better mixed-runtime observability
**File:**
- `frontend/src/pages/SystemStatus.jsx`

The status page now checks:
- the active HTTP compatibility target (`/status`)
- the signaling WebSocket target separately

This makes mixed Go/Node deployments more understandable while signaling remains unported.

## Validation
Executed successfully:
- `cd frontend && npm run build`

## Strategic State
Bobcoin now has a cleaner separation between:
- Go-first HTTP compatibility traffic
- legacy signaling traffic

That makes future migration work more incremental and less risky.

## Recommended Next Step
1. Continue moving practical service responsibilities into Go
2. Decide whether to port WebRTC signaling into Go or keep it specialized
3. Keep improving frontend bundle splitting around `node-seal`
