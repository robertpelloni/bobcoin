"""
Relationship health verification system for Bobcoin.

Verifies healthy adult relationships and friendships for mining rewards.
"""

import hashlib
import time
from typing import Dict, Any, List, Optional


class RelationshipHealthVerifier:
    """
    Verifies healthy relationship activities for social value mining.
    
    Rewards positive relationship behaviors:
    - Healthy communication
    - Mutual support
    - Long-term commitment
    - Emotional intelligence
    """
    
    # Relationship types and base multipliers
    RELATIONSHIP_TYPES = {
        "close_friendship": 1.2,
        "romantic_relationship": 1.5,
        "family_relationship": 1.3,
        "mentor_mentee": 1.4,
        "professional_friendship": 1.0,
        "community_connection": 0.9,
    }
    
    # Health indicators
    HEALTH_INDICATORS = [
        "healthy_communication",
        "mutual_respect",
        "emotional_support",
        "shared_activities",
        "conflict_resolution",
        "trust_building",
        "personal_growth",
        "work_life_balance"
    ]
    
    def __init__(self):
        """Initialize relationship health verifier."""
        self.verified_relationships: List[Dict[str, Any]] = []
    
    def verify_relationship_activity(
        self,
        relationship_type: str,
        duration_days: int,
        health_indicators: List[str],
        communication_quality: float = 0.5,
        mutual_support: float = 0.5,
        proof_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Verify a relationship health activity.
        
        Args:
            relationship_type: Type of relationship
            duration_days: Duration of relationship in days
            health_indicators: List of present health indicators
            communication_quality: Quality of communication (0.0-1.0)
            mutual_support: Level of mutual support (0.0-1.0)
            proof_data: Optional proof data
            
        Returns:
            Verification result
        """
        # Validate relationship type
        if relationship_type not in self.RELATIONSHIP_TYPES:
            return {
                "verified": False,
                "reason": f"Unknown relationship type: {relationship_type}"
            }
        
        # Validate parameters
        if duration_days < 0:
            return {
                "verified": False,
                "reason": "Invalid duration"
            }
        
        if not (0.0 <= communication_quality <= 1.0):
            return {
                "verified": False,
                "reason": "Communication quality must be between 0 and 1"
            }
        
        if not (0.0 <= mutual_support <= 1.0):
            return {
                "verified": False,
                "reason": "Mutual support must be between 0 and 1"
            }
        
        # Validate health indicators
        valid_indicators = [ind for ind in health_indicators if ind in self.HEALTH_INDICATORS]
        if len(valid_indicators) == 0:
            return {
                "verified": False,
                "reason": "No valid health indicators provided"
            }
        
        # Calculate score
        type_multiplier = self.RELATIONSHIP_TYPES[relationship_type]
        
        # Communication and support score (40% weight)
        communication_score = communication_quality * 20
        support_score = mutual_support * 20
        
        # Health indicators score (40% weight)
        indicator_score = (len(valid_indicators) / len(self.HEALTH_INDICATORS)) * 40
        
        # Duration bonus (20% weight, capped)
        duration_bonus = min(duration_days * 0.05, 20)
        
        base_score = (
            communication_score +
            support_score +
            indicator_score +
            duration_bonus
        ) * type_multiplier
        
        # Verify proof if provided
        proof_verified = self._verify_proof(proof_data) if proof_data else True
        
        if not proof_verified:
            return {
                "verified": False,
                "reason": "Proof verification failed"
            }
        
        # Create verified relationship record
        relationship_record = {
            "verified": True,
            "relationship_type": relationship_type,
            "duration_days": duration_days,
            "health_indicators": valid_indicators,
            "communication_quality": communication_quality,
            "mutual_support": mutual_support,
            "score": base_score,
            "timestamp": time.time(),
            "proof_hash": self._hash_proof(proof_data) if proof_data else None
        }
        
        self.verified_relationships.append(relationship_record)
        return relationship_record
    
    def _verify_proof(self, proof_data: Dict[str, Any]) -> bool:
        """
        Verify relationship health proof.
        
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
            "dating_app",
            "relationship_app",
            "therapy_app",
            "manual_verification",
            "mutual_confirmation"
        ]
        if proof_data.get("source") not in valid_sources:
            return False
        
        # For relationship proofs, require mutual confirmation
        if proof_data.get("source") in ["dating_app", "relationship_app"]:
            if not proof_data.get("mutually_confirmed"):
                return False
        
        return True
    
    def _hash_proof(self, proof_data: Optional[Dict[str, Any]]) -> str:
        """Generate hash of proof data."""
        if not proof_data:
            return ""
        
        proof_string = str(sorted(proof_data.items()))
        return hashlib.sha256(proof_string.encode()).hexdigest()
    
    def get_total_relationship_score(self) -> float:
        """
        Calculate total relationship health score.
        
        Returns:
            Total score (0-100)
        """
        if not self.verified_relationships:
            return 0.0
        
        total_score = sum(rel.get("score", 0) for rel in self.verified_relationships)
        # Normalize to 0-100 scale
        return min(total_score / len(self.verified_relationships), 100.0)
    
    def get_relationship_summary(self) -> Dict[str, Any]:
        """Get summary of verified relationships."""
        return {
            "total_relationships": len(self.verified_relationships),
            "average_duration_days": self._calculate_average_duration(),
            "average_communication_quality": self._calculate_average_communication(),
            "average_mutual_support": self._calculate_average_support(),
            "total_score": self.get_total_relationship_score(),
            "relationships_by_type": self._group_by_type(),
            "common_health_indicators": self._get_common_indicators()
        }
    
    def _calculate_average_duration(self) -> float:
        """Calculate average relationship duration."""
        if not self.verified_relationships:
            return 0.0
        
        total_duration = sum(
            rel.get("duration_days", 0) for rel in self.verified_relationships
        )
        return total_duration / len(self.verified_relationships)
    
    def _calculate_average_communication(self) -> float:
        """Calculate average communication quality."""
        if not self.verified_relationships:
            return 0.0
        
        total_quality = sum(
            rel.get("communication_quality", 0) for rel in self.verified_relationships
        )
        return total_quality / len(self.verified_relationships)
    
    def _calculate_average_support(self) -> float:
        """Calculate average mutual support."""
        if not self.verified_relationships:
            return 0.0
        
        total_support = sum(
            rel.get("mutual_support", 0) for rel in self.verified_relationships
        )
        return total_support / len(self.verified_relationships)
    
    def _group_by_type(self) -> Dict[str, int]:
        """Group relationships by type."""
        grouped = {}
        for relationship in self.verified_relationships:
            rel_type = relationship.get("relationship_type", "unknown")
            grouped[rel_type] = grouped.get(rel_type, 0) + 1
        return grouped
    
    def _get_common_indicators(self) -> Dict[str, int]:
        """Get most common health indicators."""
        indicator_counts = {}
        for relationship in self.verified_relationships:
            for indicator in relationship.get("health_indicators", []):
                indicator_counts[indicator] = indicator_counts.get(indicator, 0) + 1
        return indicator_counts
