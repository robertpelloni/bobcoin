use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Block {
    #[serde(rename = "type")]
    pub block_type: String,
    pub account: String,
    pub previous: Option<String>,
    pub balance: f64,
    pub staked_balance: f64,
    pub height: u64,
    pub link: Option<String>,
    pub spora: Option<SporaProof>,
    pub payload: serde_json::Value,
    pub signature: Option<String>,
    pub hash: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct SporaProof {
    pub challenge: String,
    pub proof: String,
}

impl Block {
    pub fn calculate_hash(&self) -> String {
        // Must maintain strict field parity with go-lattice and bobcoin-consensus
        let mut parts = vec![
            self.block_type.clone(),
            self.account.clone(),
            self.previous.clone().unwrap_or_else(|| "".to_string()),
            format!("{:.6}", self.balance), // Float formatting parity concern
            format!("{:.6}", self.staked_balance),
            self.height.to_string(),
            self.link.clone().unwrap_or_else(|| "".to_string()),
        ];

        if let Some(spora) = &self.spora {
            let spora_json = serde_json::to_string(spora).unwrap_or_default();
            parts.push(spora_json);
        } else {
            parts.push("null".to_string());
        }

        let payload_json = serde_json::to_string(&self.payload).unwrap_or_else(|_| "{}".to_string());
        parts.push(payload_json);

        let data = parts.join("");
        let mut hasher = Sha256::new();
        hasher.update(data);
        let result = hasher.finalize();
        hex::encode(result)
    }
}
