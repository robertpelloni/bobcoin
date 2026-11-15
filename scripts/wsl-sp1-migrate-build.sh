#!/usr/bin/env bash
# scripts/wsl-sp1-migrate-build.sh — install latest SP1 in WSL and build the
# (migrated) proof-of-play program. See scripts/wsl-sp1-setup.sh for why WSL.
set -e
export PATH="$HOME/.sp1/bin:$HOME/.cargo/bin:$PATH"
echo "[sp1-migrate] Installing latest SP1 toolchain..."
nice -n 10 sp1up 2>&1 | tail -3
cargo prove --version
cd "$(dirname "$0")/../proof-of-play/program"
echo "[sp1-migrate] cargo prove build (niced)..."
nice -n 10 cargo prove build 2>&1 | tail -12
echo "[sp1-migrate] ELF output:"
ls -la elf/
