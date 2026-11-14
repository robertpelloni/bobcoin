#!/usr/bin/env bash
# scripts/wsl-sp1-build.sh — build the proof-of-play SP1 ELF inside WSL2.
# Run scripts/wsl-sp1-setup.sh first. Usage:
#   wsl -d Ubuntu -- bash scripts/wsl-sp1-build.sh
set -e
export PATH="$HOME/.sp1/bin:$HOME/.cargo/bin:$PATH"
cd "$(dirname "$0")/../proof-of-play/program"
echo "[sp1-build] cargo prove build (niced)..."
nice -n 10 cargo prove build 2>&1 | tail -15
echo "[sp1-build] ELF output:"
ls -la elf/ || true
