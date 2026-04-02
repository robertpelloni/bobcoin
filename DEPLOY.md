# Deployment Instructions

## Local Development Environment

### Prerequisites
- Docker & Docker Compose
- Node.js v18+ (for local script execution)
- Python 3+ (for verification scripts)
- Rust (cargo) + SP1 Toolchain (for ZK service)

### Starting the Stack
The preferred method to run the entire architecture locally is via Docker Compose.

```bash
docker-compose up --build -d
```

### Known Port Bindings
- **Frontend (Vite):** `http://localhost:5173`
- **Game Server (Express):** Host `3001` -> Container `3000`
- **Supernode (WebTorrent):** Host `8081` -> Container `8080`
- **ZK Service (Actix):** Internal network only `8080`

### Running End-to-End Tests
Ensure the stack is fully operational, then run the E2E simulation script:
```bash
node test_e2e.js
```
*(Note: If utilizing ES modules, ensure package.json has `"type": "module"` or run with appropriate node flags).*

### UI Verification
To generate screenshots of the frontend state:
```bash
python verify_frontend.py
```
Outputs will be saved in the `verification/` directory.

### Dependency Notes
Due to conflicts between specific Solana web3.js versions and the LightProtocol SDK in the `supertorrent` package, always install dependencies for that module using:
```bash
npm install --legacy-peer-deps
```