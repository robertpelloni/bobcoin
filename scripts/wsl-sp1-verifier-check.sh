#!/usr/bin/env bash
export PATH="$HOME/.sp1/bin:$HOME/.cargo/bin:$HOME/.local/protoc/bin:$PATH"
cd "$HOME/bobcoin-verifier-build"
cargo check --release 2>&1 | grep -A16 "^error" | head -60
