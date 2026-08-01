#!/bin/bash
# Start the lattice node
cd go-lattice
go run ./... > ../lattice.log 2>&1 &
LATTICE_PID=$!
cd ..

# Start the game server
cd go-game-server
go run ./... > ../game-server.log 2>&1 &
GAME_SERVER_PID=$!
cd ..

# Start the supernode
cd go-supertorrent
go run ./... > ../supernode.log 2>&1 &
SUPERNODE_PID=$!
cd ..

# Start the casino daemon bot
cd go-casino
go run ./... > ../casino.log 2>&1 &
CASINO_PID=$!
cd ..

# Start the frontend
cd frontend
npm run preview > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Start the NPC Agent Background Spawner
python3 scripts/npc_agent.py > npc_agent.log 2>&1 &
NPC_PID=$!

echo "All services started!"
echo "Lattice: $LATTICE_PID"
echo "Game Server: $GAME_SERVER_PID"
echo "Supernode: $SUPERNODE_PID"
echo "Casino: $CASINO_PID"
echo "Frontend: $FRONTEND_PID"
echo "NPC Agents: $NPC_PID"

wait
