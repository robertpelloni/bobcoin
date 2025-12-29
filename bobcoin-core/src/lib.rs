use serde::{Serialize, Deserialize};
use sha2::{Sha256, Digest};

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
}

impl Block {
    pub fn new(index: u64, transactions: Vec<Transaction>, previous_hash: String) -> Self {
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
        
        let block = Block::new(1, vec![tx], "prev_hash".to_string());
        assert_eq!(block.index, 1);
        assert_eq!(block.previous_hash, "prev_hash");
        assert!(!block.hash.is_empty());
    }
}
