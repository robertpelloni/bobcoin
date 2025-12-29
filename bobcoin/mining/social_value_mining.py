"""
Social Value Mining - Bobcoin's unique consensus mechanism.

Instead of Proof of Work or Proof of Stake, Bobcoin uses Proof of Social Value.
Participants earn mining rewards by contributing to healthy social activities:
- Exercise and physical health
- Social interactions and community building
- Healthy relationships and friendships
"""

import hashlib
import time
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict


@dataclass
class SocialValueProof:
    """
    Proof of social value contribution.
    
    This is what replaces traditional mining proofs in Bobcoin.
    """
    
    # Activity categories
    exercise_score: float = 0.0  # Physical health contribution
    social_score: float = 0.0  # Social interaction contribution
    relationship_score: float = 0.0  # Relationship health contribution
    
    # Proof details
    timestamp: float = 0.0
    participant_id: str = ""
    
    # Verification data
    exercise_proofs: List[Dict[str, Any]] = None
    social_proofs: List[Dict[str, Any]] = None
    relationship_proofs: List[Dict[str, Any]] = None
    
    # Gaming integration
    game_activities: List[Dict[str, Any]] = None
    
    # Anti-hoarding metrics
    velocity_score: float = 0.0  # Rewards spending/circulation
    distribution_score: float = 0.0  # Rewards fair distribution
    
    def __post_init__(self):
        """Initialize default values."""
        if self.exercise_proofs is None:
            self.exercise_proofs = []
        if self.social_proofs is None:
            self.social_proofs = []
        if self.relationship_proofs is None:
            self.relationship_proofs = []
        if self.game_activities is None:
            self.game_activities = []
        if self.timestamp == 0.0:
            self.timestamp = time.time()
    
    def calculate_total_score(self) -> float:
        """
        Calculate total social value score.
        
        Returns:
            Total score (0.0 to 100.0)
        """
        # Weight different contribution types
        weights = {
            "exercise": 0.25,
            "social": 0.25,
            "relationship": 0.25,
            "velocity": 0.15,
            "distribution": 0.10
        }
        
        total = (
            self.exercise_score * weights["exercise"] +
            self.social_score * weights["social"] +
            self.relationship_score * weights["relationship"] +
            self.velocity_score * weights["velocity"] +
            self.distribution_score * weights["distribution"]
        )
        
        return min(total, 100.0)
    
    def is_valid(self) -> bool:
        """
        Validate the proof.
        
        Returns:
            True if proof is valid
        """
        # Check score bounds
        if not (0 <= self.exercise_score <= 100):
            return False
        if not (0 <= self.social_score <= 100):
            return False
        if not (0 <= self.relationship_score <= 100):
            return False
        
        # Check timestamp is reasonable
        current_time = time.time()
        if self.timestamp > current_time or self.timestamp < current_time - 86400:
            return False
        
        # Check participant ID
        if not self.participant_id:
            return False
        
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)
    
    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "SocialValueProof":
        """Create from dictionary."""
        return SocialValueProof(**data)


