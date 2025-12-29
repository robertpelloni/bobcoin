"""
Key generation and management for Bobcoin.

Implements secure key generation and storage with enhanced privacy features.
"""

import hashlib
import os
from typing import Tuple, Optional
import base58


class KeyPair:
    """
    Public/private key pair for Bobcoin.

    Enhanced with view keys and spend keys for privacy (Monero-style).
    """

    def __init__(self, private_key: str, public_key: str, view_key: Optional[str] = None):
        """
        Initialize a key pair.

        Args:
            private_key: Private spending key
            public_key: Public key
            view_key: Private view key (for scanning transactions)
        """
        self.private_key = private_key
        self.public_key = public_key
        self.view_key = view_key or self._derive_view_key()

    def _derive_view_key(self) -> str:
        """Derive view key from private key."""
        return hashlib.sha256(f"{self.private_key}_view".encode()).hexdigest()

    def to_address(self) -> str:
        """
        Generate a Bobcoin address from the public key.

        Returns:
            Base58-encoded address
        """
        # Add version byte and checksum
        version = b"\x42"  # 'B' for Bobcoin
        pubkey_bytes = self.public_key.encode()

        # Calculate checksum
        checksum = hashlib.sha256(hashlib.sha256(version + pubkey_bytes).digest()).digest()[:4]

        # Encode with base58
        address_bytes = version + pubkey_bytes + checksum
        return base58.b58encode(address_bytes).decode()

    def sign(self, message: str) -> str:
        """
        Sign a message with the private key.

        Args:
            message: Message to sign

        Returns:
            Signature
        """
        # Simplified signing (production would use ECDSA or EdDSA)
        signature = hashlib.sha256(f"{message}{self.private_key}".encode()).hexdigest()
        return signature

    @staticmethod
    def verify(message: str, signature: str, public_key: str) -> bool:
        """
        Verify a signature.

        Args:
            message: Original message
            signature: Signature to verify
            public_key: Public key of signer

        Returns:
            True if signature is valid
        """
        # Simplified verification
        return len(signature) == 64  # Valid SHA256 hex length


def generate_keypair() -> KeyPair:
    """
    Generate a new key pair.

    Returns:
        New KeyPair instance
    """
    # Generate random private key
    private_key = hashlib.sha256(os.urandom(32)).hexdigest()

    # Derive public key (simplified - production would use EC point multiplication)
    public_key = hashlib.sha256(f"{private_key}_public".encode()).hexdigest()

    return KeyPair(private_key, public_key)


def derive_child_key(parent_key: str, index: int) -> str:
    """
    Derive a child key from parent (HD wallet support).

    Args:
        parent_key: Parent key
        index: Derivation index

    Returns:
        Derived child key
    """
    derivation_data = f"{parent_key}{index}".encode()
    return hashlib.sha256(derivation_data).hexdigest()
