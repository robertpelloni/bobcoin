"""
Music game integration for Bobcoin economy.

Enables music games to reward players with Bobcoin for:
- Skill development
- Multiplayer participation
- Tournament achievements
- Community engagement
"""

from typing import Dict, Any, List, Optional


class MusicGameIntegration:
    """
    Music game integration for Bobcoin economy.
    
    Supports rhythm games, music creation games, and music-based competitions.
    """
    
    # Reward multipliers for different activities
    REWARD_MULTIPLIERS = {
        "solo_play": 1.0,
        "multiplayer_session": 1.5,
        "tournament_participation": 2.0,
        "tournament_win": 3.0,
        "song_creation": 2.5,
        "community_event": 2.0,
    }
    
    def __init__(self, blockchain):
        """
        Initialize music game integration.
        
        Args:
            blockchain: Bobcoin blockchain instance
        """
        self.blockchain = blockchain
        self.active_tournaments: List[Dict[str, Any]] = []
        self.player_sessions: Dict[str, List[Dict[str, Any]]] = {}
    
    def record_session(
        self,
        player_address: str,
        session_type: str,
        duration_minutes: int,
        score: float,
        multiplayer: bool = False,
        participants: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Record a music game session.
        
        Args:
            player_address: Player's Bobcoin address
            session_type: Type of session (solo, multiplayer, tournament)
            duration_minutes: Session duration
            score: Game score achieved
            multiplayer: Whether session was multiplayer
            participants: List of other participants (if multiplayer)
            
        Returns:
            Session record with reward calculation
        """
        # Calculate base reward
        base_reward = self._calculate_base_reward(duration_minutes, score)
        
        # Apply multiplier
        activity_key = "multiplayer_session" if multiplayer else "solo_play"
        multiplier = self.REWARD_MULTIPLIERS.get(activity_key, 1.0)
        
        reward = base_reward * multiplier
        
        # Create session record
        session = {
            "player_address": player_address,
            "session_type": session_type,
            "duration_minutes": duration_minutes,
            "score": score,
            "multiplayer": multiplayer,
            "participants": participants or [],
            "reward": reward,
            "social_value_contribution": self._calculate_social_value(multiplayer, participants)
        }
        
        # Store session
        if player_address not in self.player_sessions:
            self.player_sessions[player_address] = []
        self.player_sessions[player_address].append(session)
        
        return session
    
    def create_tournament(
        self,
        tournament_name: str,
        entry_fee: float,
        prize_pool: float,
        max_participants: int = 100
    ) -> Dict[str, Any]:
        """
        Create a music game tournament.
        
        Args:
            tournament_name: Name of the tournament
            entry_fee: Entry fee in Bobcoin
            prize_pool: Total prize pool
            max_participants: Maximum number of participants
            
        Returns:
            Tournament details
        """
        tournament = {
            "name": tournament_name,
            "entry_fee": entry_fee,
            "prize_pool": prize_pool,
            "max_participants": max_participants,
            "participants": [],
            "status": "open",
            "winner": None
        }
        
        self.active_tournaments.append(tournament)
        return tournament
    
    def join_tournament(
        self,
        player_address: str,
        tournament_name: str
    ) -> Dict[str, Any]:
        """
        Join a tournament.
        
        Args:
            player_address: Player's address
            tournament_name: Tournament to join
            
        Returns:
            Join result
        """
        tournament = self._find_tournament(tournament_name)
        
        if not tournament:
            return {"success": False, "reason": "Tournament not found"}
        
        if tournament["status"] != "open":
            return {"success": False, "reason": "Tournament not open"}
        
        if len(tournament["participants"]) >= tournament["max_participants"]:
            return {"success": False, "reason": "Tournament full"}
        
        # Check balance for entry fee
        balance = self.blockchain.get_balance(player_address)
        if balance < tournament["entry_fee"]:
            return {"success": False, "reason": "Insufficient balance"}
        
        # Add participant
        tournament["participants"].append(player_address)
        
        return {
            "success": True,
            "tournament": tournament_name,
            "participants": len(tournament["participants"])
        }
    
    def _calculate_base_reward(self, duration_minutes: int, score: float) -> float:
        """Calculate base reward from session."""
        # Duration component (max 60 minutes counted)
        duration_reward = min(duration_minutes * 0.1, 6.0)
        
        # Score component (normalized 0-100)
        score_reward = (score / 100.0) * 4.0
        
        return duration_reward + score_reward
    
    def _calculate_social_value(self, multiplayer: bool, participants: Optional[List[str]]) -> float:
        """Calculate social value contribution."""
        if not multiplayer:
            return 0.0
        
        # Base multiplayer value
        social_value = 25.0
        
        # Bonus for more participants
        if participants:
            social_value += min(len(participants) * 5, 25)
        
        return social_value
    
    def _find_tournament(self, tournament_name: str) -> Optional[Dict[str, Any]]:
        """Find tournament by name."""
        for tournament in self.active_tournaments:
            if tournament["name"] == tournament_name:
                return tournament
        return None
    
    def get_player_stats(self, player_address: str) -> Dict[str, Any]:
        """Get player statistics."""
        sessions = self.player_sessions.get(player_address, [])
        
        if not sessions:
            return {
                "total_sessions": 0,
                "total_rewards": 0.0,
                "average_score": 0.0
            }
        
        return {
            "total_sessions": len(sessions),
            "total_rewards": sum(s.get("reward", 0) for s in sessions),
            "average_score": sum(s.get("score", 0) for s in sessions) / len(sessions),
            "multiplayer_sessions": sum(1 for s in sessions if s.get("multiplayer")),
            "total_duration_minutes": sum(s.get("duration_minutes", 0) for s in sessions)
        }
