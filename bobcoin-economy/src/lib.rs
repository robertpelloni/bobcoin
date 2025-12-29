/// Anti-hoarding system for Bobcoin.
///
/// Implements mechanisms to discourage wealth concentration and encourage circulation.

pub const DEMURRAGE_RATE: f64 = 0.02; // 2% annual fee on held tokens
pub const LARGE_BALANCE_THRESHOLD: f64 = 10000.0; // Threshold for increased demurrage

/// Trait for calculating demurrage fees
pub trait DemurrageCalculator {
    fn calculate_demurrage(&self, balance: f64, time_held_days: u64) -> f64;
}

/// Standard implementation of Bobcoin's demurrage logic
pub struct StandardDemurrageCalculator;

impl DemurrageCalculator for StandardDemurrageCalculator {
    /// Calculate demurrage (holding fee) for a balance.
    ///
    /// Logic:
    /// - No fee for small balances (<= 100)
    /// - Base annual rate of 2%
    /// - Progressive rate for balances over 10,000 (1% extra per 10k excess)
    /// - Cap additional rate at 5% (Total 7%)
    fn calculate_demurrage(&self, balance: f64, time_held_days: u64) -> f64 {
        if balance <= 100.0 {
            return 0.0;
        }

        let mut annual_rate = DEMURRAGE_RATE;

        // Increased rate for large balances (progressive demurrage)
        if balance > LARGE_BALANCE_THRESHOLD {
            let excess = balance - LARGE_BALANCE_THRESHOLD;
            // Additional 1% per 10k over threshold
            let additional_rate = (excess / 10000.0) * 0.01;
            // Cap additional rate at 5%, so max total rate is 7%
            annual_rate += additional_rate.min(0.05);
        }

        // Calculate daily rate
        let daily_rate = annual_rate / 365.0;

        // Calculate demurrage
        balance * daily_rate * (time_held_days as f64)
    }
}

/// Tracks velocity and distribution scores for an address
pub struct AccountHealth {
    pub velocity_score: f64,
    pub distribution_score: f64,
}

impl AccountHealth {
    pub fn new() -> Self {
        Self {
            velocity_score: 0.0,
            distribution_score: 0.0,
        }
    }

    /// Calculate bonus multiplier based on velocity (0-50% bonus)
    pub fn calculate_velocity_bonus(&self, base_reward: f64) -> f64 {
        if self.velocity_score <= 0.0 {
            return base_reward;
        }

        let bonus_multiplier = 1.0 + (self.velocity_score / 100.0) * 0.5;
        // Cap at 1.5x
        let bonus_multiplier = bonus_multiplier.min(1.5);

        base_reward * bonus_multiplier
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_small_balance_demurrage() {
        let calc = StandardDemurrageCalculator;
        assert_eq!(calc.calculate_demurrage(50.0, 365), 0.0);
    }

    #[test]
    fn test_standard_demurrage() {
        let calc = StandardDemurrageCalculator;
        let balance = 5000.0; // Below threshold
        let days = 365;
        let demurrage = calc.calculate_demurrage(balance, days);
        // 2% of 5000 is 100
        assert!((demurrage - 100.0).abs() < 0.01);
    }

    #[test]
    fn test_progressive_demurrage() {
        let calc = StandardDemurrageCalculator;
        let balance = 20000.0; // 10k over threshold
        let days = 365;
        
        // Base rate 0.02
        // Excess 10000 -> (10000/10000)*0.01 = 0.01 additional
        // Total rate 0.03
        // Expected fee: 20000 * 0.03 = 600
        
        let demurrage = calc.calculate_demurrage(balance, days);
        assert!((demurrage - 600.0).abs() < 0.01);
    }
}
