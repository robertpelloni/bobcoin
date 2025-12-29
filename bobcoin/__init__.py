"""
Bobcoin - Privacy-focused blockchain token with social value mining.

A blockchain token combining Solana's high throughput with Monero's privacy features,
enhanced with unique social value mining and anti-hoarding mechanisms.
"""

import os

# Read version from VERSION.md file
_version_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "VERSION.md")
try:
    with open(_version_file, "r") as f:
        __version__ = f.read().strip()
except FileNotFoundError:
    __version__ = "0.1.0"  # Fallback version

__all__ = ["core", "crypto", "network", "mining", "economy", "wallet"]
