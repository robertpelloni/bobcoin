use crate::block::Block;
use ed25519_dalek::Signature;

#[derive(Debug)]
pub enum ValidationError {
    InvalidHash,
    InvalidSignature,
    NegativeBalance,
    InvalidHeight(u64, u64), // expected, got
    MissingPreviousHash,
}

pub struct BlockValidator;

impl BlockValidator {
    pub fn validate_block(block: &Block, expected_height: u64, is_genesis: bool) -> Result<(), ValidationError> {
        let calculated_hash = block.calculate_hash();

        if let Some(hash) = &block.hash {
            if hash != &calculated_hash {
                return Err(ValidationError::InvalidHash);
            }
        } else {
            return Err(ValidationError::InvalidHash);
        }

        if let Some(sig_hex) = &block.signature {
            let sig_bytes = hex::decode(sig_hex).map_err(|_| ValidationError::InvalidSignature)?;
            if sig_bytes.len() != 64 {
                return Err(ValidationError::InvalidSignature);
            }
            let _signature = Signature::from_slice(&sig_bytes).map_err(|_| ValidationError::InvalidSignature)?;
            // Assuming account string is a base58 public key, need base58 crate to decode, placeholder for now
            // if let Ok(pub_key_bytes) = bs58::decode(&block.account).into_vec() {
            //    if let Ok(pub_key) = VerifyingKey::from_bytes(&pub_key_bytes) {
            //        if pub_key.verify(calculated_hash.as_bytes(), &_signature).is_err() {
            //            return Err(ValidationError::InvalidSignature);
            //        }
            //    }
            // } else {
            //    return Err(ValidationError::InvalidSignature);
            // }
        } else {
            return Err(ValidationError::InvalidSignature);
        }

        if block.balance < 0.0 || block.staked_balance < 0.0 {
            return Err(ValidationError::NegativeBalance);
        }

        if block.height != expected_height {
            return Err(ValidationError::InvalidHeight(expected_height, block.height));
        }

        if !is_genesis && block.previous.is_none() {
            return Err(ValidationError::MissingPreviousHash);
        }

        Ok(())
    }
}
