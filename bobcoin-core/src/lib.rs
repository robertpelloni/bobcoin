use serde::{Serialize, Deserialize};
use sha2::{Sha256, Digest};
use bobcoin_mining::SocialValueProof;
use bobcoin_dance::DanceOffSession;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct TxInput {
    pub txid: String,
    pub vout: u32,
    pub signature: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct TxOutput {
    pub value: u64,
    pub address: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct Transaction {
    pub inputs: Vec<TxInput>,
    pub outputs: Vec<TxOutput>,
    pub timestamp: u64,
}

impl Transaction {
    pub fn calculate_hash(&self) -> String {
        let serialized = serde_json::to_string(self).unwrap();
        let mut hasher = Sha256::new();
        hasher.update(serialized.as_bytes());
        hex::encode(hasher.finalize())
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct Block {
    pub index: u64,
    pub timestamp: u64,
    pub transactions: Vec<Transaction>,
    pub previous_hash: String,
    pub hash: String,
    pub nonce: u64,
    pub social_proof: Option<SocialValueProof>,
    pub dance_session: Option<DanceOffSession>,
}

impl Block {
    pub fn new(
        index: u64, 
        transactions: Vec<Transaction>, 
        previous_hash: String,
        social_proof: Option<SocialValueProof>,
        dance_session: Option<DanceOffSession>,
    ) -> Self {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        let mut block = Block {
            index,
            timestamp,
            transactions,
            previous_hash,
            hash: String::new(),
            nonce: 0,
            social_proof,
            dance_session,
        };
        block.hash = block.calculate_hash();
        block
    }

    pub fn calculate_hash(&self) -> String {
        let mut hasher = Sha256::new();
        hasher.update(self.index.to_be_bytes());
        hasher.update(self.timestamp.to_be_bytes());
        
        for tx in &self.transactions {
            hasher.update(tx.calculate_hash().as_bytes());
        }
        
        hasher.update(self.previous_hash.as_bytes());
        hasher.update(self.nonce.to_be_bytes());

        if let Some(proof) = &self.social_proof {
            // Assuming SocialValueProof is serializable or has a way to contribute to hash
            // Since I don't see the definition of SocialValueProof, I'll rely on serde serialization for hash consistency
            // similar to how Transaction works in the existing calculate_hash (though Transaction calls its own calculate_hash, let's see if SocialValueProof has one or if we just serialize it)
            // The existing code for Transaction calls `tx.calculate_hash()`.
            // The existing code for Block `calculate_hash` manually updates hasher.
            // I should probably use serde_json to stringify if it doesn't have a hash method, or just stringify the whole block for hashing if I wanted to be lazy, but I should follow the pattern.
            // Since I don't know if SocialValueProof/DanceOffSession have `calculate_hash`, I will use `serde_json::to_string` on them since they are likely Serialize.
            if let Ok(serialized) = serde_json::to_string(proof) {
                hasher.update(serialized.as_bytes());
            }
        }

        if let Some(session) = &self.dance_session {
             if let Ok(serialized) = serde_json::to_string(session) {
                hasher.update(serialized.as_bytes());
            }
        }
        
        hex::encode(hasher.finalize())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transaction_serialization() {
        let tx = Transaction {
            inputs: vec![TxInput {
                txid: "0".repeat(64),
                vout: 0,
                signature: "sig".to_string(),
            }],
            outputs: vec![TxOutput {
                value: 50,
                address: "bob".to_string(),
            }],
            timestamp: 1234567890,
        };

        let serialized = serde_json::to_string(&tx).unwrap();
        let deserialized: Transaction = serde_json::from_str(&serialized).unwrap();
        assert_eq!(tx, deserialized);
    }

    #[test]
    fn test_block_creation() {
        let tx = Transaction {
            inputs: vec![],
            outputs: vec![TxOutput {
                value: 50,
                address: "bob".to_string(),
            }],
            timestamp: 1234567890,
        };
        
        let block = Block::new(1, vec![tx], "prev_hash".to_string(), None, None);
        assert_eq!(block.index, 1);
        assert_eq!(block.previous_hash, "prev_hash");
        assert!(!block.hash.is_empty());
    }
}
