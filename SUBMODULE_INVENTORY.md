# Project Structure & Library Inventory

## Directory Structure
- `/bobcoin-consensus`: JavaScript legacy ledger.
- `/go-lattice`: Go high-performance sovereign ledger.
- `/frontend`: React/Vite UI application.
- `/go-game-server` & `/go-supertorrent`: Go microservices.

## Core Libraries & Submodules
*(Note: This project purposefully avoids `.gitmodules` submodules)*
- **`node-seal`**: FHE computation (Location: `frontend/` & `game-server/`).
- **`simple-peer`**: WebRTC P2P matchmaking (Location: `frontend/package.json`).
- **`SP1`**: RISC-V ZK proof generation (Location: External Rust compiler requirement).
- **`solana/web3.js` & `LightProtocol SDK`**: Data anchoring (Mentioned in `DEPLOY.md` causing `npm install --legacy-peer-deps` requirements).
