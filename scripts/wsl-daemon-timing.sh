#!/usr/bin/env bash
echo "native-path verify:"
time (printf '%s\n' "$HOME/sp1-proofs/test.bin" | nc 127.0.0.1 9823)
echo "mnt-path verify:"
time (printf '/mnt/c/Users/hyper/AppData/Local/Temp/proof_test.bin\n' | nc 127.0.0.1 9823)
