"""
Command-line interface for Bobcoin.
"""

import sys
import argparse
from ..core.blockchain import Blockchain
from ..wallet import Wallet
from ..mining.social_value_mining import SocialValueMiner
from ..economy import AntiHoardingSystem


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Bobcoin - Privacy-focused blockchain with social value mining"
    )

    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Wallet commands
    wallet_parser = subparsers.add_parser("wallet", help="Wallet operations")
    wallet_subparsers = wallet_parser.add_subparsers(dest="wallet_command")

    wallet_subparsers.add_parser("create", help="Create a new wallet")
    wallet_subparsers.add_parser("balance", help="Check wallet balance")
    wallet_subparsers.add_parser("address", help="Show wallet address")
    wallet_subparsers.add_parser("export", help="Export wallet keys")

    send_parser = wallet_subparsers.add_parser("send", help="Send Bobcoin")
    send_parser.add_argument("recipient", help="Recipient address")
    send_parser.add_argument("amount", type=float, help="Amount to send")

    # Mining commands
    mine_parser = subparsers.add_parser("mine", help="Mining operations")
    mine_subparsers = mine_parser.add_subparsers(dest="mine_command")

    mine_subparsers.add_parser("start", help="Start social value mining")
    mine_subparsers.add_parser("status", help="Check mining status")

    exercise_parser = mine_subparsers.add_parser("exercise", help="Add exercise proof")
    exercise_parser.add_argument("type", help="Exercise type")
    exercise_parser.add_argument("duration", type=int, help="Duration in minutes")

    # Blockchain commands
    chain_parser = subparsers.add_parser("chain", help="Blockchain operations")
    chain_subparsers = chain_parser.add_subparsers(dest="chain_command")

    chain_subparsers.add_parser("info", help="Show blockchain info")
    chain_subparsers.add_parser("validate", help="Validate blockchain")

    # Economy commands
    economy_parser = subparsers.add_parser("economy", help="Economy operations")
    economy_subparsers = economy_parser.add_subparsers(dest="economy_command")

    economy_subparsers.add_parser("health", help="Check account health")
    economy_subparsers.add_parser("recommendations", help="Get distribution recommendations")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    # Initialize blockchain and wallet
    blockchain = Blockchain(chain_file="data/blockchain.json")
    wallet = Wallet(wallet_file="data/wallet.json")

    # Handle commands
    if args.command == "wallet":
        handle_wallet_commands(args, wallet, blockchain)
    elif args.command == "mine":
        handle_mine_commands(args, wallet, blockchain)
    elif args.command == "chain":
        handle_chain_commands(args, blockchain)
    elif args.command == "economy":
        handle_economy_commands(args, wallet, blockchain)


def handle_wallet_commands(args, wallet, blockchain):
    """Handle wallet commands."""
    if args.wallet_command == "create":
        info = wallet.create_new()
        print("✓ New wallet created!")
        print(f"Address: {info['address']}")
        print(f"Public Key: {info['public_key']}")
        print(f"\n⚠️  {info['message']}")
        wallet.save()

    elif args.wallet_command == "balance":
        balance = wallet.get_balance(blockchain)
        print(f"Balance: {balance} BOB")

    elif args.wallet_command == "address":
        print(f"Address: {wallet.get_address()}")

    elif args.wallet_command == "export":
        print("⚠️  WARNING: Never share your private keys!")
        confirm = input("Type 'yes' to export keys: ")
        if confirm.lower() == "yes":
            keys = wallet.export_keys()
            print("\nWallet Keys:")
            for key, value in keys.items():
                print(f"{key}: {value}")

    elif args.wallet_command == "send":
        try:
            transaction = wallet.create_transaction(args.recipient, args.amount)
            blockchain.add_transaction(transaction)
            print(f"✓ Transaction created: {transaction.tx_id}")
            print(f"Sent {args.amount} BOB to {args.recipient}")
            wallet.save()
        except Exception as e:
            print(f"Error: {e}")


