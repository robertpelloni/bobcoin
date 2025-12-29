use std::time::{SystemTime, UNIX_EPOCH};

/// Social Value Mining - Bobcoin's unique consensus mechanism.
///
/// Instead of Proof of Work or Proof of Stake, Bobcoin uses Proof of Social Value.
/// Participants earn mining rewards by contributing to healthy social activities.

pub const MIN_SCORE_TO_MINE: f64 = 25.0;
pub const TARGET_SCORE: f64 = 75.0;

#[derive(Debug, Clone, Default)]
pub struct SocialValueProof {
    // Activity categories
    pub exercise_score: f64,     // Physical health contribution
    pub social_score: f64,       // Social interaction contribution
    pub relationship_score: f64, // Relationship health contribution

    // Proof details
    pub timestamp: u64,
    pub participant_id: String,

    // Anti-hoarding metrics
    pub velocity_score: f64,     // Rewards spending/circulation
    pub distribution_score: f64, // Rewards fair distribution
}

impl SocialValueProof {
    pub fn new(participant_id: String) -> Self {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Self {
            participant_id,
            timestamp,
            ..Default::default()
        }
    }

    /// Calculate total social value score (0.0 to 100.0)
    pub fn calculate_total_score(&self) -> f64 {
        let weights_exercise = 0.25;
        let weights_social = 0.25;
        let weights_relationship = 0.25;
        let weights_velocity = 0.15;
        let weights_distribution = 0.10;

        let total = self.exercise_score * weights_exercise
            + self.social_score * weights_social
            + self.relationship_score * weights_relationship
            + self.velocity_score * weights_velocity
            + self.distribution_score * weights_distribution;

        total.min(100.0)
    }

    /// Validate the proof
    pub fn is_valid(&self) -> bool {
        if !(0.0..=100.0).contains(&self.exercise_score) {
            return false;
        }
        if !(0.0..=100.0).contains(&self.social_score) {
            return false;
        }
        if !(0.0..=100.0).contains(&self.relationship_score) {
            return false;
        }

        if self.participant_id.is_empty() {
            return false;
        }

        // Basic timestamp check (not in future, not too old)
        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        if self.timestamp > current_time {
            return false;
        }
        if self.timestamp < current_time.saturating_sub(86400) {
            return false; // Older than 24 hours
        }

        true
    }
}

/// Social Value Miner - replaces traditional miners.
pub struct SocialMiner {
    pub participant_id: String,
    pub current_proof: SocialValueProof,
}

impl SocialMiner {
    pub fn new(participant_id: String) -> Self {
        Self {
            participant_id: participant_id.clone(),
            current_proof: SocialValueProof::new(participant_id),
        }
    }

    /// Set velocity score (anti-hoarding)
    pub fn set_velocity_score(&mut self, velocity: f64) {
        self.current_proof.velocity_score = velocity.clamp(0.0, 100.0);
    }

    /// Set distribution score (anti-classism)
    pub fn set_distribution_score(&mut self, distribution: f64) {
        self.current_proof.distribution_score = distribution.clamp(0.0, 100.0);
    }

    /// Check if participant has sufficient social value to mine
    pub fn can_mine(&self) -> bool {
        self.current_proof.calculate_total_score() >= MIN_SCORE_TO_MINE
    }

    /// Calculate reward multiplier based on social value score (0.5 to 2.0)
    pub fn get_mining_reward_multiplier(&self) -> f64 {
        let total_score = self.current_proof.calculate_total_score();

        if total_score < MIN_SCORE_TO_MINE {
            return 0.0;
        }

        // Linear multiplier from 0.5x to 2.0x based on score
        let multiplier = 0.5 + (total_score / TARGET_SCORE) * 1.5;
        multiplier.min(2.0)
    }

    /// Reset to start accumulating a new proof
    pub fn reset_proof(&mut self) {
        self.current_proof = SocialValueProof::new(self.participant_id.clone());
    }

    // Note: In a full implementation, we would add methods here to ingest raw proofs
    // (exercise logs, social interaction records) and calculate the component scores,
    // similar to the Python _recalculate_* methods.
    // For this port, we allow setting scores directly for simplicity or future expansion.
    
    pub fn update_exercise_score(&mut self, score: f64) {
        self.current_proof.exercise_score = score.clamp(0.0, 100.0);
    }
    
    pub fn update_social_score(&mut self, score: f64) {
        self.current_proof.social_score = score.clamp(0.0, 100.0);
    }
    
    pub fn update_relationship_score(&mut self, score: f64) {
        self.current_proof.relationship_score = score.clamp(0.0, 100.0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mining_threshold() {
        let mut miner = SocialMiner::new("miner1".to_string());
        
        // Initial state should be 0
        assert!(!miner.can_mine());
        
        // Set scores to reach > 25 total
        // Weights: exercise 0.25, social 0.25 -> need 100 combined to get 25 total
        miner.update_exercise_score(50.0);
        miner.update_social_score(50.0);
        
        assert!(miner.can_mine()); // (50*0.25) + (50*0.25) = 12.5 + 12.5 = 25.0
    }

    #[test]
    fn test_reward_multiplier() {
        let mut miner = SocialMiner::new("miner2".to_string());
        
        // Max out everything
        miner.update_exercise_score(100.0);
        miner.update_social_score(100.0);
        miner.update_relationship_score(100.0);
        miner.set_velocity_score(100.0);
        miner.set_distribution_score(100.0);
        
        // Should be capped at 2.0
        assert!((miner.get_mining_reward_multiplier() - 2.0).abs() < 0.001);
    }
}
