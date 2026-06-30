#!/bin/bash
echo "Starting backend servers..."
cd go-lattice && go build -o lattice && ./lattice > ../consensus.log 2>&1 &
sleep 2
cd go-game-server && go build -o game-server && ./game-server > ../game-server.log 2>&1 &
cd go-supertorrent && go build -o supertorrent && ./supertorrent > ../supertorrent.log 2>&1 &
echo "Servers starting, giving them a few seconds..."
sleep 5
