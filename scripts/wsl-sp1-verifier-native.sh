#!/usr/bin/env bash
# Build the verifier in WSL-native storage (cargo on /mnt/c 9p is ~10x slower),
# then copy the binary back next to the crate for the Go bridge to invoke.
set -e
export PATH="$HOME/.sp1/bin:$HOME/.cargo/bin:$HOME/.local/protoc/bin:$PATH"
SRC="$(cd "$(dirname "$0")/../proof-of-play/verifier" && pwd)"
BUILD="$HOME/bobcoin-verifier-build"
mkdir -p "$BUILD"
cp -r "$SRC/Cargo.toml" "$SRC/src" "$BUILD/"
cd "$BUILD"
echo "[sp1-verifier-native] cargo build --release in $BUILD (niced)..."
nice -n 10 cargo build --release 2>&1 | tail -5
mkdir -p "$SRC/target/release"
cp target/release/proof-of-play-verifier "$SRC/target/release/"
ls -la "$SRC/target/release/proof-of-play-verifier"
