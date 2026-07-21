# Deployment Instructions

## Local Development Environment

### Prerequisites
- Node.js v18+ (for frontend and legacy consensus execution)
- Go 1.21+ (for core services)
- Python 3+ (for Playwright verification scripts)
- Rust (cargo) + SP1 Toolchain (for ZK service)

### Starting the Stack
The unified method to run the entire architecture locally during active development is via the `start.sh` script which launches all Go services and the Vite frontend concurrently.

#### Using Native Shell (Recommended)
```bash
./start.sh
```

### Known Port Bindings
- **Frontend (Vite preview):** `http://localhost:4173`
- **Go Lattice Node:** `http://localhost:4001`
- **Go Game Server:** `http://localhost:3001`
- **Go Supertorrent:** `http://localhost:8000`

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
