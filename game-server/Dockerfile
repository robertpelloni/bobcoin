FROM node:20-slim

# Install build dependencies just in case
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy supertorrent (dependency)
COPY supertorrent/package.json ./supertorrent/
COPY supertorrent/ ./supertorrent/
# Install supertorrent deps first to ensure binaries are built
RUN cd supertorrent && npm install --legacy-peer-deps

# Setup Game Server
WORKDIR /app/game-server
COPY game-server/package.json .
RUN npm install

# Copy Game Server source
COPY game-server/ .

CMD ["npm", "start"]
