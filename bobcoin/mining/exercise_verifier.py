"""
Exercise verification system for Bobcoin.

Verifies physical exercise activities for mining rewards.
"""

import hashlib
import time
from typing import Dict, Any, List, Optional


class ExerciseVerifier:
    """
    Verifies exercise activities for social value mining.

    Integrates with:
    - Fitness trackers (Fitbit, Apple Watch, Garmin)
    - Exercise games
    - Manual verification with proof
    """

    # Exercise types and their base multipliers
    EXERCISE_TYPES = {
        "running": 1.2,
        "walking": 0.8,
        "cycling": 1.0,
        "swimming": 1.3,
        "strength_training": 1.1,
        "yoga": 0.9,
        "sports": 1.2,
        "dance": 1.1,
        "exercise_game": 1.0,
    }

    # Intensity multipliers
    INTENSITY_LOW = 0.7
    INTENSITY_MEDIUM = 1.0
    INTENSITY_HIGH = 1.3
    INTENSITY_EXTREME = 1.5

    def __init__(self):
        """Initialize exercise verifier."""
        self.verified_exercises: List[Dict[str, Any]] = []

    def verify_exercise(
        self,
        exercise_type: str,
        duration_minutes: int,
        intensity: str = "medium",
        proof_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Verify an exercise activity.

        Args:
            exercise_type: Type of exercise
            duration_minutes: Duration in minutes
            intensity: Exercise intensity (low, medium, high, extreme)
            proof_data: Optional proof data (tracker data, game data, etc.)

        Returns:
            Verification result
        """
        # Validate exercise type
        if exercise_type not in self.EXERCISE_TYPES:
            return {
                "verified": False,
                "reason": f"Unknown exercise type: {exercise_type}"
            }

        # Validate duration
        if duration_minutes <= 0 or duration_minutes > 480:  # Max 8 hours
            return {
                "verified": False,
                "reason": "Invalid duration"
            }

        # Get intensity multiplier
        intensity_multiplier = self._get_intensity_multiplier(intensity)

        # Calculate base score
        type_multiplier = self.EXERCISE_TYPES[exercise_type]
        base_score = duration_minutes * type_multiplier * intensity_multiplier

        # Verify proof if provided
        proof_verified = self._verify_proof(proof_data) if proof_data else True

        if not proof_verified:
            return {
                "verified": False,
                "reason": "Proof verification failed"
            }

        # Create verified exercise record
        exercise_record = {
            "verified": True,
            "exercise_type": exercise_type,
            "duration_minutes": duration_minutes,
            "intensity": intensity,
            "score": base_score,
            "timestamp": time.time(),
            "proof_hash": self._hash_proof(proof_data) if proof_data else None
        }

        self.verified_exercises.append(exercise_record)
        return exercise_record

    def _get_intensity_multiplier(self, intensity: str) -> float:
        """Get intensity multiplier."""
        intensity_map = {
            "low": self.INTENSITY_LOW,
            "medium": self.INTENSITY_MEDIUM,
            "high": self.INTENSITY_HIGH,
            "extreme": self.INTENSITY_EXTREME
        }
        return intensity_map.get(intensity.lower(), self.INTENSITY_MEDIUM)

    def _verify_proof(self, proof_data: Dict[str, Any]) -> bool:
        """
        Verify exercise proof data.

        Args:
            proof_data: Proof data to verify

        Returns:
            True if proof is valid
        """
        # Check required fields
        required_fields = ["source", "timestamp"]
        for field in required_fields:
            if field not in proof_data:
                return False

        # Verify timestamp is recent (within last 24 hours)
        current_time = time.time()
        proof_time = proof_data.get("timestamp", 0)
        if proof_time > current_time or proof_time < current_time - 86400:
            return False

        # Verify source
        valid_sources = [
            "fitness_tracker",
            "exercise_game",
            "manual_verification",
            "game_integration"
        ]
        if proof_data.get("source") not in valid_sources:
            return False

        return True

    def _hash_proof(self, proof_data: Optional[Dict[str, Any]]) -> str:
        """Generate hash of proof data."""
        if not proof_data:
            return ""

        proof_string = str(sorted(proof_data.items()))
        return hashlib.sha256(proof_string.encode()).hexdigest()

    def get_total_exercise_score(self) -> float:
        """
        Calculate total exercise score from all verified exercises.

        Returns:
            Total score
        """
        if not self.verified_exercises:
            return 0.0

        total_score = sum(ex.get("score", 0) for ex in self.verified_exercises)
        # Normalize to 0-100 scale
        return min(total_score / 10.0, 100.0)

    def get_exercise_summary(self) -> Dict[str, Any]:
        """Get summary of verified exercises."""
        return {
            "total_exercises": len(self.verified_exercises),
            "total_duration_minutes": sum(
                ex.get("duration_minutes", 0) for ex in self.verified_exercises
            ),
            "total_score": self.get_total_exercise_score(),
            "exercises_by_type": self._group_by_type()
        }

    def _group_by_type(self) -> Dict[str, int]:
        """Group exercises by type."""
        grouped = {}
        for exercise in self.verified_exercises:
            ex_type = exercise.get("exercise_type", "unknown")
            grouped[ex_type] = grouped.get(ex_type, 0) + 1
        return grouped
