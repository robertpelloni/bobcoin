"""
Blockchain implementation for Bobcoin.

Manages the chain of blocks with privacy features and high throughput capability.
"""

import json
import os
from typing import List, Optional, Dict, Any
from .block import Block
from .transaction import Transaction


class Blockchain:
    """
    Privacy-focused blockchain with high throughput.
    
    Features:
    - Fast block validation (Solana-inspired)
    - Privacy-preserving chain verification
    - Anti-hoarding mechanisms
    - Social value mining integration
    """
    
    # Blockchain constants
    BLOCK_TIME_TARGET = 0.4  # 400ms block time (Solana-level speed)
    MAX_TPS = 50000  # Target transactions per second
    INITIAL_REWARD = 10.0  # Initial mining reward
    HALVING_INTERVAL = 210000  # Blocks until reward halving
    DEMURRAGE_RATE = 0.02  # 2% annual holding fee to discourage hoarding
    
    def __init__(self, chain_file: Optional[str] = None):
        """
        Initialize blockchain.
        
        Args:
            chain_file: Optional file to persist blockchain data
        """
        self.chain: List[Block] = []
        self.pending_transactions: List[Transaction] = []
        self.chain_file = chain_file
        
        # Create genesis block
        if not self.load_chain():
            self.create_genesis_block()
    
    def create_genesis_block(self) -> Block:
        """Create the first block in the chain."""
        genesis_transaction = Transaction(
            sender_public_key="genesis",
            receiver_stealth_address="genesis",
            amount=0.0,
            ring_members=["genesis"],
            transaction_type="genesis"
        )
        
        genesis_block = Block(
            index=0,
            transactions=[genesis_transaction],
            previous_hash="0",
            social_value_proof={
                "proof_type": "genesis",
                "message": "In privacy we trust. In community we thrive."
            }
        )
        
        self.chain.append(genesis_block)
        return genesis_block
    
    def get_latest_block(self) -> Block:
        """Get the most recent block in the chain."""
        return self.chain[-1] if self.chain else self.create_genesis_block()
    
    def add_block(self, block: Block) -> bool:
        """
        Add a new block to the chain.
        
        Args:
            block: Block to add
            
        Returns:
            True if block was added successfully
        """
        previous_block = self.get_latest_block()
        
        if not block.is_valid(previous_block):
            return False
        
        self.chain.append(block)
        self.save_chain()
        return True
    
    def create_block(self, transactions: List[Transaction], social_value_proof: Dict) -> Block:
        """
        Create a new block with given transactions.
        
        Args:
            transactions: Transactions to include in block
            social_value_proof: Proof of social value for this block
            
        Returns:
            New block
        """
        previous_block = self.get_latest_block()
        
        new_block = Block(
            index=previous_block.index + 1,
            transactions=transactions,
            previous_hash=previous_block.hash,
            social_value_proof=social_value_proof
        )
        
        return new_block
    
    def add_transaction(self, transaction: Transaction) -> bool:
        """
        Add a transaction to pending transactions.
        
        Args:
            transaction: Transaction to add
            
        Returns:
            True if transaction was added
        """
        # Basic validation
        if not transaction.tx_id:
            return False
        
        self.pending_transactions.append(transaction)
        return True
    
    def mine_pending_transactions(self, miner_address: str, social_value_proof: Dict) -> Optional[Block]:
        """
        Mine pending transactions into a new block.
        
        Args:
            miner_address: Address to receive mining reward
            social_value_proof: Proof of social value contribution
            
        Returns:
            Newly mined block or None if mining failed
        """
        if not self.pending_transactions:
            return None
        
        # Create mining reward transaction
        reward = self.calculate_mining_reward()
        reward_transaction = Transaction(
            sender_public_key="network",
            receiver_stealth_address=miner_address,
            amount=reward,
            transaction_type="mining_reward"
        )
        
        # Include reward with pending transactions
        transactions = [reward_transaction] + self.pending_transactions
        
        # Create and add new block
        new_block = self.create_block(transactions, social_value_proof)
        
        if self.add_block(new_block):
            self.pending_transactions = []
            return new_block
        
        return None
    
    def calculate_mining_reward(self) -> float:
        """
        Calculate current mining reward with halving and social value multiplier.
        
        Returns:
            Current mining reward amount
        """
        current_height = len(self.chain)
        halvings = current_height // self.HALVING_INTERVAL
        reward = self.INITIAL_REWARD / (2 ** halvings)
        return max(reward, 0.001)  # Minimum reward
    
    def get_balance(self, address: str) -> float:
        """
        Calculate balance for an address (simplified for privacy).
        
        Args:
            address: Address to check
            
        Returns:
            Balance amount
        """
        balance = 0.0
        
        for block in self.chain:
            for tx in block.transactions:
                if tx.receiver_stealth_address == address:
                    balance += tx.amount
                if tx.sender_public_key == address:
                    balance -= tx.amount
        
        # Apply demurrage (holding fee)
        balance = self.apply_demurrage(balance, address)
        
        return balance
    
    def apply_demurrage(self, balance: float, address: str) -> float:
        """
        Apply demurrage (holding fee) to discourage hoarding.
        
        Args:
            balance: Current balance
            address: Address being calculated
            
        Returns:
            Balance after demurrage
        """
        # Simplified demurrage calculation
        # In production, would track time-weighted holdings
        if balance > 1000:  # Only apply to larger holdings
            demurrage_amount = balance * self.DEMURRAGE_RATE * 0.001  # Per block
            balance -= demurrage_amount
        
        return max(balance, 0.0)
    
    def is_chain_valid(self) -> bool:
        """
        Validate the entire blockchain.
        
        Returns:
            True if chain is valid
        """
        for i in range(1, len(self.chain)):
            current_block = self.chain[i]
            previous_block = self.chain[i - 1]
            
            if not current_block.is_valid(previous_block):
                return False
        
        return True
    
    def save_chain(self) -> bool:
        """Save blockchain to file."""
        if not self.chain_file:
            return False
        
        try:
            chain_data = {
                "chain": [block.to_dict() for block in self.chain],
                "pending_transactions": [tx.to_dict() for tx in self.pending_transactions]
            }
            
            os.makedirs(os.path.dirname(self.chain_file), exist_ok=True)
            with open(self.chain_file, "w") as f:
                json.dump(chain_data, f, indent=2)
            
            return True
        except Exception as e:
            print(f"Error saving chain: {e}")
            return False
    
    def load_chain(self) -> bool:
        """Load blockchain from file."""
        if not self.chain_file or not os.path.exists(self.chain_file):
            return False
        
        try:
            with open(self.chain_file, "r") as f:
                chain_data = json.load(f)
            
            self.chain = [Block.from_dict(block) for block in chain_data.get("chain", [])]
            self.pending_transactions = [
                Transaction.from_dict(tx) for tx in chain_data.get("pending_transactions", [])
            ]
            
            return len(self.chain) > 0
        except Exception as e:
            print(f"Error loading chain: {e}")
            return False
    
    def get_chain_stats(self) -> Dict[str, Any]:
        """Get blockchain statistics."""
        return {
            "height": len(self.chain),
            "total_transactions": sum(block.transaction_count for block in self.chain),
            "pending_transactions": len(self.pending_transactions),
            "latest_hash": self.get_latest_block().hash,
            "is_valid": self.is_chain_valid(),
            "current_reward": self.calculate_mining_reward()
        }
