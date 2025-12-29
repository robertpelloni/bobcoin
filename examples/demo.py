"""
Example usage of Bobcoin.

This demonstrates the key features of Bobcoin including:
- Creating a wallet
- Social value mining
- Sending transactions
- Game integrations
- Anti-hoarding features
"""

from bobcoin.core.blockchain import Blockchain
from bobcoin.wallet import Wallet
from bobcoin.mining.social_value_mining import SocialValueMiner
from bobcoin.economy import (
    MusicGameIntegration,
    ExerciseGameIntegration,
    DatingAppIntegration,
    MMORPGIntegration,
    AntiHoardingSystem
)


def main():
    print("=" * 60)
    print("Bobcoin Demo - Privacy-Focused Social Value Blockchain")
    print("=" * 60)
    
    # 1. Initialize blockchain
    print("\n1. Initializing Blockchain...")
    blockchain = Blockchain()
    print(f"   ✓ Genesis block created")
    print(f"   Block 0 hash: {blockchain.get_latest_block().hash[:16]}...")
    
    # 2. Create wallets
    print("\n2. Creating Wallets...")
    alice_wallet = Wallet()
    bob_wallet = Wallet()
    print(f"   ✓ Alice's address: {alice_wallet.get_address()[:20]}...")
    print(f"   ✓ Bob's address: {bob_wallet.get_address()[:20]}...")
    
    # 3. Social Value Mining Demo
    print("\n3. Social Value Mining Demo...")
    miner = SocialValueMiner(alice_wallet.get_address())
    
    # Add exercise activity
    print("   Adding exercise proof...")
    miner.add_exercise_proof({
        "duration_minutes": 30,
        "intensity": 1.2,
        "source": "exercise_game"
    })
    print(f"   ✓ Exercise score: {miner.current_proof.exercise_score:.2f}")
    
    # Add social interaction
    print("   Adding social interaction proof...")
    miner.add_social_proof({
        "quality": 0.8,
        "duration_minutes": 60,
        "participants": 5,
        "source": "mmorpg"
    })
    print(f"   ✓ Social score: {miner.current_proof.social_score:.2f}")
    
    # Add relationship health
    print("   Adding relationship proof...")
    miner.add_relationship_proof({
        "communication_quality": 0.9,
        "mutual_support": 0.85,
        "duration_days": 90,
        "source": "dating_app"
    })
    print(f"   ✓ Relationship score: {miner.current_proof.relationship_score:.2f}")
    
    # Set velocity and distribution scores
    miner.set_velocity_score(70.0)
    miner.set_distribution_score(65.0)
    
    total_score = miner.current_proof.calculate_total_score()
    print(f"   ✓ Total social value score: {total_score:.2f}/100")
    
    # Try to mine
    if miner.can_mine():
        print("   Mining block with social value proof...")
        proof = miner.create_proof()
        block = blockchain.mine_pending_transactions(
            alice_wallet.get_address(),
            proof.to_dict()
        )
        if block:
            reward = blockchain.calculate_mining_reward()
            multiplier = miner.get_mining_reward_multiplier()
            print(f"   ✓ Block mined! Reward: {reward * multiplier:.2f} BOB")
    
    # 4. Transaction Demo
    print("\n4. Creating Privacy-Enhanced Transaction...")
    transaction = alice_wallet.create_transaction(
        bob_wallet.get_address(),
        amount=50.0,
        ring_size=32
    )
    blockchain.add_transaction(transaction)
    print(f"   ✓ Transaction created with ring size: {len(transaction.ring_members)}")
    print(f"   ✓ Stealth address used for receiver privacy")
    print(f"   ✓ Transaction ID: {transaction.tx_id[:16]}...")
    
    # 5. Game Integration Demos
    print("\n5. Game Integration Demos...")
    
    # Music Game
    print("   Music Game:")
    music_game = MusicGameIntegration(blockchain)
    session = music_game.record_session(
        alice_wallet.get_address(),
        "multiplayer",
        duration_minutes=25,
        score=92.5,
        multiplayer=True,
        participants=[bob_wallet.get_address()]
    )
    print(f"   ✓ Session recorded, reward: {session['reward']:.2f} BOB")
    
    # Exercise Game
    print("   Exercise Game:")
    exercise_game = ExerciseGameIntegration(blockchain)
    activity = exercise_game.record_activity(
        alice_wallet.get_address(),
        "running",
        duration_minutes=30,
        calories_burned=300,
        heart_rate_avg=145
    )
    print(f"   ✓ Exercise logged, reward: {activity['activity']['reward']:.2f} BOB")
    
    # Dating App
    print("   Dating App:")
    dating_app = DatingAppIntegration(blockchain)
    connection = dating_app.create_connection(
        alice_wallet.get_address(),
        bob_wallet.get_address()
    )
    print(f"   ✓ Connection created, reward: {connection['reward']:.2f} BOB")
    
    # MMORPG
    print("   MMORPG:")
    mmorpg = MMORPGIntegration(blockchain)
    quest = mmorpg.record_activity(
        alice_wallet.get_address(),
        "boss_defeat",
        party_size=5,
        cooperation_score=0.95,
        difficulty="hard"
    )
    print(f"   ✓ Boss defeated, reward: {quest['activity']['reward']:.2f} BOB")
    
    # 6. Anti-Hoarding System
    print("\n6. Anti-Hoarding System Demo...")
    anti_hoarding = AntiHoardingSystem(blockchain)
    
    velocity_score = anti_hoarding.calculate_velocity_score(alice_wallet.get_address())
    distribution_score = anti_hoarding.calculate_distribution_score(alice_wallet.get_address())
    
    print(f"   Velocity Score: {velocity_score:.2f}/100")
    print(f"   Distribution Score: {distribution_score:.2f}/100")
    
    health = anti_hoarding.get_account_health(alice_wallet.get_address())
    print(f"   ✓ Account Health: {health['health_score']:.2f}/100 ({health['health_level']})")
    
    # 7. Blockchain Stats
    print("\n7. Blockchain Statistics...")
    stats = blockchain.get_chain_stats()
    print(f"   Chain Height: {stats['height']} blocks")
    print(f"   Total Transactions: {stats['total_transactions']}")
    print(f"   Chain Valid: {stats['is_valid']}")
    print(f"   Current Mining Reward: {stats['current_reward']:.2f} BOB")
    
    print("\n" + "=" * 60)
    print("Demo Complete!")
    print("=" * 60)
    print("\nKey Features Demonstrated:")
    print("✓ Social value mining (exercise, social, relationships)")
    print("✓ Privacy-enhanced transactions (ring signatures, stealth addresses)")
    print("✓ Game economy integrations (music, exercise, dating, MMORPG)")
    print("✓ Anti-hoarding mechanisms (velocity, distribution scoring)")
    print("\nBobcoin: Replace Money. Build Community. Protect Privacy.")


if __name__ == "__main__":
    main()
