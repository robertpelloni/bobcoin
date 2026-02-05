FROM node:20-slim

# Install build dependencies for native modules (keccak256, etc.)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app/supertorrent

# Copy package files
COPY supertorrent/package.json .

# Install dependencies inside the container to ensure correct architecture
RUN npm install --legacy-peer-deps

# Copy source code
COPY supertorrent/ .

# Rebuild native modules just in case (fixes ERR_DLOPEN_FAILED for node-datachannel)
RUN npm rebuild

CMD ["node", "supernode/index.js"]
