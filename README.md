# Bobcoin

**Privacy-focused blockchain token with social value mining**

Bobcoin is a revolutionary cryptocurrency that combines the best features of Solana (high throughput) and Monero (privacy), while introducing completely unique concepts:

- **Enhanced Privacy**: More privacy protections than Monero by default with ring signatures, stealth addresses, and confidential transactions
- **Social Value Mining**: Replace traditional mining with proof of social value contribution (exercise, relationships, social interaction)
- **High Throughput**: 50,000+ TPS capability with 400ms block times
- **Anti-Hoarding**: Built-in demurrage and velocity rewards to discourage wealth concentration
- **Game Economy Integration**: Native support for music games, exercise games, dating apps, and MMORPGs
- **Total Anonymity**: Focus on complete transaction privacy and unlinkability

## 🌟 Key Features

### Privacy & Anonymity
- **Ring Signatures** with minimum ring size of 16 (larger than Monero)
- **Stealth Addresses** for one-time recipient addresses
- **Confidential Transactions** hiding amounts with Pedersen commitments
- **Onion Routing** for network-level privacy (planned)

### Social Value Mining (Proof of Social Value)
Instead of Proof of Work or Proof of Stake, Bobcoin uses a completely unique mining mechanism that rewards:

- 🏃 **Exercise & Physical Health**: Track and verify physical activity
- 👥 **Social Interactions**: Reward quality social connections
- ❤️ **Healthy Relationships**: Incentivize positive relationship behaviors
- 🎮 **Game Participation**: Integration with music games, exercise games, dating apps, and MMORPGs

### Anti-Hoarding Mechanisms
- **Demurrage System**: Progressive holding fees on large balances (2-7% annual)
- **Velocity Rewards**: Bonuses for active spending and circulation
- **Distribution Fairness**: Rewards for sending to diverse recipients
- **No Large Accumulation**: Discourages classism and wealth concentration

### Economy Integrations
Built-in APIs for:
- 🎵 **Music Game Tournaments**: Rhythm games, song creation, multiplayer
- 💪 **Exercise Games**: Fitness tracking, group challenges, consistency rewards
- 💑 **Dating Apps**: Healthy relationship formation, milestone rewards
- ⚔️ **Retro MMORPGs**: Player-driven economy, guild systems, marketplace

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/robertpelloni/bobcoin.git
cd bobcoin

# Install dependencies
pip install -r requirements.txt

# Install Bobcoin
pip install -e .
```

### Create a Wallet

```bash
# Create a new wallet
bobcoin wallet create

# Check your balance
bobcoin wallet balance

# Show your address
bobcoin wallet address
```

### Mining with Social Value

```bash
# Check your mining status
bobcoin mine status

# Add exercise proof
bobcoin mine exercise running 30

# Start mining (requires sufficient social value score)
bobcoin mine start
```

### Send Transactions

```bash
# Send Bobcoin
bobcoin wallet send <recipient_address> <amount>
```

### Check Blockchain

```bash
# View blockchain info
bobcoin chain info

# Validate blockchain
bobcoin chain validate
```

### Economy Health

```bash
# Check account health (velocity, distribution scores)
bobcoin economy health

# Get recommendations to improve your account
bobcoin economy recommendations
```

## 📖 Documentation

### Core Concepts

#### 1. Social Value Mining

Traditional cryptocurrencies use Proof of Work (energy-intensive) or Proof of Stake (favors wealthy). Bobcoin uses **Proof of Social Value**:

**How it works:**
- Accumulate social value points through verified activities
- Activities include: exercise, social interactions, relationship health
- Minimum 25 points needed to mine a block
- Higher scores (75+) earn up to 2x mining rewards
- Integration with games and apps provides automatic verification

**Activity Categories:**
- **Exercise (25% weight)**: Duration, intensity, consistency
- **Social Interaction (25% weight)**: Quality, participants, duration
- **Relationship Health (25% weight)**: Communication, mutual support, longevity
- **Transaction Velocity (15% weight)**: Spending frequency
- **Distribution Fairness (10% weight)**: Recipient diversity

#### 2. Enhanced Privacy

Bobcoin exceeds Monero's privacy with:

**Ring Signatures:**
- Minimum ring size: 16 (vs Monero's 11)
- Recommended size: 32
- Hides transaction sender among group

**Stealth Addresses:**
- One-time addresses for each transaction
- Prevents address reuse and linking
- Receiver anonymity

**Confidential Transactions:**
- Hide transaction amounts
- Pedersen commitments
- Range proofs for validity

#### 3. Anti-Hoarding System

**Demurrage (Holding Fee):**
- No fee on balances under 100 BOB
- 2% annual fee on larger balances
- Progressive rate: +1% per 10k over 10k BOB
- Capped at 7% annual maximum

**Velocity Rewards:**
- Bonus for active spending (up to 50%)
- Calculated from transaction frequency
- 3+ transactions/day = 100 velocity score

**Distribution Score:**
- Rewards sending to many recipients
- Discourages concentration
- 10+ unique recipients = 100 distribution score

### Game Integration APIs

#### Music Game Integration

```python
from bobcoin.economy import MusicGameIntegration

