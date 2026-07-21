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

pub fn format_js(f: f64) -> String {
    if f == 0.0 {
        return "0".to_string();
    }
    let abs = f.abs();
    if abs >= 1e21 || abs < 1e-6 {
        let s = format!("{:e}", f);
        let parts: Vec<&str> = s.split('e').collect();
        if parts.len() == 2 {
            let exp: i32 = parts[1].parse().unwrap_or(0);
            if exp > 0 {
                return format!("{}e+{}", parts[0], exp);
            }
            return format!("{}e{}", parts[0], exp);
        }
        return s;
    }

    // For normal numbers, Rust's default Display format for f64 matches JS .toString() pretty closely,
    // avoiding trailing zeros that {:.6} would add.
    format!("{}", f)
}

impl Block {
    pub fn calculate_hash(&self) -> String {
        // Must maintain strict field parity with go-lattice and bobcoin-consensus
        let mut parts = vec![
            self.block_type.clone(),
            self.account.clone(),
            self.previous.clone().unwrap_or_else(|| "".to_string()),
            format_js(self.balance),
            format_js(self.staked_balance),
            self.height.to_string(),
            self.link.clone().unwrap_or_else(|| "".to_string()),
        ];
<<<<<<< HEAD

=======

>>>>>>> origin/main
        if let Some(spora) = &self.spora {
            let spora_json = serde_json::to_string(spora).unwrap_or_default();
            parts.push(spora_json);
        } else {
            parts.push("".to_string());
        }

        if !self.payload.is_null() {
            let payload_json = serde_json::to_string(&self.payload).unwrap_or_else(|_| "".to_string());
            parts.push(payload_json);
        } else {
            parts.push("".to_string());
        }

        let data = parts.join("");
        let mut hasher = Sha256::new();
        hasher.update(data);
        let result = hasher.finalize();
        hex::encode(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_js() {
        assert_eq!(format_js(0.0), "0");
        assert_eq!(format_js(1.234), "1.234");
        assert_eq!(format_js(100.0), "100");
        assert_eq!(format_js(0.0000001), "1e-7");
        assert_eq!(format_js(1e22), "1e+22");
    }
}
