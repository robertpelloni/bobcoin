# Bobcoin Game Server (The Mint)

This service acts as the **Verifier** and **Minter** for Bobcoin.

## Role
1.  Receives Game Score Proofs from clients.
2.  Verifies the proofs (currently via direct checking, effectively the "Host" logic for the ZK Circuit).
3.  Interacts with the `BobcoinBridge` (from `supertorrent` package) to mint tokens on Solana.

## API
- `POST /submit-proof`: Accepts proof data and mints tokens if valid.
