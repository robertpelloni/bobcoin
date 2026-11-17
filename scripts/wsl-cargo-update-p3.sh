#!/usr/bin/env bash
# Bump p3-challenger to the patched release in all SP1 lockfiles.
# Builds happen in WSL-native build dirs; the repo lockfiles are the
# source of truth, so update them in place (via the native copies where
# they exist, then copy back), and also the proof-of-play workspace lock.
set -e
export PATH="$HOME/.sp1/bin:$HOME/.cargo/bin:$HOME/.local/protoc/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

for dir in "$ROOT/proof-of-play/verifier" "$ROOT/proof-of-play/prover" "$ROOT/proof-of-play"; do
  echo "== cargo update -p p3-challenger in $dir"
  (cd "$dir" && nice -n 10 cargo update -p p3-challenger 2>&1 | tail -3) || echo "  (no update applied)"
done
grep -A1 'name = "p3-challenger"' "$ROOT/proof-of-play/Cargo.lock" | head -4
