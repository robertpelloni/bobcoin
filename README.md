# Bobcoin Project

A hybrid Proof-of-Useful-Stake (PoUS) blockchain system featuring:
- **Supertorrent Node**: Decentralized storage network (using WebTorrent) where storage = validator power.
- **Bobcoin Bridge**: Solana integration for Proof submission and Rewards (using Memo Program).
- **Game Server**: "The Mint" - verifies gameplay proofs and triggers on-chain rewards.
- **Game Frontend**: Cyberpunk-themed rhythm game UI.

## "Real Network" Features (Phase 8 Completed)
This project runs entirely in Docker to simulate a real network node environment (Linux).
- **Consensus**: Nodes must download and seed real files (Sintel) to generate Merkle Proofs.
- **Blockchain**: All proofs and rewards are transactions on **Solana Devnet**.
- **Keys**: Nodes generate real Solana keypairs (stored in memory for this demo).

## Architecture

```mermaid
graph TD
    User[Player] -->|Plays Game| Frontend[React App]
    Frontend -->|Submits Score Proof| GameServer[Game Server]
    GameServer -->|Verifies Proof| GameServer
    GameServer -->|Mints Rewards (Memo Tx)| Solana[Solana Devnet]
    
    Supernode[Supertorrent Node] -->|Downloads Files| P2P[WebTorrent Network]
    Supernode -->|Generates Storage Proof| Supernode
    Supernode -->|Submits Proof (Memo Tx)| Solana
```

## Running the Project

### Prerequisites
- Docker & Docker Compose

### Quick Start
1. **Start the Stack**:
   ```bash
   docker-compose up --build
   ```
   *Note: The first build may take a few minutes to install dependencies.*

2. **Access Services**:
   - **Frontend**: [http://localhost:5173](http://localhost:5173)
   - **Game Server**: [http://localhost:3000](http://localhost:3000) (API)
   - **Supernode**: [http://localhost:8080](http://localhost:8080) (Status)

3. **Verify Operation**:
   - Check Logs: `docker-compose logs -f game-server` or `supernode`.
   - **Supernode**: Look for "Proof submitted successfully" every 30s.
   - **Game**: Play the game, mint tokens, and verify the "TX:" link on Solana Explorer.

## Troubleshooting
- **429 Too Many Requests**: Solana Devnet rate limits are strict. If a transaction fails, the system logs the error and retries/continues. This is normal behavior for a free Devnet faucet.
- **Bridge Ready (Mock)**: If you see "MockPublicKey", ensure you rebuilt the container (`docker-compose up --build`) to pick up the `rpc-websockets` fix.
