"""
MMORPG integration for Bobcoin economy.

Enables retro MMORPGs to use Bobcoin for:
- In-game economy
- Trading between players
- Quest rewards
- Guild activities
- Player-driven marketplace
"""

from typing import Dict, Any, List, Optional
import time


class MMORPGIntegration:
    """
    MMORPG integration for Bobcoin economy.
    
    Creates a player-driven economy for retro MMORPGs with social incentives.
    """
    
    # Activity rewards
    ACTIVITY_REWARDS = {
        "quest_completion": 2.0,
        "boss_defeat": 5.0,
        "dungeon_clear": 3.0,
        "guild_activity": 2.5,
        "player_trade": 0.5,
        "helping_newbie": 3.0,
        "crafting": 1.0,
        "exploration": 1.5,
    }
    
    def __init__(self, blockchain):
        """
        Initialize MMORPG integration.
        
        Args:
            blockchain: Bobcoin blockchain instance
        """
        self.blockchain = blockchain
        self.player_activities: Dict[str, List[Dict[str, Any]]] = {}
        self.guilds: List[Dict[str, Any]] = []
        self.marketplace_items: List[Dict[str, Any]] = []
    
    def record_activity(
        self,
        player_address: str,
        activity_type: str,
        party_size: int = 1,
        cooperation_score: float = 0.5,
        difficulty: str = "normal"
    ) -> Dict[str, Any]:
        """
        Record an MMORPG activity.
        
        Args:
            player_address: Player's Bobcoin address
            activity_type: Type of activity
            party_size: Number of players in party
            cooperation_score: How well players cooperated (0.0-1.0)
            difficulty: Activity difficulty (easy, normal, hard, extreme)
            
        Returns:
            Activity record with reward
        """
        if activity_type not in self.ACTIVITY_REWARDS:
            return {"success": False, "reason": "Unknown activity type"}
        
        # Calculate reward
        base_reward = self.ACTIVITY_REWARDS[activity_type]
        
        # Party multiplier (encourage group play)
        party_multiplier = 1.0 + (party_size - 1) * 0.2  # +20% per additional player
        party_multiplier = min(party_multiplier, 2.0)  # Cap at 2x
        
        # Cooperation bonus
        cooperation_multiplier = 0.5 + (cooperation_score * 0.5)  # 0.5-1.0
        
        # Difficulty multiplier
        difficulty_multipliers = {
            "easy": 0.8,
            "normal": 1.0,
            "hard": 1.5,
            "extreme": 2.0
        }
        difficulty_multiplier = difficulty_multipliers.get(difficulty, 1.0)
        
        total_reward = (
            base_reward *
            party_multiplier *
            cooperation_multiplier *
            difficulty_multiplier
        )
        
        # Create activity record
        activity = {
            "player_address": player_address,
            "activity_type": activity_type,
            "party_size": party_size,
            "cooperation_score": cooperation_score,
            "difficulty": difficulty,
            "reward": total_reward,
            "timestamp": time.time(),
            "social_value": self._calculate_social_value(party_size, cooperation_score)
        }
        
        # Store activity
        if player_address not in self.player_activities:
            self.player_activities[player_address] = []
        self.player_activities[player_address].append(activity)
        
        return {
            "success": True,
            "activity": activity
        }
    
    def create_guild(
        self,
        guild_name: str,
        founder_address: str,
        guild_type: str = "general"
    ) -> Dict[str, Any]:
        """
        Create a guild.
        
        Args:
            guild_name: Name of the guild
            founder_address: Founder's address
            guild_type: Type of guild (raiding, social, trading, etc.)
            
        Returns:
            Guild details
        """
        guild = {
            "name": guild_name,
            "founder": founder_address,
            "type": guild_type,
            "members": [founder_address],
            "treasury": 0.0,
            "activities": [],
            "created_at": time.time()
        }
        
        self.guilds.append(guild)
        
        return {
            "success": True,
            "guild": guild
        }
    
    def join_guild(
        self,
        player_address: str,
        guild_name: str
    ) -> Dict[str, Any]:
        """
        Join a guild.
        
        Args:
            player_address: Player's address
            guild_name: Guild to join
            
        Returns:
            Join result
        """
        guild = self._find_guild(guild_name)
        
        if not guild:
            return {"success": False, "reason": "Guild not found"}
        
        if player_address in guild["members"]:
            return {"success": False, "reason": "Already a member"}
        
        guild["members"].append(player_address)
        
        return {
            "success": True,
            "guild": guild_name,
            "members": len(guild["members"])
        }
    
    def list_item(
        self,
        seller_address: str,
        item_name: str,
        price: float,
        quantity: int = 1
    ) -> Dict[str, Any]:
        """
        List an item on the marketplace.
        
        Args:
            seller_address: Seller's address
            item_name: Name of the item
            price: Price in Bobcoin
            quantity: Number of items
            
        Returns:
            Listing details
        """
        listing = {
            "seller": seller_address,
            "item_name": item_name,
            "price": price,
            "quantity": quantity,
            "listed_at": time.time(),
            "status": "active"
        }
        
        self.marketplace_items.append(listing)
        
        return {
            "success": True,
            "listing": listing
        }
    
    def buy_item(
        self,
        buyer_address: str,
        item_name: str,
        seller_address: str
    ) -> Dict[str, Any]:
        """
        Buy an item from the marketplace.
        
        Args:
            buyer_address: Buyer's address
            item_name: Item to buy
            seller_address: Seller's address
            
        Returns:
            Purchase result
        """
        listing = self._find_listing(item_name, seller_address)
        
        if not listing:
            return {"success": False, "reason": "Listing not found"}
        
        if listing["status"] != "active":
            return {"success": False, "reason": "Listing not available"}
        
        # Check buyer balance
        balance = self.blockchain.get_balance(buyer_address)
        if balance < listing["price"]:
            return {"success": False, "reason": "Insufficient balance"}
        
        # Mark listing as sold
        listing["status"] = "sold"
        listing["buyer"] = buyer_address
        listing["sold_at"] = time.time()
        
        # Small transaction reward (encourages economy activity)
        transaction_reward = self.ACTIVITY_REWARDS["player_trade"]
        
        return {
            "success": True,
            "item": item_name,
            "price": listing["price"],
            "transaction_reward": transaction_reward
        }
    
    def _calculate_social_value(self, party_size: int, cooperation_score: float) -> float:
        """Calculate social value contribution."""
        if party_size <= 1:
            return 0.0
        
        # Base social value for group activity
        social_value = 20.0 * cooperation_score
        
        # Bonus for larger groups
        social_value += (party_size - 1) * 5.0
        
        return min(social_value, 50.0)
    
    def _find_guild(self, guild_name: str) -> Optional[Dict[str, Any]]:
        """Find guild by name."""
        for guild in self.guilds:
            if guild["name"] == guild_name:
                return guild
        return None
    
    def _find_listing(
        self,
        item_name: str,
        seller_address: str
    ) -> Optional[Dict[str, Any]]:
        """Find marketplace listing."""
        for listing in self.marketplace_items:
            if (listing["item_name"] == item_name and
                listing["seller"] == seller_address and
                listing["status"] == "active"):
                return listing
        return None
    
    def get_player_stats(self, player_address: str) -> Dict[str, Any]:
        """Get player MMORPG statistics."""
        activities = self.player_activities.get(player_address, [])
        player_guilds = [
            g["name"] for g in self.guilds
            if player_address in g["members"]
        ]
        
        return {
            "total_activities": len(activities),
            "total_rewards": sum(a.get("reward", 0) for a in activities),
            "guilds": player_guilds,
            "average_cooperation": self._calculate_avg_cooperation(activities),
            "party_activities": len([a for a in activities if a.get("party_size", 1) > 1]),
            "activities_by_type": self._group_activities_by_type(activities)
        }
    
    def _calculate_avg_cooperation(self, activities: List[Dict[str, Any]]) -> float:
        """Calculate average cooperation score."""
        if not activities:
            return 0.0
        
        scores = [a.get("cooperation_score", 0) for a in activities]
        return sum(scores) / len(scores)
    
    def _group_activities_by_type(self, activities: List[Dict[str, Any]]) -> Dict[str, int]:
        """Group activities by type."""
        grouped = {}
        for activity in activities:
            act_type = activity.get("activity_type", "unknown")
            grouped[act_type] = grouped.get(act_type, 0) + 1
        return grouped
    
    def get_marketplace_stats(self) -> Dict[str, Any]:
        """Get marketplace statistics."""
        active_listings = [l for l in self.marketplace_items if l["status"] == "active"]
        sold_listings = [l for l in self.marketplace_items if l["status"] == "sold"]
        
        return {
            "active_listings": len(active_listings),
            "total_sold": len(sold_listings),
            "total_volume": sum(l.get("price", 0) for l in sold_listings),
            "average_price": (
                sum(l.get("price", 0) for l in active_listings) / len(active_listings)
                if active_listings else 0.0
            )
        }
