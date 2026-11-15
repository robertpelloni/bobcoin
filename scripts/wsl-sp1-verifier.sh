#!/usr/bin/env bash
# scripts/wsl-sp1-verifier.sh — build the host-side SP1 proof verifier in WSL.
# Usage: wsl -d Ubuntu -- bash scripts/wsl-sp1-verifier.sh
set -e
export PATH="$HOME/.sp1/bin:$HOME/.cargo/bin:$PATH"
# sp1-prover-types' build script requires protoc; bootstrap a local one
# (no sudo needed) when the distro package is absent.
if ! command -v protoc >/dev/null 2>&1 && [ ! -x "$HOME/.local/protoc/bin/protoc" ]; then
  echo "[sp1-verifier] Installing protoc to ~/.local/protoc ..."
  mkdir -p "$HOME/.local/protoc"
  curl -sSL -o /tmp/protoc.zip https://github.com/protocolbuffers/protobuf/releases/download/v25.6/protoc-25.6-linux-x86_64.zip
  python3 -c "import zipfile; zipfile.ZipFile('/tmp/protoc.zip').extractall('$HOME/.local/protoc')"
  chmod +x "$HOME/.local/protoc/bin/protoc"
fi
export PATH="$HOME/.local/protoc/bin:$PATH"
cd "$(dirname "$0")/../proof-of-play/verifier"
echo "[sp1-verifier] cargo build --release (niced, first build is slow)..."
nice -n 10 cargo build --release 2>&1 | tail -6
ls -la target/release/proof-of-play-verifier
