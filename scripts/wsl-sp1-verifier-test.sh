#!/usr/bin/env bash
# Negative test: garbage proof bytes must be rejected (exit 1, PROOF INVALID).
BIN=/mnt/c/Users/hyper/workspace/bobcoin/proof-of-play/verifier/target/release/proof-of-play-verifier
ELF=/mnt/c/Users/hyper/workspace/bobcoin/proof-of-play/program/elf/proof-of-play
echo "garbage-not-a-proof" > /tmp/fake_proof.bin
"$BIN" --elf "$ELF" --proof /tmp/fake_proof.bin; echo "exit=$?"
"$BIN" --help 2>&1 | head -2; echo "noargs exit=$?"
