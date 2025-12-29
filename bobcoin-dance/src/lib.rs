use serde::{Serialize, Deserialize};

/// Represents a physical dance move captured by sensors
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct DanceMove {
    pub name: String,
    pub duration: u32,
    pub intensity: u8,
}

/// A "Dance Off" session where one user vouches for another
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct DanceOffSession {
    /// The dance moves performed
    pub moves: Vec<DanceMove>,
    /// Timestamp of the session start
    pub timestamp: u64,
    /// GPS Coordinates (Optional, obfuscated in production)
    pub location_hash: String,
    /// The public key of the person vouching for this dance
    pub witness_id: String,
    /// A cryptographic signature from the witness proving they were present
    pub witness_signature: String,
    /// A flag indicating if local biometric authentication (TouchID/FaceID) passed
    pub biometric_auth_passed: bool,
}

pub trait GrooveVerifier {
    fn verify_groove(&self, session: &DanceOffSession) -> bool;
}

pub struct BasicGrooveVerifier;

impl GrooveVerifier for BasicGrooveVerifier {
    fn verify_groove(&self, session: &DanceOffSession) -> bool {
        // Verification Logic:
        // 1. Must have dance moves.
        // 2. Total intensity must be significant.
        // 3. Must be vouched for (witness signature present).
        // 4. Must have passed biometric check.
        
        let has_moves = !session.moves.is_empty();
        let sufficient_intensity = session.moves.iter().map(|m| m.intensity as u32).sum::<u32>() > 10;
        let is_vouched = !session.witness_id.is_empty() && !session.witness_signature.is_empty();
        let is_bio_auth = session.biometric_auth_passed;

        has_moves && sufficient_intensity && is_vouched && is_bio_auth
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dance_off_verification() {
        let verifier = BasicGrooveVerifier;
        
        let valid_session = DanceOffSession {
            moves: vec![
                DanceMove { name: "Moonwalk".into(), duration: 5, intensity: 8 },
                DanceMove { name: "Spin".into(), duration: 2, intensity: 5 },
            ],
            timestamp: 1234567890,
            location_hash: "loc_hash_123".into(),
            witness_id: "witness_bob".into(),
            witness_signature: "sig_abc_123".into(),
            biometric_auth_passed: true,
        };

        assert!(verifier.verify_groove(&valid_session));
    }

    #[test]
    fn test_invalid_dance_off() {
        let verifier = BasicGrooveVerifier;
        
        let lazy_session = DanceOffSession {
            moves: vec![
                DanceMove { name: "Nod".into(), duration: 1, intensity: 1 },
            ],
            timestamp: 1234567890,
            location_hash: "loc_hash_123".into(),
            witness_id: "witness_bob".into(),
            witness_signature: "sig_abc_123".into(),
            biometric_auth_passed: true,
        };

        // Should fail because intensity sum (1) is <= 10
        assert!(!verifier.verify_groove(&lazy_session));

        let unvouched_session = DanceOffSession {
            moves: vec![DanceMove { name: "Spin".into(), duration: 5, intensity: 20 }],
            timestamp: 1234567890,
            location_hash: "".into(),
            witness_id: "".into(), // No witness
            witness_signature: "".into(),
            biometric_auth_passed: true,
        };

        assert!(!verifier.verify_groove(&unvouched_session));
    }
}
