# Bobcoin Zero-Knowledge Verification Service

This module utilizes the **SP1 zkVM** (RISC-V) to verify "Proof of Play" game scores off-chain.

## Architecture

-   **`program/`**: Contains the Rust code that is compiled into a RISC-V ELF binary. This program takes game inputs (perfects, greats, misses) and calculates the final score, committing it to the public output.
-   **`script/`**: Contains an Actix-Web server that acts as the Verifier node. It receives proof submissions from the `game-server`, decodes them, and uses the SP1 SDK to verify that the public outputs match the submitted score.

## Current Status (Phase 3)

The service is currently running in **"Server-Side Proving / Execution"** mode.
Instead of verifying a cryptographic SNARK sent from the browser (which is computationally heavy for a web client prototype), the `script` server receives the raw game inputs, executes the ELF binary using the `sp1_sdk` to ensure the logic holds, and verifies the resulting committed score against the requested reward.

## Running the Service

The service is automatically built and run via Docker Compose (`zk-service`).

If running locally:
```bash
# 1. Build the RISC-V ELF Program
cd program
cargo prove build --output-directory elf

# 2. Run the Verification Server
cd ../script
cargo run --release
```