music_game = MusicGameIntegration(blockchain)

# Record a game session
session = music_game.record_session(
    player_address="player123",
    session_type="multiplayer",
    duration_minutes=30,
    score=95.5,
    multiplayer=True,
    participants=["player456", "player789"]
)

# Create tournament
tournament = music_game.create_tournament(
    tournament_name="Weekly Rhythm Battle",
    entry_fee=10.0,
    prize_pool=500.0
)
```

#### Exercise Game Integration

```python
from bobcoin.economy import ExerciseGameIntegration

exercise_game = ExerciseGameIntegration(blockchain)

# Record exercise activity
activity = exercise_game.record_activity(
    player_address="player123",
    exercise_type="running",
    duration_minutes=30,
    calories_burned=300
)

# Create fitness challenge
challenge = exercise_game.create_challenge(
    challenge_name="30-Day Run Challenge",
    challenge_type="duration",
    goal=900,  # 900 minutes
    duration_days=30,
    reward_pool=1000.0
)
```

#### Dating App Integration

```python
from bobcoin.economy import DatingAppIntegration

dating_app = DatingAppIntegration(blockchain)

# Record interaction
interaction = dating_app.record_interaction(
    user_address="user123",
    interaction_type="video_call",
    quality_score=0.8,
    duration_minutes=45,
    mutual_rating=0.9
)

# Track relationship milestones
update = dating_app.update_connection_health(
    user1_address="user123",
    user2_address="user456",
    health_indicators={
        "communication": 0.9,
        "respect": 0.95,
        "support": 0.85
    }
)
```

#### MMORPG Integration

```python
from bobcoin.economy import MMORPGIntegration

mmorpg = MMORPGIntegration(blockchain)

# Record game activity
activity = mmorpg.record_activity(
    player_address="player123",
    activity_type="dungeon_clear",
    party_size=5,
    cooperation_score=0.9,
    difficulty="hard"
)

# Create guild
guild = mmorpg.create_guild(
    guild_name="Dragon Slayers",
    founder_address="player123",
    guild_type="raiding"
)

# Marketplace
listing = mmorpg.list_item(
    seller_address="player123",
    item_name="Legendary Sword",
    price=100.0,
    quantity=1
)
```

## 🏗️ Architecture

### Project Structure

```
bobcoin/
├── bobcoin/
│   ├── core/              # Blockchain core (Block, Blockchain, Transaction)
│   ├── crypto/            # Cryptography (Keys, Privacy features)
│   ├── mining/            # Social Value Mining system
│   ├── economy/           # Game integrations & anti-hoarding
│   ├── wallet/            # Wallet implementation
│   ├── network/           # P2P networking (planned)
│   ├── utils/             # Utilities
│   └── cli.py             # Command-line interface
├── docs/                  # Documentation
├── tests/                 # Test suite
├── requirements.txt       # Dependencies
├── setup.py              # Installation
└── README.md             # This file
```

### Technology Stack

- **Language**: Python 3.8+
- **Cryptography**: cryptography, pycryptodome, ecdsa
- **Storage**: JSON-based (upgradeable to database)
- **CLI**: argparse
- **Testing**: pytest (planned)

## 🔒 Security

Bobcoin implements multiple layers of security:

1. **Transaction Privacy**: Ring signatures + stealth addresses
2. **Amount Privacy**: Confidential transactions
3. **Network Privacy**: Onion routing (planned)
4. **Key Security**: HD wallet support
5. **Double-Spend Prevention**: Key images in ring signatures

## 🌍 Social Impact

Bobcoin is designed to promote healthy society:

- **Physical Health**: Rewards exercise and fitness
- **Mental Health**: Incentivizes social connections
- **Relationship Health**: Supports healthy relationships
- **Economic Fairness**: Discourages hoarding and classism
- **Community Building**: Game economies foster cooperation

## 🤝 Contributing

We welcome contributions! Areas of focus:

- Network layer implementation
- Mobile wallet development
- Game integration SDKs
- Additional privacy features
- Performance optimization
- Testing and documentation

## 📄 License

[To be determined]

## 🗺️ Roadmap

- [x] Core blockchain implementation
- [x] Privacy features (ring signatures, stealth addresses)
- [x] Social value mining system
- [x] Game economy integrations
- [x] Anti-hoarding mechanisms
- [x] Wallet and CLI
- [ ] P2P network layer
- [ ] Mobile wallets (iOS, Android)
- [ ] Web wallet
- [ ] Mainnet launch
- [ ] Exchange listings
- [ ] Game SDK releases
- [ ] Community governance

## 📞 Contact

- GitHub: [robertpelloni/bobcoin](https://github.com/robertpelloni/bobcoin)
- Website: [Coming soon]

---

**Replace Money. Build Community. Protect Privacy.**
