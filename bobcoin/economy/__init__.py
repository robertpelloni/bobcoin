"""
Economy integration framework for Bobcoin.

Provides APIs for integrating with various gaming and social platforms.
"""

from .music_game import MusicGameIntegration
from .exercise_game import ExerciseGameIntegration
from .dating_app import DatingAppIntegration
from .mmorpg import MMORPGIntegration
from .anti_hoarding import AntiHoardingSystem

__all__ = [
    "MusicGameIntegration",
    "ExerciseGameIntegration",
    "DatingAppIntegration",
    "MMORPGIntegration",
    "AntiHoardingSystem",
]
