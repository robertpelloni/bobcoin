#!/bin/bash
# Using bash script for starting despite .bat extension name in instruction

# Start the lattice node
cd go-lattice
go run ./... &
LATTICE_PID=$!
cd ..

# Start the game server
cd go-game-server
go run ./... &
GAME_SERVER_PID=$!
cd ..

# Start the supernode
cd go-supertorrent
go run ./... &
SUPERNODE_PID=$!
cd ..

# Start the frontend
cd frontend
npm run preview &
FRONTEND_PID=$!
cd ..

echo "All services started!"
echo "Lattice: $LATTICE_PID"
echo "Game Server: $GAME_SERVER_PID"
echo "Supernode: $SUPERNODE_PID"
echo "Frontend: $FRONTEND_PID"

wait
