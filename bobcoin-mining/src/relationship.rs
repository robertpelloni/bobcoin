use std::collections::HashSet;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, PartialEq)]
pub enum InteractionType {
    FirstMessage,
    MeaningfulConversation,
    VideoCall,
    InPersonMeeting,
    OngoingConversation,
}

impl InteractionType {
    pub fn base_score(&self) -> f64 {
        match self {
            InteractionType::FirstMessage => 0.5,
            InteractionType::MeaningfulConversation => 2.0,
            InteractionType::VideoCall => 3.0,
            InteractionType::InPersonMeeting => 5.0,
            InteractionType::OngoingConversation => 1.5,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum GrowthMilestone {
    Matched,
    FirstDate, // Added based on requirements "e.g., > 10 interactions for 'FirstDate'"
    Exclusive, // Added based on requirements
    WeekConnection,
    MonthConnection,
    ThreeMonthConnection,
    SixMonthConnection,
    YearConnection,
}

#[derive(Debug, Clone)]
pub struct Interaction {
    pub interaction_type: InteractionType,
    pub timestamp: u64,
    pub quality_score: f64, // 0.0 to 1.0
    pub duration_minutes: Option<u64>,
    pub mutual_rating: Option<f64>, // 0.0 to 1.0
}

impl Interaction {
    pub fn calculate_score(&self) -> f64 {
        let base_reward = self.interaction_type.base_score();
        let quality_multiplier = 0.5 + (self.quality_score * 0.5); // 0.5-1.0
        
        let mut reward = base_reward * quality_multiplier;
        
        // Duration bonus for conversations
        if let Some(minutes) = self.duration_minutes {
            if minutes > 10 {
                let bonus = ((minutes - 10) as f64 * 0.1).min(5.0);
                reward += bonus;
            }
        }
        
        // Mutual rating bonus
        if let Some(rating) = self.mutual_rating {
            if rating > 0.7 {
                reward *= 1.5;
            }
        }
        
        reward
    }
}

#[derive(Debug, Clone, Default)]
pub struct RelationshipVerifier {
    pub interaction_history: Vec<Interaction>,
    pub trust_score: f32,
    pub milestones: HashSet<GrowthMilestone>,
    pub partner_id: String,
    pub start_time: u64,
}

impl RelationshipVerifier {
    pub fn new(partner_id: String) -> Self {
        let start_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
            
        Self {
            partner_id,
            start_time,
            ..Default::default()
        }
    }

    pub fn record_interaction(&mut self, interaction: Interaction) {
        self.interaction_history.push(interaction);
        self.recalculate_trust_score();
        self.check_milestones();
    }

    fn recalculate_trust_score(&mut self) {
        if self.interaction_history.is_empty() {
            self.trust_score = 0.0;
            return;
        }

        let total_score: f64 = self.interaction_history.iter()
            .map(|i| i.calculate_score())
            .sum();
            
        // Simple normalization for trust score, can be more complex
        // Capping at 100.0
        self.trust_score = (total_score as f32).min(100.0);
    }

    fn check_milestones(&mut self) {
        // Time-based milestones
        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        
        let duration_seconds = current_time.saturating_sub(self.start_time);
        let duration_days = duration_seconds as f64 / 86400.0;

        if duration_days >= 7.0 { self.milestones.insert(GrowthMilestone::WeekConnection); }
        if duration_days >= 30.0 { self.milestones.insert(GrowthMilestone::MonthConnection); }
        if duration_days >= 90.0 { self.milestones.insert(GrowthMilestone::ThreeMonthConnection); }
        if duration_days >= 180.0 { self.milestones.insert(GrowthMilestone::SixMonthConnection); }
        if duration_days >= 365.0 { self.milestones.insert(GrowthMilestone::YearConnection); }

        // Interaction-count based milestones (example implementation for FirstDate/Exclusive requirements)
        // Assuming FirstDate requires > 10 interactions or specific types
        if self.interaction_history.len() > 10 {
            self.milestones.insert(GrowthMilestone::FirstDate);
        }
        
        // Assuming Exclusive requires high trust and time
        if self.trust_score > 50.0 && duration_days > 14.0 {
            self.milestones.insert(GrowthMilestone::Exclusive);
        }
    }

    pub fn verify_milestone(&self, milestone: &GrowthMilestone) -> bool {
        self.milestones.contains(milestone)
    }
    
    pub fn get_interaction_count(&self) -> usize {
        self.interaction_history.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_interaction_scoring() {
        let interaction = Interaction {
            interaction_type: InteractionType::MeaningfulConversation,
            timestamp: 100,
            quality_score: 1.0,
            duration_minutes: Some(30),
            mutual_rating: Some(0.8),
        };
        
        // Base: 2.0
        // Quality: 1.0 -> multiplier 1.0 (0.5 + 0.5) -> reward 2.0
        // Duration: 30 - 10 = 20 * 0.1 = 2.0 bonus -> reward 4.0
        // Mutual rating: > 0.7 -> * 1.5 -> reward 6.0
        
        assert!((interaction.calculate_score() - 6.0).abs() < 0.001);
    }

    #[test]
    fn test_milestone_verification() {
        let mut verifier = RelationshipVerifier::new("partner1".to_string());
        
        // Add 11 interactions to trigger FirstDate
        for i in 0..11 {
            verifier.record_interaction(Interaction {
                interaction_type: InteractionType::FirstMessage,
                timestamp: 100 + i as u64,
                quality_score: 0.8,
                duration_minutes: None,
                mutual_rating: None,
            });
        }
        
        assert!(verifier.verify_milestone(&GrowthMilestone::FirstDate));
        assert!(!verifier.verify_milestone(&GrowthMilestone::Exclusive));
    }
}
