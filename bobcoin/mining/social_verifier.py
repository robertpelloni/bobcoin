"""
Social interaction verification system for Bobcoin.

Verifies social interactions and community building activities for mining rewards.
"""

import hashlib
import time
from typing import Dict, Any, List, Optional


class SocialInteractionVerifier:
    """
    Verifies social interaction activities for social value mining.
    
    Rewards positive social interactions while discouraging antisocial behavior.
    """
    
    # Interaction types and base scores
    INTERACTION_TYPES = {
        "in_person_conversation": 1.5,  # Highest value for real interaction
        "video_call": 1.2,
        "voice_call": 1.0,
        "text_conversation": 0.7,
        "group_activity": 1.8,
        "community_event": 2.0,
        "volunteering": 2.5,
        "mentoring": 2.2,
        "collaboration": 1.6,
        "game_multiplayer": 1.3,
    }
    
    def __init__(self):
        """Initialize social interaction verifier."""
        self.verified_interactions: List[Dict[str, Any]] = []
    
    def verify_interaction(
        self,
        interaction_type: str,
        duration_minutes: int,
        participants: int = 2,
        quality_rating: float = 0.5,
        proof_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Verify a social interaction.
        
        Args:
            interaction_type: Type of social interaction
            duration_minutes: Duration of interaction
            participants: Number of participants
            quality_rating: Quality of interaction (0.0-1.0)
            proof_data: Optional proof data
            
        Returns:
            Verification result
        """
        # Validate interaction type
        if interaction_type not in self.INTERACTION_TYPES:
            return {
                "verified": False,
                "reason": f"Unknown interaction type: {interaction_type}"
            }
        
        # Validate parameters
        if duration_minutes <= 0 or duration_minutes > 480:
            return {
                "verified": False,
                "reason": "Invalid duration"
            }
        
        if participants < 2:
            return {
                "verified": False,
                "reason": "Interaction requires at least 2 participants"
            }
        
        if not (0.0 <= quality_rating <= 1.0):
            return {
                "verified": False,
                "reason": "Quality rating must be between 0 and 1"
            }
        
        # Calculate score
        type_multiplier = self.INTERACTION_TYPES[interaction_type]
        
        # Duration score (diminishing returns after 60 min)
        duration_score = min(duration_minutes * 0.5, 30)
        
        # Participant bonus (more participants = more social value)
        participant_bonus = min(participants * 2, 20)
        
        # Quality multiplier
        quality_multiplier = 0.5 + (quality_rating * 0.5)  # 0.5-1.0
        
        base_score = (duration_score + participant_bonus) * type_multiplier * quality_multiplier
        
        # Verify proof if provided
        proof_verified = self._verify_proof(proof_data) if proof_data else True
        
        if not proof_verified:
            return {
                "verified": False,
                "reason": "Proof verification failed"
            }
        
        # Create verified interaction record
        interaction_record = {
            "verified": True,
            "interaction_type": interaction_type,
            "duration_minutes": duration_minutes,
            "participants": participants,
            "quality_rating": quality_rating,
            "score": base_score,
            "timestamp": time.time(),
            "proof_hash": self._hash_proof(proof_data) if proof_data else None
        }
        
        self.verified_interactions.append(interaction_record)
        return interaction_record
    
    def _verify_proof(self, proof_data: Dict[str, Any]) -> bool:
        """
        Verify social interaction proof.
        
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
        
        # Verify timestamp is recent
        current_time = time.time()
        proof_time = proof_data.get("timestamp", 0)
        if proof_time > current_time or proof_time < current_time - 86400:
            return False
        
        # Verify source
        valid_sources = [
            "calendar_integration",
            "dating_app",
            "mmorpg",
            "video_platform",
            "manual_verification",
            "community_app"
        ]
        if proof_data.get("source") not in valid_sources:
            return False
        
        # Additional validation based on source
        source = proof_data.get("source")
        if source in ["dating_app", "mmorpg", "video_platform"]:
            # These sources should have participant confirmation
            if not proof_data.get("participants_confirmed"):
                return False
        
        return True
    
    def _hash_proof(self, proof_data: Optional[Dict[str, Any]]) -> str:
        """Generate hash of proof data."""
        if not proof_data:
            return ""
        
        proof_string = str(sorted(proof_data.items()))
        return hashlib.sha256(proof_string.encode()).hexdigest()
    
    def get_total_social_score(self) -> float:
        """
        Calculate total social interaction score.
        
        Returns:
            Total score (0-100)
        """
        if not self.verified_interactions:
            return 0.0
        
        total_score = sum(inter.get("score", 0) for inter in self.verified_interactions)
        # Normalize to 0-100 scale
        return min(total_score / 10.0, 100.0)
    
    def get_interaction_summary(self) -> Dict[str, Any]:
        """Get summary of verified interactions."""
        return {
            "total_interactions": len(self.verified_interactions),
            "total_duration_minutes": sum(
                inter.get("duration_minutes", 0) for inter in self.verified_interactions
            ),
            "total_participants": sum(
                inter.get("participants", 0) for inter in self.verified_interactions
            ),
            "average_quality": self._calculate_average_quality(),
            "total_score": self.get_total_social_score(),
            "interactions_by_type": self._group_by_type()
        }
    
    def _calculate_average_quality(self) -> float:
        """Calculate average quality rating."""
        if not self.verified_interactions:
            return 0.0
        
        total_quality = sum(
            inter.get("quality_rating", 0) for inter in self.verified_interactions
        )
        return total_quality / len(self.verified_interactions)
    
    def _group_by_type(self) -> Dict[str, int]:
        """Group interactions by type."""
        grouped = {}
        for interaction in self.verified_interactions:
            inter_type = interaction.get("interaction_type", "unknown")
            grouped[inter_type] = grouped.get(inter_type, 0) + 1
        return grouped
