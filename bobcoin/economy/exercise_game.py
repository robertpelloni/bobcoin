"""
Exercise game integration for Bobcoin economy.

Enables exercise games to reward players with Bobcoin for:
- Physical activity
- Fitness achievements
- Consistency
- Group challenges
"""

from typing import Dict, Any, List, Optional
import time


class ExerciseGameIntegration:
    """
    Exercise game integration for Bobcoin economy.

    Rewards physical activity tracked through games and fitness applications.
    """

    # Exercise types with calorie multipliers
    EXERCISE_TYPES = {
        "running": {"calories_per_min": 10, "intensity": 1.2},
        "walking": {"calories_per_min": 4, "intensity": 0.8},
        "cycling": {"calories_per_min": 8, "intensity": 1.0},
        "dancing": {"calories_per_min": 7, "intensity": 1.1},
        "boxing": {"calories_per_min": 12, "intensity": 1.3},
        "yoga": {"calories_per_min": 3, "intensity": 0.9},
        "sports": {"calories_per_min": 9, "intensity": 1.2},
    }

    def __init__(self, blockchain):
        """
        Initialize exercise game integration.

        Args:
            blockchain: Bobcoin blockchain instance
        """
        self.blockchain = blockchain
        self.player_activities: Dict[str, List[Dict[str, Any]]] = {}
        self.challenges: List[Dict[str, Any]] = []

    def record_activity(
        self,
        player_address: str,
        exercise_type: str,
        duration_minutes: int,
        calories_burned: Optional[int] = None,
        heart_rate_avg: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Record an exercise activity.

        Args:
            player_address: Player's Bobcoin address
            exercise_type: Type of exercise
            duration_minutes: Duration in minutes
            calories_burned: Calories burned (optional)
            heart_rate_avg: Average heart rate (optional)

        Returns:
            Activity record with reward
        """
        if exercise_type not in self.EXERCISE_TYPES:
            return {"success": False, "reason": "Unknown exercise type"}

        # Calculate or use provided calories
        if calories_burned is None:
            calories_per_min = self.EXERCISE_TYPES[exercise_type]["calories_per_min"]
            calories_burned = duration_minutes * calories_per_min

        # Calculate reward
        reward = self._calculate_reward(
            exercise_type,
            duration_minutes,
            calories_burned,
            heart_rate_avg
        )

        # Create activity record
        activity = {
            "player_address": player_address,
            "exercise_type": exercise_type,
            "duration_minutes": duration_minutes,
            "calories_burned": calories_burned,
            "heart_rate_avg": heart_rate_avg,
            "reward": reward,
            "timestamp": time.time(),
            "verified": True
        }

        # Store activity
        if player_address not in self.player_activities:
            self.player_activities[player_address] = []
        self.player_activities[player_address].append(activity)

        return {
            "success": True,
            "activity": activity,
            "total_activities": len(self.player_activities[player_address])
        }

    def create_challenge(
        self,
        challenge_name: str,
        challenge_type: str,
        goal: int,
        duration_days: int,
        reward_pool: float
    ) -> Dict[str, Any]:
        """
        Create a group fitness challenge.

        Args:
            challenge_name: Name of the challenge
            challenge_type: Type (steps, calories, duration, etc.)
            goal: Goal to achieve
            duration_days: Challenge duration
            reward_pool: Total rewards for participants

        Returns:
            Challenge details
        """
        challenge = {
            "name": challenge_name,
            "type": challenge_type,
            "goal": goal,
            "duration_days": duration_days,
            "reward_pool": reward_pool,
            "participants": [],
            "start_time": time.time(),
            "status": "active"
        }

        self.challenges.append(challenge)
        return challenge

    def join_challenge(
        self,
        player_address: str,
        challenge_name: str
    ) -> Dict[str, Any]:
        """
        Join a fitness challenge.

        Args:
            player_address: Player's address
            challenge_name: Challenge to join

        Returns:
            Join result
        """
        challenge = self._find_challenge(challenge_name)

        if not challenge:
            return {"success": False, "reason": "Challenge not found"}

        if challenge["status"] != "active":
            return {"success": False, "reason": "Challenge not active"}

        if player_address in challenge["participants"]:
            return {"success": False, "reason": "Already joined"}

        challenge["participants"].append(player_address)

        return {
            "success": True,
            "challenge": challenge_name,
            "participants": len(challenge["participants"])
        }

    def _calculate_reward(
        self,
        exercise_type: str,
        duration_minutes: int,
        calories_burned: int,
        heart_rate_avg: Optional[int]
    ) -> float:
        """Calculate reward for exercise activity."""
        exercise_data = self.EXERCISE_TYPES[exercise_type]
        intensity = exercise_data["intensity"]

        # Base reward from duration and intensity
        duration_reward = (duration_minutes / 30.0) * 5.0 * intensity

        # Calorie bonus
        calorie_bonus = (calories_burned / 100.0) * 2.0

        # Heart rate intensity bonus
        hr_bonus = 0.0
        if heart_rate_avg:
            if 120 <= heart_rate_avg <= 150:  # Moderate intensity
                hr_bonus = 2.0
            elif heart_rate_avg > 150:  # High intensity
                hr_bonus = 3.0

        total_reward = duration_reward + calorie_bonus + hr_bonus
        return min(total_reward, 20.0)  # Cap at 20 Bobcoin per session

    def _find_challenge(self, challenge_name: str) -> Optional[Dict[str, Any]]:
        """Find challenge by name."""
        for challenge in self.challenges:
            if challenge["name"] == challenge_name:
                return challenge
        return None

    def get_player_stats(self, player_address: str) -> Dict[str, Any]:
        """Get player exercise statistics."""
        activities = self.player_activities.get(player_address, [])

        if not activities:
            return {
                "total_activities": 0,
                "total_duration_minutes": 0,
                "total_calories": 0,
                "total_rewards": 0.0
            }

        return {
            "total_activities": len(activities),
            "total_duration_minutes": sum(a.get("duration_minutes", 0) for a in activities),
            "total_calories": sum(a.get("calories_burned", 0) for a in activities),
            "total_rewards": sum(a.get("reward", 0) for a in activities),
            "activities_by_type": self._group_activities_by_type(activities),
            "active_challenges": self._get_player_challenges(player_address)
        }

    def _group_activities_by_type(self, activities: List[Dict[str, Any]]) -> Dict[str, int]:
        """Group activities by type."""
        grouped = {}
        for activity in activities:
            ex_type = activity.get("exercise_type", "unknown")
            grouped[ex_type] = grouped.get(ex_type, 0) + 1
        return grouped

    def _get_player_challenges(self, player_address: str) -> List[str]:
        """Get challenges player is participating in."""
        return [
            c["name"] for c in self.challenges
            if player_address in c["participants"] and c["status"] == "active"
        ]

    def get_consistency_bonus(self, player_address: str, days: int = 7) -> float:
        """
        Calculate consistency bonus for regular exercise.

        Args:
            player_address: Player's address
            days: Number of days to check

        Returns:
            Bonus multiplier
        """
        activities = self.player_activities.get(player_address, [])
        if not activities:
            return 0.0

        # Check activity in last N days
        current_time = time.time()
        cutoff_time = current_time - (days * 86400)

        recent_activities = [
            a for a in activities
            if a.get("timestamp", 0) >= cutoff_time
        ]

        # Bonus based on frequency
        if len(recent_activities) >= days:
            return 2.0  # 2x bonus for daily activity
        elif len(recent_activities) >= days // 2:
            return 1.5  # 1.5x bonus for regular activity
        elif len(recent_activities) >= days // 4:
            return 1.2  # 1.2x bonus for some activity

        return 1.0  # No bonus
