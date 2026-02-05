#!/bin/bash

# Ensure we are in the project root
cd "$(dirname "$0")/.."

echo "[ZK] Building Circuit..."
# runs in /app inside container, which is bobcoin/proof-of-play
# We need to build the program member
docker-compose run --rm zk-circuit-builder bash -c "
    echo 'Building Program...' &&
    cd program &&
    cargo prove build --output-directory elf && 
    echo 'Program Built.' &&
    ls -l elf &&
    echo 'Running Generator Script...' &&
    cd ../script &&
    cargo run --release
"

echo "[ZK] Done."
