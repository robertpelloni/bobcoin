# Changelog

All notable changes to Bobcoin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-12-29

### Added - Initial Release

#### Core Blockchain Features
- Complete blockchain implementation with block, transaction, and chain management
- Merkle tree verification for efficient block validation
- Genesis block creation and chain persistence
- Block time target of 400ms (Solana-level performance)
- Target throughput of 50,000+ TPS

#### Enhanced Privacy Features (Beyond Monero)
- Ring signatures with minimum size of 16 members (vs Monero's 11)
- Recommended ring size of 32 for maximum privacy
- Stealth addresses for one-time recipient anonymity
- Confidential transactions with Pedersen commitments
- Range proofs for transaction validation
- Key images to prevent double-spending
- Secure cryptographic random generation using `secrets` module

#### Social Value Mining (Completely Unique)
- Proof of Social Value consensus mechanism replacing PoW/PoS
- Exercise verification system supporting 8 exercise types
- Social interaction verification with 10 interaction types
- Relationship health verification with 6 relationship types
- Weighted scoring system: Exercise (25%), Social (25%), Relationships (25%), Velocity (15%), Distribution (10%)
- Minimum mining score of 25/100 required
- Optimal mining score of 75/100 for 2x rewards
- Mining reward multipliers from 0.5x to 2.0x based on social value

#### Game Economy Integrations
- **Music Game Integration**
  - Session tracking (solo/multiplayer)
  - Tournament system with entry fees and prize pools
  - Reward multipliers: solo (1x), multiplayer (1.5x), tournament participation (2x), tournament win (3x), song creation (2.5x)
- **Exercise Game Integration**
  - Activity logging for multiple exercise types
  - Fitness challenges with customizable goals
  - Consistency bonuses for regular activity
  - Heart rate and calorie tracking
  - Rewards capped at 20 BOB per session
- **Dating App Integration**
  - Interaction quality tracking
  - Connection formation and milestone rewards
  - Relationship milestones: match (0.5 BOB), 1 week (5 BOB), 1 month (15 BOB), 3 months (40 BOB), 6 months (80 BOB), 1 year (150 BOB)
  - Health score monitoring
- **MMORPG Integration**
  - Activity rewards for quests, bosses, dungeons
  - Guild system with treasury management
  - Player-driven marketplace
  - Cooperation bonuses based on party size and teamwork
  - Difficulty multipliers: easy (0.8x), normal (1x), hard (1.5x), extreme (2x)

#### Anti-Hoarding Mechanisms
- Progressive demurrage system
  - 0% fee on balances under 100 BOB
  - 2% annual fee on balances 100-10,000 BOB
  - Progressive increase: +1% per 10k over 10,000 BOB threshold
  - Maximum 7% annual demurrage
- Velocity rewards for active spending (up to 50% bonus)
- Distribution fairness scoring (rewards diverse recipients)
- Account health monitoring with actionable recommendations

#### Wallet and CLI
- HD wallet with hierarchical key derivation
- Private spend keys and view keys (Monero-style)
- Stealth address generation
- Transaction creation with ring signatures
- Wallet persistence to JSON
- Complete CLI interface with commands:
  - `wallet`: create, balance, address, send, export
  - `mine`: start, status, exercise
  - `chain`: info, validate
  - `economy`: health, recommendations

#### Developer Tools
- Modular Python package structure
- Comprehensive API for all components
- Working demo example demonstrating all features
- Full type hints throughout codebase
- Clean separation of concerns

#### Documentation
- Comprehensive README with quick start guide
- Technical documentation explaining architecture
- API usage examples for all integrations
- Implementation summary
- Project structure documentation

### Security
- Code review completed with all issues resolved
- Security scan passed with 0 vulnerabilities
- Cryptographically secure random number generation
- Privacy features properly implemented

### Technical Details
- Python 3.8+ implementation
- Dependencies: cryptography, pycryptodome, ecdsa, base58, requests, flask
- 29 files, ~4,300 lines of code
- 6 major modules: core, crypto, mining, economy, wallet, utils

## [Unreleased]

### Planned Features
- P2P network layer with onion routing
- Mobile wallet applications (iOS and Android)
- Web wallet interface
- Light client implementation (SPV-style)
- Cross-chain bridges
- Community governance system
- Enhanced privacy features
- Network layer optimization
- Database backend (upgrade from JSON)
- Advanced cryptographic primitives
- Multi-signature support
- Atomic swaps
- Smart contract integration (future consideration)

### Future Enhancements (Extended Vision)
- **Dancing Mining**: Motion capture integration for "dance to mine" functionality
- **Tor Node Integration**: Make each miner/node a Tor relay
- **Distributed File Sharing**: Integrate file sharing network capabilities
- **Anonymous Communication**: Backbone for secure messaging
- **Democratic Voting System**: Blockchain-based voting infrastructure
- **Arcade/Exercise Machine Nodes**: Physical hardware integration as miners
- **MegaTorrents Support**: Distributed content delivery
- **Zero Transaction Fees**: Optimize for micro-transactions and tipping

[0.1.0]: https://github.com/robertpelloni/bobcoin/releases/tag/v0.1.0
