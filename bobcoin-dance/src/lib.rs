use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct DanceMove {
    pub name: String,
    pub duration: u32,
    pub intensity: u8,
}

pub trait GrooveVerifier {
    fn verify_groove(&self, moves: &[DanceMove]) -> bool;
}

pub struct BasicGrooveVerifier;

impl GrooveVerifier for BasicGrooveVerifier {
    fn verify_groove(&self, moves: &[DanceMove]) -> bool {
        // Stub: verify that there is at least one move and total intensity > 0
        !moves.is_empty() && moves.iter().map(|m| m.intensity as u32).sum::<u32>() > 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dance_move_serialization() {
        let move1 = DanceMove {
            name: "Moonwalk".to_string(),
            duration: 5,
            intensity: 10,
        };

        let serialized = serde_json::to_string(&move1).unwrap();
        let deserialized: DanceMove = serde_json::from_str(&serialized).unwrap();
        assert_eq!(move1, deserialized);
    }

    #[test]
    fn test_groove_verification() {
        let verifier = BasicGrooveVerifier;
        let moves = vec![
            DanceMove {
                name: "Spin".to_string(),
                duration: 2,
                intensity: 5,
            }
        ];
        assert!(verifier.verify_groove(&moves));
        
        let no_moves = vec![];
        assert!(!verifier.verify_groove(&no_moves));
    }
}
