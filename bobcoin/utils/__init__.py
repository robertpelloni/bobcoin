"""
Utility functions for Bobcoin.
"""

__all__ = ["validate_address", "format_amount"]


def validate_address(address: str) -> bool:
    """
    Validate a Bobcoin address.

    Args:
        address: Address to validate

    Returns:
        True if address is valid
    """
    if not address:
        return False

    # Basic validation (production would check base58 encoding, checksum, etc.)
    if len(address) < 20:
        return False

    return True


def format_amount(amount: float, decimals: int = 8) -> str:
    """
    Format amount for display.

    Args:
        amount: Amount to format
        decimals: Number of decimal places

    Returns:
        Formatted string
    """
    return f"{amount:.{decimals}f}".rstrip('0').rstrip('.')
