#!/bin/bash
# POSIX launcher. Windows equivalent: start.ps1 (same ports, logs/, .services.pids).
# Heavyweight children run niced (BelowNormal equivalent) to avoid hanging the host.
NICE="nice -n 10"
command -v nice >/dev/null 2>&1 || NICE=""
mkdir -p logs
# Start the lattice node
cd go-lattice
$NICE go run ./... > ../logs/go-lattice.log 2>&1 &
LATTICE_PID=$!
cd ..

# Start the game server
cd go-game-server
$NICE go run ./... > ../logs/go-game-server.log 2>&1 &
GAME_SERVER_PID=$!
cd ..

# Start the supernode
cd go-supertorrent
$NICE go run ./... > ../logs/go-supertorrent.log 2>&1 &
SUPERNODE_PID=$!
cd ..

# Start the casino daemon bot
cd go-casino
$NICE go run ./... > ../logs/go-casino.log 2>&1 &
CASINO_PID=$!
cd ..

# Start the frontend
cd frontend
npm run preview > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Start the NPC Agent Background Spawner
python3 scripts/npc_agent.py > logs/npc-agent.log 2>&1 &
NPC_PID=$!

echo "All services started!"
echo "Lattice: $LATTICE_PID"
echo "Game Server: $GAME_SERVER_PID"
echo "Supernode: $SUPERNODE_PID"
echo "Casino: $CASINO_PID"
echo "Frontend: $FRONTEND_PID"
echo "NPC Agents: $NPC_PID"

wait
