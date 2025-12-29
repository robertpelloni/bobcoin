"""
Anti-hoarding system for Bobcoin.

Implements mechanisms to discourage wealth concentration and encourage circulation.
"""

import time
from typing import Dict, Any, List, Optional


class AntiHoardingSystem:
    """
    Anti-hoarding and anti-classism mechanisms.

    Features:
    - Demurrage (holding fee) for large balances
    - Velocity rewards for active spending
    - Distribution fairness scoring
    - Wealth concentration penalties
    """

    # Configuration
    DEMURRAGE_RATE = 0.02  # 2% annual fee on held tokens
    LARGE_BALANCE_THRESHOLD = 10000  # Threshold for increased demurrage
    VELOCITY_REWARD_RATE = 0.01  # 1% bonus for high velocity
    MAX_VELOCITY_MULTIPLIER = 1.5  # Max 1.5x bonus for velocity

    def __init__(self, blockchain):
        """
        Initialize anti-hoarding system.

        Args:
            blockchain: Bobcoin blockchain instance
        """
        self.blockchain = blockchain
        self.balance_history: Dict[str, List[Dict[str, Any]]] = {}
        self.transaction_velocity: Dict[str, float] = {}

    def calculate_demurrage(
        self,
        address: str,
        balance: float,
        time_held_days: int
    ) -> float:
        """
        Calculate demurrage (holding fee) for a balance.

        Args:
            address: Account address
            balance: Current balance
            time_held_days: Days the balance has been held

        Returns:
            Demurrage amount to deduct
        """
        if balance <= 100:
            return 0.0  # No demurrage on small balances

        # Calculate annual demurrage rate
        annual_rate = self.DEMURRAGE_RATE

        # Increased rate for large balances (progressive demurrage)
        if balance > self.LARGE_BALANCE_THRESHOLD:
            excess = balance - self.LARGE_BALANCE_THRESHOLD
            # Additional 1% per 10k over threshold
            additional_rate = (excess / 10000) * 0.01
            annual_rate += min(additional_rate, 0.05)  # Cap at 7% total

        # Calculate daily rate
        daily_rate = annual_rate / 365

        # Calculate demurrage
        demurrage = balance * daily_rate * time_held_days

        return demurrage

    def calculate_velocity_score(
        self,
        address: str,
        days: int = 30
    ) -> float:
        """
        Calculate transaction velocity score.

        Higher velocity (more transactions) = better score.

        Args:
            address: Account address
            days: Time period to analyze

        Returns:
            Velocity score (0-100)
        """
        # Count transactions in time period
        tx_count = self._count_recent_transactions(address, days)

        # Calculate average daily transactions
        avg_daily_tx = tx_count / days

        # Score based on transaction frequency
        # 0 tx/day = 0, 1 tx/day = 50, 3+ tx/day = 100
        if avg_daily_tx >= 3:
            score = 100
        else:
            score = min((avg_daily_tx / 3) * 100, 100)

        self.transaction_velocity[address] = score
        return score

    def calculate_distribution_score(
        self,
        address: str
    ) -> float:
        """
        Calculate distribution fairness score.

        Rewards sending to many different recipients (not concentrating).

        Args:
            address: Account address

        Returns:
            Distribution score (0-100)
        """
        # Get transaction history
        recipients = self._get_unique_recipients(address)

        if not recipients:
            return 50.0  # Neutral score for no transactions

        # Score based on number of unique recipients
        # 1-2 = 20, 5 = 50, 10+ = 100
        if len(recipients) >= 10:
            score = 100
        else:
            score = min(20 + (len(recipients) * 8), 100)

        return score

    def apply_velocity_bonus(
        self,
        address: str,
        base_reward: float
    ) -> float:
        """
        Apply velocity bonus to a reward.

        Args:
            address: Account address
            base_reward: Base reward amount

        Returns:
            Reward with velocity bonus applied
        """
        velocity_score = self.transaction_velocity.get(address, 0)

        if velocity_score == 0:
            return base_reward

        # Calculate bonus multiplier (0-50% bonus)
        bonus_multiplier = 1.0 + (velocity_score / 100) * 0.5
        bonus_multiplier = min(bonus_multiplier, self.MAX_VELOCITY_MULTIPLIER)

        return base_reward * bonus_multiplier

    def check_wealth_concentration(self) -> Dict[str, Any]:
        """
        Check for wealth concentration in the network.

        Returns:
            Concentration metrics and warnings
        """
        # This would analyze the full blockchain
        # Simplified for this implementation

        return {
            "gini_coefficient": 0.3,  # 0 = perfect equality, 1 = maximum inequality
            "top_10_percent_holdings": 0.35,  # 35% held by top 10%
            "median_balance": 100.0,
            "concentration_level": "moderate",
            "warnings": []
        }

    def recommend_distribution(
        self,
        address: str,
        amount: float
    ) -> List[Dict[str, Any]]:
        """
        Recommend distribution strategy to improve scores.

        Args:
            address: Account address
            amount: Amount to distribute

        Returns:
            Distribution recommendations
        """
        velocity_score = self.calculate_velocity_score(address)
        distribution_score = self.calculate_distribution_score(address)

        recommendations = []

        if velocity_score < 50:
            recommendations.append({
                "type": "increase_velocity",
                "message": "Increase transaction frequency to earn velocity bonuses",
                "suggested_action": "Make regular small transactions",
                "potential_bonus": f"+{(50 - velocity_score) * 0.005:.1%}"
            })

        if distribution_score < 50:
            recommendations.append({
                "type": "diversify_recipients",
                "message": "Send to more unique recipients to improve distribution score",
                "suggested_action": f"Send to {10 - len(self._get_unique_recipients(address))} new addresses",
                "potential_bonus": "+10-20% on rewards"
            })

        balance = self.blockchain.get_balance(address)
        if balance > self.LARGE_BALANCE_THRESHOLD:
            demurrage = self.calculate_demurrage(address, balance, 30)
            recommendations.append({
                "type": "reduce_holdings",
                "message": "Large balance subject to progressive demurrage",
                "suggested_action": f"Consider spending or distributing {balance - self.LARGE_BALANCE_THRESHOLD} coins",
                "potential_savings": f"{demurrage:.2f} coins/month"
            })

        return recommendations

    def _count_recent_transactions(self, address: str, days: int) -> int:
        """Count transactions in recent period."""
        # Simplified - would query blockchain
        current_time = time.time()
        cutoff_time = current_time - (days * 86400)

        count = 0
        for block in self.blockchain.chain:
            if block.timestamp >= cutoff_time:
                for tx in block.transactions:
                    if tx.sender_public_key == address:
                        count += 1

        return count

    def _get_unique_recipients(self, address: str) -> List[str]:
        """Get list of unique recipients for an address."""
        recipients = set()

        for block in self.blockchain.chain:
            for tx in block.transactions:
                if tx.sender_public_key == address:
                    recipients.add(tx.receiver_stealth_address)

        return list(recipients)

    def get_account_health(self, address: str) -> Dict[str, Any]:
        """
        Get overall account health score.

        Args:
            address: Account address

        Returns:
            Health metrics
        """
        velocity_score = self.calculate_velocity_score(address)
        distribution_score = self.calculate_distribution_score(address)
        balance = self.blockchain.get_balance(address)

        # Calculate overall health (0-100)
        health_score = (velocity_score * 0.4 + distribution_score * 0.4)

        # Penalty for excessive hoarding
        if balance > self.LARGE_BALANCE_THRESHOLD * 2:
            health_score *= 0.8

        health_level = "excellent" if health_score >= 80 else \
                      "good" if health_score >= 60 else \
                      "fair" if health_score >= 40 else "poor"

        return {
            "health_score": health_score,
            "health_level": health_level,
            "velocity_score": velocity_score,
            "distribution_score": distribution_score,
            "balance": balance,
            "recommendations": self.recommend_distribution(address, balance * 0.1)
        }