def handle_mine_commands(args, wallet, blockchain):
    """Handle mining commands."""
    miner = SocialValueMiner(wallet.get_address())

    if args.mine_command == "start":
        if miner.can_mine():
            proof = miner.create_proof()
            block = blockchain.mine_pending_transactions(
                wallet.get_address(),
                proof.to_dict()
            )
            if block:
                print(f"✓ Block mined! Block #{block.index}")
                print(f"Reward: {blockchain.calculate_mining_reward()} BOB")
                print(f"Social Value Score: {proof.calculate_total_score():.2f}")
            else:
                print("No pending transactions to mine")
        else:
            print("Insufficient social value score to mine")
            print(f"Current score: {miner.current_proof.calculate_total_score():.2f}")
            print(f"Minimum required: {miner.MIN_SCORE_TO_MINE}")

    elif args.mine_command == "status":
        proof = miner.current_proof
        print("Mining Status:")
        print(f"Exercise Score: {proof.exercise_score:.2f}")
        print(f"Social Score: {proof.social_score:.2f}")
        print(f"Relationship Score: {proof.relationship_score:.2f}")
        print(f"Total Score: {proof.calculate_total_score():.2f}")
        print(f"Can Mine: {'Yes' if miner.can_mine() else 'No'}")

    elif args.mine_command == "exercise":
        proof = {
            "duration_minutes": args.duration,
            "intensity": 1.0,
            "source": "manual_verification",
            "timestamp": __import__("time").time()
        }
        miner.add_exercise_proof(proof)
        print(f"✓ Exercise proof added: {args.type} for {args.duration} minutes")
        print(f"New exercise score: {miner.current_proof.exercise_score:.2f}")


def handle_chain_commands(args, blockchain):
    """Handle blockchain commands."""
    if args.chain_command == "info":
        stats = blockchain.get_chain_stats()
        print("Blockchain Information:")
        print(f"Height: {stats['height']} blocks")
        print(f"Total Transactions: {stats['total_transactions']}")
        print(f"Pending Transactions: {stats['pending_transactions']}")
        print(f"Latest Hash: {stats['latest_hash'][:16]}...")
        print(f"Valid: {stats['is_valid']}")
        print(f"Current Mining Reward: {stats['current_reward']} BOB")

    elif args.chain_command == "validate":
        is_valid = blockchain.is_chain_valid()
        if is_valid:
            print("✓ Blockchain is valid")
        else:
            print("✗ Blockchain validation failed")


def handle_economy_commands(args, wallet, blockchain):
    """Handle economy commands."""
    anti_hoarding = AntiHoardingSystem(blockchain)
    address = wallet.get_address()

    if args.economy_command == "health":
        health = anti_hoarding.get_account_health(address)
        print("Account Health:")
        print(f"Health Score: {health['health_score']:.2f}/100 ({health['health_level']})")
        print(f"Velocity Score: {health['velocity_score']:.2f}/100")
        print(f"Distribution Score: {health['distribution_score']:.2f}/100")
        print(f"Balance: {health['balance']:.2f} BOB")

    elif args.economy_command == "recommendations":
        balance = blockchain.get_balance(address)
        recommendations = anti_hoarding.recommend_distribution(address, balance)

        if recommendations:
            print("Recommendations to improve your account:")
            for i, rec in enumerate(recommendations, 1):
                print(f"\n{i}. {rec['type'].upper()}")
                print(f"   {rec['message']}")
                print(f"   Action: {rec['suggested_action']}")
                if 'potential_bonus' in rec:
                    print(f"   Benefit: {rec['potential_bonus']}")
                if 'potential_savings' in rec:
                    print(f"   Savings: {rec['potential_savings']}")
        else:
            print("✓ Your account is optimal! No recommendations at this time.")


if __name__ == "__main__":
    main()
