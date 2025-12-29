"""
Social Value Mining system for Bobcoin.

A completely unique mining process that rewards social value contribution
instead of computational work or stake.
"""

from .social_value_mining import SocialValueMiner, SocialValueProof
from .exercise_verifier import ExerciseVerifier
from .social_verifier import SocialInteractionVerifier
from .relationship_verifier import RelationshipHealthVerifier

__all__ = [
    "SocialValueMiner",
    "SocialValueProof",
    "ExerciseVerifier",
    "SocialInteractionVerifier",
    "RelationshipHealthVerifier",
]
