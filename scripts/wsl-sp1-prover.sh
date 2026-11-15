#!/usr/bin/env bash
# Build the SP1 prover in WSL-native storage, copy the binary back, and
# (with --prove) generate + verify a sample proof end to end.
# Usage: wsl -d Ubuntu -- bash scripts/wsl-sp1-prover.sh [--prove]
set -e
export PATH="$HOME/.sp1/bin:$HOME/.cargo/bin:$HOME/.local/protoc/bin:$PATH"
SRC="$(cd "$(dirname "$0")/../proof-of-play/prover" && pwd)"
BUILD="$HOME/bobcoin-prover-build"
mkdir -p "$BUILD"
cp -r "$SRC/Cargo.toml" "$SRC/src" "$BUILD/"
cd "$BUILD"
echo "[sp1-prover] cargo build --release (niced)..."
nice -n 10 cargo build --release 2>&1 | tail -4
mkdir -p "$SRC/target/release"
cp target/release/proof-of-play-prover "$SRC/target/release/"
ls -la "$SRC/target/release/proof-of-play-prover"

if [ "${1:-}" = "--prove" ]; then
  ROOT="$(cd "$(dirname "$0")/.." && pwd)"
  ELF="$ROOT/proof-of-play/program/elf/proof-of-play"
  VERIFIER="$ROOT/proof-of-play/verifier/target/release/proof-of-play-verifier"
  echo "[sp1-prover] Proving sample trace (score=2000, 11 keystrokes)..."
  nice -n 10 "$SRC/target/release/proof-of-play-prover" --elf "$ELF" --score 2000 \
    --keystrokes 75,215,305,465,550,680,790,965,1060,1180,1310 --out /tmp/pop_proof.bin
  ls -la /tmp/pop_proof.bin
  echo "[sp1-prover] Verifying with proof-of-play-verifier..."
  "$VERIFIER" --elf "$ELF" --proof /tmp/pop_proof.bin
  base64 -w0 /tmp/pop_proof.bin > /tmp/pop_proof.b64
  echo "[sp1-prover] Base64 proof at /tmp/pop_proof.b64 ($(wc -c < /tmp/pop_proof.b64) chars)"
fi
