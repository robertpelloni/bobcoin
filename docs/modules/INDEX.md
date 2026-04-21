# Bobcoin Project Submodules & Architecture Index

This index tracks all critical submodules, packages, and their respective roles within the Bobcoin ecosystem, mapping them to the system architecture diagram.

## Root Directory Structure

```plaintext
/app
├── /docs                 # Universal Instructions, Manuals, and Deployment Guides
├── /frontend             # React 18 / Vite SPA (User Dashboard & 3D Game)
├── /game-server          # Node.js / Express API (Market, Gov, Quests, SQLite)
├── /mobile               # React Native / Expo App (Light Node Simulator)
├── /proof-of-play        # Rust / SP1 zkVM Workspace (ZK Verification Service)
├── /scripts              # Node.js Integration & E2E Testing Scripts
├── /supertorrent         # Node.js / WebTorrent Service (Storage Node & Solana Bridge)
└── /verification         # Python / Playwright Scripts & Visual Screenshots
```

---

## 1. Frontend (UI & Game Client)
**Path:** `/frontend`
**Version:** `2.1.0` (Sync with Global VERSION.md)
**Role:** The primary user interface. Handles wallet connection, 3D Rhythm Game rendering, and status visualization.

*Key Dependencies:*
*   `react` (`^18.2.0`): Pinned to 18 to avoid WebGL peer dependency crashes.
*   `@react-three/fiber` (`^8.16.8`) & `@react-three/drei` (`^9.105.0`): The 3D engine for the Rhythm Game.
*   `@solana/wallet-adapter-*`: Handles Web3 wallet connections (requires `buffer` polyfill).
*   `react-router-dom` (`^6.22.3`): Client-side routing.

---

## 2. Game Server (API & Database)
**Path:** `/game-server`
**Version:** `2.1.0`
**Role:** The central nervous system for the prototype. Hosts the SQLite database for Market Bids, Governance Proposals, Quests, and Trollbox Chat. It also routes Proof of Play submissions to the ZK Service and the Blockchain Bridge.

*Key Dependencies:*
*   `express` (`^4.18.2`): HTTP API Server.
*   `sqlite3` (`^5.1.7`): Persistent storage for the prototype (pre-smart contract phase).
*   `cors` (`^2.8.5`): Enables frontend communication.

---

## 3. Supertorrent (Storage Node & Bridge)
**Path:** `/supertorrent`
**Version:** `1.2.0`
**Role:** Implements the "Proof of Useful Stake" mechanism. Runs a WebTorrent client to download/seed files. Also contains `BobcoinBridge.js`, which interfaces with the Solana Devnet to mint tokens and record metadata on-chain via SPL-Memo.

*Key Dependencies:*
*   `webtorrent` (`^2.8.5`): P2P file sharing engine.
*   `@solana/web3.js` (`1.87.6`): Blockchain interaction (Wallet, Transactions).
*   `merkletreejs` & `keccak256`: Generates cryptographic proofs of stored data.

---

## 4. Mobile Light Node (Simulator)
**Path:** `/mobile`
**Version:** `1.1.0`
**Role:** A React Native application demonstrating how a mobile device interacts with the ecosystem (fetching stats, simulating mining via hashrate).

*Key Dependencies:*
*   `expo` (`~50.0.0`): React Native framework.
*   `react-native` (`0.73.0`).

---

## 5. ZK Verification Service (Proof of Play)
**Path:** `/proof-of-play`
**Version:** `0.1.0`
**Role:** An SP1 (Succinct Labs) Rust workspace that compiles game logic into a RISC-V ELF binary. It exposes an Actix-Web HTTP server that executes the binary to validate incoming score claims before they are minted on-chain.

*Key Dependencies (Rust):*
*   `sp1-sdk` (`1.0.0`): The zkVM SDK for generating/verifying execution traces.
*   `actix-web` (`4`): The HTTP server framework.
*   `serde`: For JSON deserialization of game stats.

---

## Tooling & Verification

*   **Integration Tests:** `/scripts/integration_test.js` ping all backend endpoints to ensure database and ZK service connectivity.
*   **Visual Tests:** `/verification/verify_frontend.py` uses `playwright.sync_api` to automatically navigate the React app, bypass the wallet screen, and capture screenshots of the Dashboard, Supernode, and Manual pages to ensure no UI regressions occur.
