#!/usr/bin/env bash
# scripts/wsl-sp1-setup.sh
# Installs the SP1 (Succinct) toolchain inside WSL2 Ubuntu.
# Why WSL: SP1 ships cargo-prove binaries for linux/darwin only (verified
# against the v6.10.0 release assets); there is no win32 cargo-prove.
# The proof-of-play program pins sp1-zkvm 1.2.0, so install the matching
# SP1 v1.2.0 toolchain rather than latest.
# Usage (from Windows): wsl -d Ubuntu -- bash scripts/wsl-sp1-setup.sh
set -e
export PATH="$HOME/.sp1/bin:$HOME/.cargo/bin:$PATH"

if ! command -v cargo >/dev/null 2>&1; then
  echo "[sp1-setup] Installing rustup (minimal profile)..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
  export PATH="$HOME/.cargo/bin:$PATH"
fi

if ! command -v sp1up >/dev/null 2>&1; then
  echo "[sp1-setup] Installing sp1up..."
  curl -sSL https://sp1up.succinct.xyz | bash
  export PATH="$HOME/.sp1/bin:$PATH"
fi

SP1_VERSION="${SP1_VERSION:-v1.2.0}"
echo "[sp1-setup] Installing SP1 toolchain $SP1_VERSION (this downloads several GB)..."
nice -n 10 sp1up -v "$SP1_VERSION"

echo "[sp1-setup] Verifying..."
cargo prove --version || cargo-prove --version
echo "[sp1-setup] Done. Build with: cd proof-of-play/program && cargo prove build"
