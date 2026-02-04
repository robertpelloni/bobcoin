FROM node:20-slim

# Install build dependencies for native modules (keccak256, etc.)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app/supertorrent

# Copy package files
COPY supertorrent/package.json .
# If there's a lock file, copy it too, but we might not have one yet or it might be windows specific
# COPY supertorrent/package-lock.json .

# Install dependencies
RUN npm install

# Copy source code
COPY supertorrent/ .

CMD ["node", "supernode/index.js"]
