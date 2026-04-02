# Bobcoin Deployment Guide

This guide details how to run the full stack of the Bobcoin ecosystem, including the Frontend, Game Server, Supernode, and Mobile Simulation.

## Prerequisites

-   Docker & Docker Compose
-   Node.js v18+ (for local development)
-   Python 3.10+ (for verification scripts)
-   Playwright (`pip install playwright` && `playwright install`)

## Quick Start (Docker)

The easiest way to run the entire system is via Docker Compose.

```bash
# Build and start all services
docker-compose up --build
```

### Services Overview

| Service | Internal Port | External Port | Description |
| :--- | :--- | :--- | :--- |
| **Frontend** | 5173 | 5174 | React + Vite Dashboard & Rhythm Game |
| **Game Server** | 3000 | 3001 | Express API + SQLite Database |
| **Supernode** | 8080 | 8081 | WebTorrent Storage Node API |
| **ZK Service** | 8080 | 8080 | SP1 / Rust Proof Verification (Mock in dev) |

### Access Points

-   **Dashboard:** [http://localhost:5174](http://localhost:5174) (or 5173 if running locally)
-   **API:** [http://localhost:3001](http://localhost:3001)
-   **Supernode Status:** [http://localhost:8081/stats](http://localhost:8081/stats)

---

## Local Development

If you want to run services individually without Docker:

### 1. Game Server (Backend)

```bash
cd game-server
npm install
node server.js
# Runs on localhost:3000
```

### 2. Supernode (Storage)

```bash
cd supertorrent/supernode
npm install
node index.js
# Runs on localhost:8080
```

### 3. Frontend (UI)

```bash
cd frontend
npm install
npm run dev
# Runs on localhost:5173
```

### 4. Mobile Simulation

To run the React Native mobile app:

```bash
cd mobile
npm install
npx expo start
# Follow instructions to open in Android Emulator or Expo Go
```

---

## Verification

To verify the deployment is working correctly, use the provided integration tests.

### Backend API Test
```bash
node scripts/integration_test.js
```

### Frontend Visual Verification
```bash
python verification/verify_frontend.py
python verification/verify_system.py
```

## Troubleshooting

-   **WebGL Errors:** The Rhythm Game uses `react-three-fiber`. Ensure your browser supports WebGL 2.0. If using Docker inside a VM, hardware acceleration might be disabled.
-   **Port Conflicts:** Ensure ports 3000, 3001, 8080, 8081, 5173 are free.
-   **Wallet Connection:** The frontend uses `@solana/wallet-adapter`. You need a Solana wallet extension (Phantom, Solflare) installed in your browser.
