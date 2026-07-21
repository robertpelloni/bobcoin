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

    // Simulate SP1 Proving Time and Output
    // In production, this would compile down to the SP1 WASM client to
    // run the RISC-V ELF locally inside the browser.

    let serialized_input = serde_json::to_string(&input).unwrap();
    let mut hasher = Sha256::new();
    hasher.update(serialized_input.as_bytes());
    let result = hasher.finalize();

    let simulated_proof_bytes = format!("sp1_zk_proof_v1_{:x}", result);

    Ok(simulated_proof_bytes)
}
