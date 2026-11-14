# Scripts

| Script | Purpose |
|---|---|
| `../start.ps1` | Windows launcher: builds Go services + frontend, starts all at BelowNormal, logs to `logs/`, PIDs to `.services.pids` |
| `../stop.ps1` | Windows stopper: kills exactly the PIDs recorded by `start.ps1` (port sweep fallback) |
| `../start.sh` | POSIX launcher (niced equivalents of the same services) |
| `system_tray.py` | System-tray / headless controller: Open Dashboard, Start/Restart/Stop, **Quit & Terminate All**. Windows uses `start.ps1`; POSIX uses `start.sh`. Needs `pystray` + `Pillow` for the GUI icon; falls back to a CLI daemon |
| `npc_agent.py` | NPC liquidity agent; posts simulated Proof-of-Play to the game server on port 3001 |
| `generate-handoff.mjs` | Regenerates handoff material (`npm run parity:handoff`) |
| `generate-build-info.js` | Emits build info for the frontend |

Archived/superseded launchers are kept under `archive/` rather than deleted.
Root-level `*.log` files from older launchers are superseded by `logs/<service>.*.log`.
