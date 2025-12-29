"""
Bobcoin wallet implementation.

Manages keys, addresses, and transactions for users.
"""

import json
import os
from typing import Dict, Any, List, Optional
from ..crypto.keys import KeyPair, generate_keypair
from ..crypto.privacy import StealthAddress
from ..core.transaction import Transaction


class Wallet:
    """
    Privacy-focused wallet for Bobcoin.
    
    Features:
    - HD wallet support
    - Stealth address generation
    - Transaction history tracking
    - Balance management with privacy
    """
    
    def __init__(self, wallet_file: Optional[str] = None):
        """
        Initialize wallet.
        
        Args:
            wallet_file: Optional file to persist wallet data
        """
        self.keypair: Optional[KeyPair] = None
        self.address: Optional[str] = None
        self.wallet_file = wallet_file
        self.transaction_history: List[Dict[str, Any]] = []
        
        if wallet_file and os.path.exists(wallet_file):
            self.load()
        else:
            self.create_new()
    
    def create_new(self) -> Dict[str, str]:
        """
        Create a new wallet with fresh keys.
        
        Returns:
            Wallet information
        """
        self.keypair = generate_keypair()
        self.address = self.keypair.to_address()
        
        return {
            "address": self.address,
            "public_key": self.keypair.public_key,
            "message": "Keep your private key safe! It cannot be recovered if lost."
        }
    
    def get_address(self) -> str:
        """Get wallet address."""
        if not self.address:
            raise ValueError("Wallet not initialized")
        return self.address
    
    def get_public_key(self) -> str:
        """Get public key."""
        if not self.keypair:
            raise ValueError("Wallet not initialized")
        return self.keypair.public_key
    
    def get_private_key(self) -> str:
        """
        Get private key (use with caution!).
        
        Returns:
            Private key
        """
        if not self.keypair:
            raise ValueError("Wallet not initialized")
        return self.keypair.private_key
    
    def get_view_key(self) -> str:
        """Get view key for scanning transactions."""
        if not self.keypair:
            raise ValueError("Wallet not initialized")
        return self.keypair.view_key
    
    def create_stealth_address(self) -> tuple[str, str]:
        """
        Create a one-time stealth address.
        
        Returns:
            Tuple of (stealth_address, transaction_public_key)
        """
        if not self.keypair:
            raise ValueError("Wallet not initialized")
        
        return StealthAddress.generate(self.keypair.public_key)
    
    def create_transaction(
        self,
        recipient_address: str,
        amount: float,
        ring_size: int = 32
    ) -> Transaction:
        """
        Create a privacy-enhanced transaction.
        
        Args:
            recipient_address: Recipient's address
            amount: Amount to send
            ring_size: Size of anonymity set for ring signature
            
        Returns:
            Created transaction
        """
        if not self.keypair:
            raise ValueError("Wallet not initialized")
        
        # Generate stealth address for recipient
        stealth_address, tx_public_key = StealthAddress.generate(recipient_address)
        
        # Create ring of public keys (simplified)
        from ..crypto.privacy import RingSignature as RingSig
        ring_members = RingSig.generate_ring(self.keypair.public_key, ring_size)
        
        # Find our position in the ring
        key_index = ring_members.index(self.keypair.public_key)
        
        # Create ring signature
        message = f"{stealth_address}{amount}"
        ring_signature = RingSig.sign(
            message,
            self.keypair.private_key,
            ring_members,
            key_index
        )
        
        # Create transaction
        transaction = Transaction(
            sender_public_key=self.keypair.public_key,
            receiver_stealth_address=stealth_address,
            amount=amount,
            ring_members=ring_members,
            ring_signature=ring_signature
        )
        
        # Add to history
        self.transaction_history.append({
            "type": "sent",
            "amount": amount,
            "recipient": recipient_address,
            "tx_id": transaction.tx_id,
            "timestamp": transaction.timestamp
        })
        
        return transaction
    
    def scan_transactions(self, blockchain) -> List[Transaction]:
        """
        Scan blockchain for transactions to this wallet.
        
        Args:
            blockchain: Blockchain to scan
            
        Returns:
            List of incoming transactions
        """
        if not self.keypair:
            raise ValueError("Wallet not initialized")
        
        incoming_transactions = []
        
        for block in blockchain.chain:
            for tx in block.transactions:
                # Check if transaction is for us using view key
                if self._is_transaction_mine(tx):
                    incoming_transactions.append(tx)
                    
                    # Add to history if not already present
                    tx_ids = [h["tx_id"] for h in self.transaction_history]
                    if tx.tx_id not in tx_ids:
                        self.transaction_history.append({
                            "type": "received",
                            "amount": tx.amount,
                            "tx_id": tx.tx_id,
                            "timestamp": tx.timestamp
                        })
        
        return incoming_transactions
    
    def _is_transaction_mine(self, transaction: Transaction) -> bool:
        """
        Check if a transaction is addressed to this wallet.
        
        Args:
            transaction: Transaction to check
            
        Returns:
            True if transaction is ours
        """
        # Simplified check (production would use stealth address verification)
        return transaction.receiver_stealth_address == self.address
    
    def get_balance(self, blockchain) -> float:
        """
        Calculate wallet balance.
        
        Args:
            blockchain: Blockchain instance
            
        Returns:
            Current balance
        """
        if not self.address:
            raise ValueError("Wallet not initialized")
        
        return blockchain.get_balance(self.address)
    
    def get_transaction_history(self) -> List[Dict[str, Any]]:
        """Get transaction history."""
        return self.transaction_history
    
    def save(self) -> bool:
        """Save wallet to file."""
        if not self.wallet_file:
            return False
        
        if not self.keypair:
            return False
        
        try:
            wallet_data = {
                "private_key": self.keypair.private_key,
                "public_key": self.keypair.public_key,
                "view_key": self.keypair.view_key,
                "address": self.address,
                "transaction_history": self.transaction_history
            }
            
            os.makedirs(os.path.dirname(self.wallet_file), exist_ok=True)
            with open(self.wallet_file, "w") as f:
                json.dump(wallet_data, f, indent=2)
            
            return True
        except Exception as e:
            print(f"Error saving wallet: {e}")
            return False
    
    def load(self) -> bool:
        """Load wallet from file."""
        if not self.wallet_file or not os.path.exists(self.wallet_file):
            return False
        
        try:
            with open(self.wallet_file, "r") as f:
                wallet_data = json.load(f)
            
            self.keypair = KeyPair(
                wallet_data["private_key"],
                wallet_data["public_key"],
                wallet_data.get("view_key")
            )
            self.address = wallet_data["address"]
            self.transaction_history = wallet_data.get("transaction_history", [])
            
            return True
        except Exception as e:
            print(f"Error loading wallet: {e}")
            return False
    
    def export_keys(self) -> Dict[str, str]:
        """
        Export all keys (use with caution!).
        
        Returns:
            Dictionary with all keys
        """
        if not self.keypair:
            raise ValueError("Wallet not initialized")
        
        return {
            "address": self.address,
            "public_key": self.keypair.public_key,
            "private_key": self.keypair.private_key,
            "view_key": self.keypair.view_key
        }
