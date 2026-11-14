#!/usr/bin/env bash
# Rebuild the frontend WASM input-commitment artifact (proof-of-play/wasm)
# into frontend/src/wasm. Uses a prebuilt wasm-pack binary (cargo install
# would take ~10 min) and the stable toolchain's wasm32 target.
set -e
export PATH="$HOME/.cargo/bin:$HOME/.local/bin:$PATH"
if ! command -v wasm-pack >/dev/null 2>&1; then
  echo "[wasm] Installing wasm-pack (prebuilt)..."
  mkdir -p "$HOME/.local/wasm-pack"
  curl -sSL https://github.com/wasm-bindgen/wasm-bindgen/releases/download/0.2.100/wasm-bindgen-0.2.100-x86_64-unknown-linux-musl.tar.gz -o /tmp/wbg.tar.gz || true
  curl -sSL https://github.com/rustwasm/wasm-pack/releases/download/v0.13.1/wasm-pack-v0.13.1-x86_64-unknown-linux-musl.tar.gz -o /tmp/wasm-pack.tar.gz
  tar -xzf /tmp/wasm-pack.tar.gz -C "$HOME/.local/wasm-pack" --strip-components=1
  export PATH="$HOME/.local/wasm-pack:$PATH"
fi
rustup target add wasm32-unknown-unknown --toolchain stable 2>&1 | tail -1
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/proof-of-play/wasm"
echo "[wasm] wasm-pack build..."
nice -n 10 wasm-pack build --target web --out-dir ../../frontend/src/wasm 2>&1 | tail -5
grep -o "pop_input_commitment_v1" ../../frontend/src/wasm/*.js | head -1 || echo "[wasm] WARNING: new prefix not found in built JS"
ls -la ../../frontend/src/wasm/
