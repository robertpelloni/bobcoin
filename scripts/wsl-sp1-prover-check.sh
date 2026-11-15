#!/usr/bin/env bash
export PATH="$HOME/.sp1/bin:$HOME/.cargo/bin:$HOME/.local/protoc/bin:$PATH"
cd "$HOME/bobcoin-prover-build"
cargo check --release 2>&1 | grep -B2 -A14 "^error" | head -50
