FROM rust:1.81-slim-bookworm

# Install basic dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    pkg-config \
    libssl-dev \
    git \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

# Install SP1 Toolchain
# We use a specific tag or version if possible, but the install script is standard
RUN curl -L https://sp1.succinct.xyz | bash

# Add SP1 to PATH
ENV PATH="/root/.sp1/bin:${PATH}"

# Install the toolchain
RUN sp1up

WORKDIR /app

# We don't copy source here because we want to mount it to write the ELF back
# But we can pre-warm cache if we had a lockfile static. 
# For now, we just rely on the mount.

CMD ["cargo", "prove", "build"]
