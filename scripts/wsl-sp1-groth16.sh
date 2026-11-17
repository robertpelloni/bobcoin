#!/usr/bin/env bash
# Groth16 evaluation: prove the sample trace in Groth16 mode, then time
# daemon verification. Groth16 proving downloads circuit artifacts on
# first use and is the slowest mode; proofs are the smallest (~hundreds
# of bytes of proof + public values wrapper).
set -e
export PATH="$HOME/.sp1/bin:$HOME/.cargo/bin:$HOME/.local/protoc/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ELF="$ROOT/proof-of-play/program/elf/proof-of-play"
PROVER="$ROOT/proof-of-play/prover/target/release/proof-of-play-prover"
mkdir -p "$HOME/sp1-proofs"
echo "[groth16] Proving (expect artifact downloads + long CPU time)..."
time nice -n 10 "$PROVER" --elf "$ELF" --score 2000 \
  --keystrokes 75,215,305,465,550,680,790,965,1060,1180,1310 \
  --mode groth16 --out "$HOME/sp1-proofs/pop_proof_groth16.bin"
base64 -w0 "$HOME/sp1-proofs/pop_proof_groth16.bin" > "$HOME/sp1-proofs/pop_proof_groth16.b64"
ls -la "$HOME/sp1-proofs/pop_proof_groth16.bin"
