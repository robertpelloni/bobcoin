# Submodule & Library Inventory

*Note: The project currently does not utilize actual git submodules (`.gitmodules` is empty or non-existent).*

## Core External Dependencies
- **`node-seal`**: Fully Homomorphic Encryption (FHE) library, used extensively in `frontend/` and `game-server/` (via JS scripts invoked from Go).
- **`simple-peer`**: WebRTC wrapper used for frontend P2P multi-player matchmaking.
- **`SP1`**: RISC-V Zero Knowledge proof generator tooling (referenced in `install_sp1.sh` and intended for Rust verification paths).
- **`solana/web3.js` & `LightProtocol SDK`**: Used inside the `supertorrent` package for state compression and metadata anchoring. *(Requires `--legacy-peer-deps`)*.
