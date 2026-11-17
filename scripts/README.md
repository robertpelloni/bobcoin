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

## SP1 (WSL) scripts

| Script | Purpose |
|---|---|
| `wsl-sp1-setup.sh` | One-time SP1 toolchain install in WSL2 Ubuntu (no win32 `cargo-prove` exists) |
| `wsl-sp1-build.sh` / `wsl-sp1-migrate-build.sh` | Build the proof-of-play zkVM ELF (SP1 v6) |
| `wsl-sp1-verifier.sh` / `wsl-sp1-verifier-native.sh` / `wsl-sp1-verifier-check.sh` / `wsl-sp1-verifier-test.sh` | Build/check/test the host verifier (build in WSL-native fs — `/mnt/c` is ~200x slower for SP1) |
| `wsl-sp1-prover.sh` / `wsl-sp1-prover-check.sh` / `wsl-sp1-reprove.sh` / `wsl-sp1-reprove-compressed.sh` / `wsl-sp1-groth16.sh` | Build the prover; regenerate core/compressed proofs into `~/sp1-proofs/`; Groth16 evaluation (blocked, see CHANGELOG v8.117.12) |
| `wsl-sp1-daemon.sh` | In-WSL daemon manager (the Windows held-session launchers below are preferred) |
| `wsl-wasm-rebuild.sh` / `wsl-wasm-check.sh` / `wsl-daemon-timing.sh` | Rebuild the frontend WASM commitment artifact; verify daemon protocol timing |
| `start-sp1-daemon.ps1` / `stop-sp1-daemon.ps1` | Held WSL sessions for the verifier daemon (9823) — WSL kills unheld distros |
| `start-sp1-prover.ps1` / `stop-sp1-prover.ps1` | Held WSL session for the prover sidecar (9824) |

Archived/superseded launchers are kept under `archive/` rather than deleted.
Root-level `*.log` files from older launchers are superseded by `logs/<service>.*.log`.