class SocialValueMiner:
    """
    Social Value Miner - replaces traditional miners.
    
    Instead of solving cryptographic puzzles, participants prove their
    contribution to healthy social activities.
    """
    
    # Mining thresholds
    MIN_SCORE_TO_MINE = 25.0  # Minimum score needed to create a block
    TARGET_SCORE = 75.0  # Target score for optimal rewards
    
    def __init__(self, participant_id: str):
        """
        Initialize a social value miner.
        
        Args:
            participant_id: Unique identifier for this participant
        """
        self.participant_id = participant_id
        self.current_proof = SocialValueProof(participant_id=participant_id)
    
    def add_exercise_proof(self, proof: Dict[str, Any]) -> None:
        """
        Add exercise activity proof.
        
        Args:
            proof: Exercise proof data
        """
        self.current_proof.exercise_proofs.append(proof)
        self._recalculate_exercise_score()
    
    def add_social_proof(self, proof: Dict[str, Any]) -> None:
        """
        Add social interaction proof.
        
        Args:
            proof: Social interaction proof data
        """
        self.current_proof.social_proofs.append(proof)
        self._recalculate_social_score()
    
    def add_relationship_proof(self, proof: Dict[str, Any]) -> None:
        """
        Add relationship health proof.
        
        Args:
            proof: Relationship health proof data
        """
        self.current_proof.relationship_proofs.append(proof)
        self._recalculate_relationship_score()
    
    def add_game_activity(self, activity: Dict[str, Any]) -> None:
        """
        Add game activity (music game, exercise game, dating app, MMORPG).
        
        Args:
            activity: Game activity data
        """
        self.current_proof.game_activities.append(activity)
        self._recalculate_scores_from_games()
    
    def _recalculate_exercise_score(self) -> None:
        """Recalculate exercise score from proofs."""
        if not self.current_proof.exercise_proofs:
            self.current_proof.exercise_score = 0.0
            return
        
        total_score = 0.0
        for proof in self.current_proof.exercise_proofs:
            # Exercise duration and intensity
            duration = proof.get("duration_minutes", 0)
            intensity = proof.get("intensity", 1.0)  # 0.5-2.0 multiplier
            
            # Base score from duration (max 100 for 60 minutes)
            score = min(duration * 1.67, 100.0) * intensity
            total_score += score
        
        # Average score, capped at 100
        self.current_proof.exercise_score = min(
            total_score / len(self.current_proof.exercise_proofs),
            100.0
        )
    
    def _recalculate_social_score(self) -> None:
        """Recalculate social interaction score from proofs."""
        if not self.current_proof.social_proofs:
            self.current_proof.social_score = 0.0
            return
        
        total_score = 0.0
        for proof in self.current_proof.social_proofs:
            # Quality interactions (not just quantity)
            interaction_quality = proof.get("quality", 0.5)  # 0.0-1.0
            duration = proof.get("duration_minutes", 0)
            participant_count = proof.get("participants", 1)
            
            # Score based on quality, duration, and group size
            score = (
                interaction_quality * 50 +
                min(duration * 0.5, 30) +
                min(participant_count * 5, 20)
            )
            total_score += score
        
        self.current_proof.social_score = min(
            total_score / len(self.current_proof.social_proofs),
            100.0
        )
    
    def _recalculate_relationship_score(self) -> None:
        """Recalculate relationship health score from proofs."""
        if not self.current_proof.relationship_proofs:
            self.current_proof.relationship_score = 0.0
            return
        
        total_score = 0.0
        for proof in self.current_proof.relationship_proofs:
            # Healthy relationship indicators
            communication_quality = proof.get("communication_quality", 0.5)  # 0.0-1.0
            mutual_support = proof.get("mutual_support", 0.5)  # 0.0-1.0
            relationship_duration = proof.get("duration_days", 0)
            
            # Score based on relationship health indicators
            score = (
                communication_quality * 40 +
                mutual_support * 40 +
                min(relationship_duration * 0.05, 20)  # Long-term bonus
            )
            total_score += score
        
        self.current_proof.relationship_score = min(
            total_score / len(self.current_proof.relationship_proofs),
            100.0
        )
    
    def _recalculate_scores_from_games(self) -> None:
        """Update scores based on game activities."""
        for activity in self.current_proof.game_activities:
            game_type = activity.get("game_type", "")
            
            if game_type == "exercise_game":
                # Exercise games contribute to exercise score
                self.add_exercise_proof({
                    "duration_minutes": activity.get("duration", 0),
                    "intensity": activity.get("intensity", 1.0),
                    "source": "exercise_game"
                })
            
            elif game_type == "music_game":
                # Music games can contribute to social score if multiplayer
                if activity.get("multiplayer", False):
                    self.add_social_proof({
                        "quality": 0.7,
                        "duration_minutes": activity.get("duration", 0),
                        "participants": activity.get("players", 1),
                        "source": "music_game"
                    })
            
            elif game_type == "dating_app":
                # Dating app contributes to relationship score
                self.add_relationship_proof({
                    "communication_quality": activity.get("interaction_quality", 0.5),
                    "mutual_support": activity.get("match_quality", 0.5),
                    "duration_days": activity.get("conversation_days", 0),
                    "source": "dating_app"
                })
            
            elif game_type == "mmorpg":
                # MMORPG contributes to social score
                self.add_social_proof({
                    "quality": activity.get("cooperation_score", 0.6),
                    "duration_minutes": activity.get("session_duration", 0),
                    "participants": activity.get("party_size", 1),
                    "source": "mmorpg"
                })
    
    def set_velocity_score(self, velocity: float) -> None:
        """
        Set velocity score (anti-hoarding).
        
        Args:
            velocity: Transaction velocity metric (0-100)
        """
        self.current_proof.velocity_score = min(max(velocity, 0.0), 100.0)
    
    def set_distribution_score(self, distribution: float) -> None:
        """
        Set distribution score (anti-classism).
        
        Args:
            distribution: Distribution fairness metric (0-100)
        """
        self.current_proof.distribution_score = min(max(distribution, 0.0), 100.0)
    
    def can_mine(self) -> bool:
        """
        Check if participant has sufficient social value to mine.
        
        Returns:
            True if can mine
        """
        total_score = self.current_proof.calculate_total_score()
        return total_score >= self.MIN_SCORE_TO_MINE
    
    def get_mining_reward_multiplier(self) -> float:
        """
        Calculate reward multiplier based on social value score.
        
        Returns:
            Reward multiplier (0.5 to 2.0)
        """
        total_score = self.current_proof.calculate_total_score()
        
        if total_score < self.MIN_SCORE_TO_MINE:
            return 0.0
        
        # Linear multiplier from 0.5x to 2.0x based on score
        # Score of 25 = 0.5x, Score of 75 = 2.0x
        multiplier = 0.5 + (total_score / 75.0) * 1.5
        return min(multiplier, 2.0)
    
    def create_proof(self) -> SocialValueProof:
        """
        Finalize and return the current social value proof.
        
        Returns:
            Social value proof
        """
        self.current_proof.timestamp = time.time()
        return self.current_proof
    
    def reset_proof(self) -> None:
        """Reset to start accumulating a new proof."""
        self.current_proof = SocialValueProof(participant_id=self.participant_id)
