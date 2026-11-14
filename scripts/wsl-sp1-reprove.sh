#!/usr/bin/env bash
# Regenerate the sample proof and verify it through the running daemon.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ELF="$ROOT/proof-of-play/program/elf/proof-of-play"
PROVER="$ROOT/proof-of-play/prover/target/release/proof-of-play-prover"
nice -n 10 "$PROVER" --elf "$ELF" --score 2000 \
  --keystrokes 75,215,305,465,550,680,790,965,1060,1180,1310 --out /tmp/pop_proof.bin
base64 -w0 /tmp/pop_proof.bin > /tmp/pop_proof.b64
ls -la /tmp/pop_proof.bin /tmp/pop_proof.b64
# Time a daemon verification directly (cached setup should make this fast).
time (printf '/tmp/pop_proof.bin\n' | nc 127.0.0.1 9823)
