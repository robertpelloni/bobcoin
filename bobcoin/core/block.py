"""
Block structure for Bobcoin blockchain.

Implements privacy-enhanced blocks with efficient storage and verification.
"""

import hashlib
import json
import time
from typing import List, Dict, Any, Optional
from .transaction import Transaction


class Block:
    """
    Privacy-focused blockchain block.

    Features:
    - Compact block format for high throughput (Solana-inspired)
    - Privacy-preserving transaction inclusion
    - Social value proof integration
    - Anti-hoarding metadata
    """

    def __init__(
        self,
        index: int,
        transactions: List[Transaction],
        previous_hash: str,
        timestamp: Optional[float] = None,
        social_value_proof: Optional[Dict] = None,
        nonce: int = 0
    ):
        """
        Initialize a block.

        Args:
            index: Block number in the chain
            transactions: List of transactions in this block
            previous_hash: Hash of the previous block
            timestamp: Block creation timestamp
            social_value_proof: Proof of social value (unique to Bobcoin)
            nonce: Nonce for block validation
        """
        self.index = index
        self.transactions = transactions
        self.previous_hash = previous_hash
        self.timestamp = timestamp or time.time()
        self.social_value_proof = social_value_proof or {}
        self.nonce = nonce
        self.hash = self.calculate_hash()

        # Additional privacy and performance features
        self.merkle_root = self.calculate_merkle_root()
        self.transaction_count = len(transactions)

    def calculate_hash(self) -> str:
        """
        Calculate block hash.

        Uses privacy-preserving hashing that doesn't reveal transaction details.
        """
        block_dict = {
            "index": self.index,
            "timestamp": self.timestamp,
            "previous_hash": self.previous_hash,
            "merkle_root": self.calculate_merkle_root(),
            "social_value_proof": self.social_value_proof,
            "nonce": self.nonce
        }
        block_string = json.dumps(block_dict, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()

    def calculate_merkle_root(self) -> str:
        """Calculate Merkle root of transactions for efficient verification."""
        if not self.transactions:
            return hashlib.sha256(b"").hexdigest()

        # Simple Merkle root calculation
        tx_hashes = [tx.tx_id for tx in self.transactions]

        while len(tx_hashes) > 1:
            if len(tx_hashes) % 2 != 0:
                tx_hashes.append(tx_hashes[-1])

            new_hashes = []
            for i in range(0, len(tx_hashes), 2):
                combined = tx_hashes[i] + tx_hashes[i + 1]
                new_hash = hashlib.sha256(combined.encode()).hexdigest()
                new_hashes.append(new_hash)

            tx_hashes = new_hashes

        return tx_hashes[0]

    def to_dict(self) -> Dict[str, Any]:
        """Convert block to dictionary for serialization."""
        return {
            "index": self.index,
            "timestamp": self.timestamp,
            "transactions": [tx.to_dict() for tx in self.transactions],
            "previous_hash": self.previous_hash,
            "hash": self.hash,
            "merkle_root": self.merkle_root,
            "social_value_proof": self.social_value_proof,
            "nonce": self.nonce,
            "transaction_count": self.transaction_count
        }

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "Block":
        """Create block from dictionary."""
        transactions = [Transaction.from_dict(tx) for tx in data.get("transactions", [])]
        block = Block(
            index=data.get("index", 0),
            transactions=transactions,
            previous_hash=data.get("previous_hash", ""),
            timestamp=data.get("timestamp"),
            social_value_proof=data.get("social_value_proof"),
            nonce=data.get("nonce", 0)
        )
        return block

    def is_valid(self, previous_block: Optional["Block"] = None) -> bool:
        """
        Validate block integrity.

        Args:
            previous_block: Previous block in the chain for validation

        Returns:
            True if block is valid
        """
        # Check hash integrity
        if self.hash != self.calculate_hash():
            return False

        # Check Merkle root
        if self.merkle_root != self.calculate_merkle_root():
            return False

        # Check chain linkage
        if previous_block and self.previous_hash != previous_block.hash:
            return False

        # Check index sequence
        if previous_block and self.index != previous_block.index + 1:
            return False

        return True
