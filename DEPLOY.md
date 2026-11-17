# Deployment Instructions

## Local Development Environment

### Prerequisites
- Node.js v18+ (for frontend and legacy consensus execution)
- Go 1.21+ (for core services)
- Python 3+ (for Playwright verification scripts)
- Rust (cargo) + SP1 Toolchain (for ZK service)

### Starting the Stack
#### Windows (Recommended on Windows)
```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1   # builds, then starts all at BelowNormal; logs in logs\; PIDs in .services.pids
.\stop.ps1                                             # stops exactly the recorded PIDs
python scripts\system_tray.py                          # tray icon: Open Dashboard / Start / Restart / Stop / Quit & Terminate All
```
Heavyweight processes are started at **BelowNormal** priority by both launchers (niced on POSIX).

#### POSIX
```bash
./start.sh
```

### Known Port Bindings
- **Frontend (Vite preview):** `http://localhost:4173`
- **Go Lattice Node:** `http://localhost:4001`
- **Go Game Server:** `http://localhost:3001`
- **Go Supertorrent:** `http://localhost:8000`
- **SP1 Verifier Daemon (WSL):** `127.0.0.1:9823` (raw TCP, byte protocol)
- **SP1 Prover Sidecar (WSL):** `http://localhost:9824` (`GET /health`, `POST /prove`)

### SP1 Services (Windows/WSL)
SP1 has no Windows-native `cargo-prove` (linux/darwin binaries only), so proving and verification run in WSL2 Ubuntu:
```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1 -WithSp1Daemon   # stack + verifier daemon
powershell -ExecutionPolicy Bypass -File scripts\start-sp1-prover.ps1 # prover sidecar (optional)
.\stop.ps1                                                            # stops stack, daemon, and sidecar
```
First-time SP1 setup inside WSL: `wsl -d Ubuntu -- bash scripts/wsl-sp1-setup.sh`, then `scripts/wsl-sp1-prover.sh` / `scripts/wsl-sp1-verifier-native.sh` to build. Both SP1 services take ~2 minutes after launch before they answer (proving-key setup) — the dashboard's System Status SP1 cards and the mint-area prover indicator reflect this honestly. Proof artifacts persist in WSL at `~/sp1-proofs/` (never `/tmp`, which WSL wipes on restart).

### Running End-to-End Tests
Ensure the stack is fully operational, then run the E2E parity simulation script to verify Go and Node.js backend consensus:
```bash
node test_e2e_governance.cjs
```
*(Note: These scripts spin up isolated test instances and verify network state agreement).*

### UI Verification
To generate screenshots of the frontend state, use Playwright:
```bash
python3 verify_frontend.py
```

### Standalone Go Services
- `go-lattice`: The core sovereign Block Lattice consensus engine.
- `go-game-server`: Native game oracle handling Proof-of-Play, FHE processing, and real-time multiplayer via signaling.
- `go-supertorrent`: The decentralized WebTorrent anchor seeder and validator.
- `go-casino`: Standalone high-performance casino logic daemon.
