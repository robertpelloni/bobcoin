# Bobcoin Task Backlog (Comprehensive Analysis)

This document tracks all features, refactoring goals, and technical debt. It explicitly differentiates between what is *fully implemented*, *partially implemented (mocked)*, and *not started*.

## 1. Frontend (`/frontend`)

### Unfinished / Partially Hooked Up
- [ ] **Marketplace State:** The UI exists (`Marketplace.jsx`), and it successfully calls the `burnTokens` API. However, buying a "Matrix Theme" or "Track Pack" does not permanently alter the state of `RhythmGame.jsx`. The state is saved to `localStorage` but only applies a CSS class mockingly. **TODO:** Create a global Context or Redux store to manage unlocked assets and inject them into the WebGL scene.
- [ ] **Wallet View Keys:** The `Wallet.jsx` page displays a mock Private View/Spend key. **TODO:** When Ring Signatures are implemented (Phase 5), actually generate real Ed25519 stealth keys from the user's base Solana wallet seed.
- [ ] **Transaction Decoding:** The transaction history table has a "Decode" button, but it just unblurs hardcoded data. **TODO:** Wire this to a real backend indexer that fetches and decrypts on-chain memos using the user's view key.
- [ ] **Block Explorer Search:** The `Explorer.jsx` search bar is a visual mock. **TODO:** Connect it to the `game-server` to query real block hashes or miner addresses.
- [ ] **Sound Settings:** Add a global volume slider / mute button for the `SynthEngine` in the Layout.

### Refactoring & Polish
- [ ] **3D Assets:** Replace primitive `BoxGeometry` in `Note.jsx` with actual GLTF/GLB models (e.g., cyber-discs or orbs).
- [ ] **Wallet Connection Stability:** Persist the `@solana/wallet-adapter` connection state more reliably across router navigation.
- [ ] **Performance:** Optimize `useFrame` in the WebGL game to prevent frame drops on lower-end devices.

## 2. Game Server (`/game-server`)

### Unfinished / Partially Hooked Up
- [ ] **Real-Time Trollbox:** Currently uses HTTP polling (`GET /chat` every 3 seconds). **TODO:** Upgrade to WebSockets (`socket.io`) or WebRTC for instant messaging and lower server load.
- [ ] **Quest Verification:** `POST /quests/claim` simply trusts the client and blindly rewards tokens. **TODO:** Implement server-side verification: check the database to see if the player *actually* scored >10,000 points today before allowing the claim.
- [ ] **Database Schema Expansion:** The SQLite `users` table is missing. The system currently relies entirely on raw wallet addresses. **TODO:** Create a `users` table to link PubKeys to Avatars and Display Names for the Leaderboard.

## 3. Supernode (`/supertorrent`)

### Unfinished / Partially Hooked Up
- [ ] **Marketplace Integration:** The `SmartMiner` loop successfully claims mock bids from the server, but it doesn't wait for actual data transfer confirmation before finalizing. **TODO:** Ensure the node actually receives the full `.torrent` payload before marking the bid as "seeding".
- [ ] **Peer Map Real Data:** The `Supernode.jsx` frontend `PeerMap` uses randomized coordinates. **TODO:** Extract connected peer IP addresses from the `webtorrent` instance, use an IP-to-Geo API, and send real lat/long coordinates to the frontend.
- [ ] **Storage Proof Cryptography:** The `generateStorageProof` method uses `keccak256` locally. **TODO:** Ensure this aligns exactly with how the on-chain Solana program will expect the Merkle tree to be constructed.

## 4. Mobile Simulator (`/mobile`)

### Unfinished / Partially Hooked Up
- [ ] **Real Hash Calculation:** The mining loop in `App.js` just runs `setInterval` and randomly generates a "Hashrate". **TODO:** Implement a real, simple CPU-bound task (e.g., finding a SHA-256 hash starting with '00') to actually consume mobile CPU cycles and prove "Work".
- [ ] **QR Code Scanning:** The Wallet tab shows a mock QR code. **TODO:** Add a camera scanning feature using `expo-camera` to scan stealth addresses for sending/receiving tips.
- [ ] **Authentication:** The mobile app fetches global stats but doesn't have a way to connect a Solana wallet (WalletConnect or Deep Linking). **TODO:** Implement Mobile Wallet Adapter.

## 5. ZK Service (`/proof-of-play`)

### Unfinished / Partially Hooked Up
- [ ] **Client-Side Proving:** The service currently executes the RISC-V ELF on the *server* (Server-Side Proving). This defeats the purpose of Zero-Knowledge scalability. **TODO:** Compile the SP1 Prover to WebAssembly (Wasm) and run it inside the `frontend` browser. The browser generates the SNARK, and the server/blockchain only *verifies* it.
- [ ] **Circuit Complexity:** The current Rust circuit (`program/src/main.rs`) only checks basic math (`perfects * 100 + greats * 50`). **TODO:** Expand the circuit to verify the *timing* of keypresses against a cryptographic commitment of the song's beatmap to ensure impossible reaction times are rejected.
