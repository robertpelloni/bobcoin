#!/usr/bin/env bash
# Regenerate the sample proof in Compressed mode and time a daemon verify.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ELF="$ROOT/proof-of-play/program/elf/proof-of-play"
PROVER="$ROOT/proof-of-play/prover/target/release/proof-of-play-prover"
echo "[compressed] Proving (this takes longer than core proving)..."
time mkdir -p "$HOME/sp1-proofs"
nice -n 10 "$PROVER" --elf "$ELF" --score 2000 \
  --keystrokes 75,215,305,465,550,680,790,965,1060,1180,1310 --out "$HOME/sp1-proofs/pop_proof_compressed.bin"
base64 -w0 "$HOME/sp1-proofs/pop_proof_compressed.bin" > "$HOME/sp1-proofs/pop_proof_compressed.b64"
ls -la "$HOME/sp1-proofs/pop_proof_compressed.bin" "$HOME/sp1-proofs/pop_proof_compressed.b64"
echo "[compressed] Daemon verification timing:"
time (printf '%s\n' "$HOME/sp1-proofs/pop_proof_compressed.bin" | nc 127.0.0.1 9823)
