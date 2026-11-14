use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};

#[derive(Serialize, Deserialize)]
struct GameInput {
    score: u32,
    keystrokes: Vec<u64>,
}

#[wasm_bindgen]
pub fn generate_proof(score: u32, keystrokes_json: &str) -> Result<String, JsValue> {
    let keystrokes: Vec<u64> = serde_json::from_str(keystrokes_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse keystrokes: {}", e)))?;

    let input = GameInput {
        score,
        keystrokes,
    };

    // NOTE (v8.117.9): this is NOT a ZK proof and never was — it is a
    // SHA-256 input-commitment hash. Real SP1 proving happens in the
    // prover sidecar (proof-of-play/prover, SP1 v6) and verification in
    // the verifier daemon; the browser cannot run the SP1 prover. The
    // commitment still binds the submitted score/keystrokes together
    // for the AI Oracle path, so it is kept — under an honest name.
    let serialized_input = serde_json::to_string(&input).unwrap();
    let mut hasher = Sha256::new();
    hasher.update(serialized_input.as_bytes());
    let result = hasher.finalize();

    let commitment = format!("pop_input_commitment_v1_{:x}", result);

    Ok(commitment)
}
