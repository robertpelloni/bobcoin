/// Represents a single observation from an oracle node.
/// In a real system, this would be signed by the node's private key.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Observation {
    /// The public key or ID of the observer
    pub observer_id: Vec<u8>,
    /// The data observed (e.g., price, outcome)
    pub data: Vec<u8>,
    /// Digital signature of the data
    pub signature: Vec<u8>,
}

/// Represents an aggregated report from multiple observations.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Report {
    /// The consensus timestamp or round ID
    pub round_id: u64,
    /// The aggregated value (could be a median, mode, or complex struct)
    pub aggregated_data: Vec<u8>,
    /// List of observations that contributed to this report
    pub observations: Vec<Observation>,
}

/// Errors that can occur during report verification
#[derive(Debug)]
pub enum VerificationError {
    InvalidSignature,
    NotEnoughObservations,
    ObserverMismatch,
}

/// Verifies a report against a set of valid oracles.
///
/// In a real implementation, this would verify BLS signatures or similar
/// multi-signature schemes. For this prototype, we'll do a basic check.
pub fn verify_report(
    report: &Report,
    valid_observers: &[Vec<u8>],
    min_observations: usize,
) -> Result<bool, VerificationError> {
    if report.observations.len() < min_observations {
        return Err(VerificationError::NotEnoughObservations);
    }

    // Check if all observers are in the valid set
    for obs in &report.observations {
        if !valid_observers.contains(&obs.observer_id) {
            return Err(VerificationError::ObserverMismatch);
        }
        // verify_signature(&obs.observer_id, &obs.data, &obs.signature)?;
    }

    // In a real system: verify the aggregated_data corresponds to the observations
    // (e.g., is it the median?)

    Ok(true)
}
