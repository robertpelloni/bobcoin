"""
Dating app integration for Bobcoin economy.

Enables dating apps to reward users with Bobcoin for:
- Healthy relationship behaviors
- Quality interactions
- Long-term connections
- Respectful communication
"""

from typing import Dict, Any, List, Optional
import time


class DatingAppIntegration:
    """
    Dating app integration for Bobcoin economy.

    Rewards healthy relationship formation and maintenance.
    """

    # Interaction quality metrics
    INTERACTION_REWARDS = {
        "first_message": 0.5,
        "meaningful_conversation": 2.0,
        "video_call": 3.0,
        "in_person_meeting": 5.0,
        "ongoing_conversation": 1.5,
    }

    # Relationship milestone rewards
    MILESTONE_REWARDS = {
        "matched": 0.5,
        "week_connection": 5.0,
        "month_connection": 15.0,
        "three_month_connection": 40.0,
        "six_month_connection": 80.0,
        "year_connection": 150.0,
    }

    def __init__(self, blockchain):
        """
        Initialize dating app integration.

        Args:
            blockchain: Bobcoin blockchain instance
        """
        self.blockchain = blockchain
        self.user_interactions: Dict[str, List[Dict[str, Any]]] = {}
        self.connections: List[Dict[str, Any]] = []

    def record_interaction(
        self,
        user_address: str,
        interaction_type: str,
        quality_score: float = 0.5,
        duration_minutes: Optional[int] = None,
        mutual_rating: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Record a dating app interaction.

        Args:
            user_address: User's Bobcoin address
            interaction_type: Type of interaction
            quality_score: Quality of interaction (0.0-1.0)
            duration_minutes: Duration of interaction
            mutual_rating: Mutual satisfaction rating (0.0-1.0)

        Returns:
            Interaction record with reward
        """
        if interaction_type not in self.INTERACTION_REWARDS:
            return {"success": False, "reason": "Unknown interaction type"}

        # Calculate reward
        base_reward = self.INTERACTION_REWARDS[interaction_type]
        quality_multiplier = 0.5 + (quality_score * 0.5)  # 0.5-1.0

        reward = base_reward * quality_multiplier

        # Duration bonus for conversations
        if duration_minutes and duration_minutes > 10:
            duration_bonus = min((duration_minutes - 10) * 0.1, 5.0)
            reward += duration_bonus

        # Mutual rating bonus
        if mutual_rating and mutual_rating > 0.7:
            reward *= 1.5

        # Create interaction record
        interaction = {
            "user_address": user_address,
            "interaction_type": interaction_type,
            "quality_score": quality_score,
            "duration_minutes": duration_minutes,
            "mutual_rating": mutual_rating,
            "reward": reward,
            "timestamp": time.time()
        }

        # Store interaction
        if user_address not in self.user_interactions:
            self.user_interactions[user_address] = []
        self.user_interactions[user_address].append(interaction)

        return {
            "success": True,
            "interaction": interaction
        }

    def create_connection(
        self,
        user1_address: str,
        user2_address: str,
        connection_type: str = "dating"
    ) -> Dict[str, Any]:
        """
        Create a connection between two users.

        Args:
            user1_address: First user's address
            user2_address: Second user's address
            connection_type: Type of connection (dating, friendship, etc.)

        Returns:
            Connection details
        """
        connection = {
            "user1": user1_address,
            "user2": user2_address,
            "type": connection_type,
            "start_time": time.time(),
            "status": "active",
            "milestones": ["matched"],
            "health_score": 0.5
        }

        self.connections.append(connection)

        # Award initial connection reward
        reward = self.MILESTONE_REWARDS["matched"]

        return {
            "success": True,
            "connection": connection,
            "reward": reward
        }

    def update_connection_health(
        self,
        user1_address: str,
        user2_address: str,
        health_indicators: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Update connection health metrics.

        Args:
            user1_address: First user's address
            user2_address: Second user's address
            health_indicators: Health metrics (communication, respect, support, etc.)

        Returns:
            Updated connection with potential milestone rewards
        """
        connection = self._find_connection(user1_address, user2_address)

        if not connection:
            return {"success": False, "reason": "Connection not found"}

        # Calculate health score
        health_score = sum(health_indicators.values()) / len(health_indicators)
        connection["health_score"] = health_score

        # Check for time-based milestones
        duration_days = (time.time() - connection["start_time"]) / 86400
        new_milestones = []
        total_reward = 0.0

        if duration_days >= 7 and "week_connection" not in connection["milestones"]:
            new_milestones.append("week_connection")
            total_reward += self.MILESTONE_REWARDS["week_connection"]

        if duration_days >= 30 and "month_connection" not in connection["milestones"]:
            new_milestones.append("month_connection")
            total_reward += self.MILESTONE_REWARDS["month_connection"]

        if duration_days >= 90 and "three_month_connection" not in connection["milestones"]:
            new_milestones.append("three_month_connection")
            total_reward += self.MILESTONE_REWARDS["three_month_connection"]

        if duration_days >= 180 and "six_month_connection" not in connection["milestones"]:
            new_milestones.append("six_month_connection")
            total_reward += self.MILESTONE_REWARDS["six_month_connection"]

        if duration_days >= 365 and "year_connection" not in connection["milestones"]:
            new_milestones.append("year_connection")
            total_reward += self.MILESTONE_REWARDS["year_connection"]

        # Add new milestones
        connection["milestones"].extend(new_milestones)

        # Health bonus for high-quality relationships
        if health_score > 0.8:
            total_reward *= 1.5

        return {
            "success": True,
            "connection": connection,
            "new_milestones": new_milestones,
            "reward": total_reward,
            "health_score": health_score
        }

    def _find_connection(
        self,
        user1_address: str,
        user2_address: str
    ) -> Optional[Dict[str, Any]]:
        """Find connection between two users."""
        for conn in self.connections:
            if ((conn["user1"] == user1_address and conn["user2"] == user2_address) or
                (conn["user1"] == user2_address and conn["user2"] == user1_address)):
                return conn
        return None

    def get_user_stats(self, user_address: str) -> Dict[str, Any]:
        """Get user dating app statistics."""
        interactions = self.user_interactions.get(user_address, [])
        user_connections = [
            c for c in self.connections
            if user_address in [c["user1"], c["user2"]]
        ]

        return {
            "total_interactions": len(interactions),
            "total_rewards": sum(i.get("reward", 0) for i in interactions),
            "active_connections": len([c for c in user_connections if c["status"] == "active"]),
            "average_interaction_quality": self._calculate_avg_quality(interactions),
            "connection_health_avg": self._calculate_avg_connection_health(user_connections),
            "milestones_achieved": self._count_milestones(user_connections)
        }

    def _calculate_avg_quality(self, interactions: List[Dict[str, Any]]) -> float:
        """Calculate average interaction quality."""
        if not interactions:
            return 0.0

        qualities = [i.get("quality_score", 0) for i in interactions]
        return sum(qualities) / len(qualities)

    def _calculate_avg_connection_health(self, connections: List[Dict[str, Any]]) -> float:
        """Calculate average connection health."""
        if not connections:
            return 0.0

        healths = [c.get("health_score", 0) for c in connections if c["status"] == "active"]
        if not healths:
            return 0.0

        return sum(healths) / len(healths)

    def _count_milestones(self, connections: List[Dict[str, Any]]) -> Dict[str, int]:
        """Count milestones achieved."""
        milestone_counts = {}
        for conn in connections:
            for milestone in conn.get("milestones", []):
                milestone_counts[milestone] = milestone_counts.get(milestone, 0) + 1
        return milestone_counts
