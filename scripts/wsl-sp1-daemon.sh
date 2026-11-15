#!/usr/bin/env bash
# Manage the SP1 verifier daemon inside WSL (cached setup, TCP line protocol).
# Usage: wsl -d Ubuntu -- bash scripts/wsl-sp1-daemon.sh [start|stop|status]
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$ROOT/proof-of-play/verifier/target/release/proof-of-play-verifier"
ELF="$ROOT/proof-of-play/program/elf/proof-of-play"
ADDR="${SP1_VERIFIER_ADDR:-127.0.0.1:9823}"
LOG="$HOME/sp1-verifier-daemon.log"
PIDFILE="$HOME/sp1-verifier-daemon.pid"

case "${1:-status}" in
  start)
    if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
      echo "[sp1-daemon] already running pid=$(cat "$PIDFILE")"
      exit 0
    fi
    nohup "$BIN" --serve "$ADDR" --elf "$ELF" > "$LOG" 2>&1 &
    echo $! > "$PIDFILE"
    echo "[sp1-daemon] starting pid=$! addr=$ADDR log=$LOG (setup may take minutes; check status)"
    ;;
  stop)
    if [ -f "$PIDFILE" ]; then kill "$(cat "$PIDFILE")" 2>/dev/null || true; rm -f "$PIDFILE"; echo "[sp1-daemon] stopped"; else echo "[sp1-daemon] no pidfile"; fi
    ;;
  status)
    if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then echo "[sp1-daemon] running pid=$(cat "$PIDFILE")"; else echo "[sp1-daemon] not running"; fi
    tail -2 "$LOG" 2>/dev/null || true
    ;;
  *) echo "usage: $0 [start|stop|status]"; exit 1 ;;
esac
