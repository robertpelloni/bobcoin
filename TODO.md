# Bobcoin Task Backlog

### High Priority (Bugs & Refactoring)
- [ ] **Mobile Mining:** Update the React Native App to actually compute a simple SHA-256 PoW challenge instead of just `setTimeout`.
- [ ] **Wallet Connection:** Persist the `@solana/wallet-adapter` connection state across page reloads more gracefully (sometimes requires re-connecting on `main.jsx` mount).

### Medium Priority (Features)
- [ ] **Authentication:** Add explicit User Accounts or Avatars tied to the Wallet PubKey, rather than displaying raw PubKeys in the Leaderboard and Trollbox.
- [ ] **Sound Settings:** Add a global volume slider / mute button for the `SynthEngine`.
- [ ] **Marketplace Functional:** Wire the Marketplace purchases to actually unlock new tracks/themes in the Rhythm Game state.
- [ ] **WebRTC Chat:** Upgrade the Trollbox from HTTP polling to WebSockets or WebRTC for true real-time chat.

### Low Priority (Polish)
- [ ] **3D Assets:** Import actual GLTF/GLB models for the notes instead of primitive BoxGeometry.
- [ ] **Peer Map Real Data:** Wire the Supernode `PeerMap` component to use real WebTorrent peer IP addresses/geolocation (requires an IP-to-Geo API).
