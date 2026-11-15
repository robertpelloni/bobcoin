#!/usr/bin/env bash
strings "$(dirname "$0")/../frontend/src/wasm/proof_of_play_wasm_bg.wasm" | grep -E 'pop_input_commitment|sp1_zk_proof' | head -3 || echo "no prefix strings found"
