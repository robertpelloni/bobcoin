use sp1_sdk::{ProverClient, SP1Stdin};
use serde::{Deserialize, Serialize};

const ELF: &[u8] = include_bytes!("../../program/elf/riscv32im-succinct-zkvm-elf");

#[derive(Serialize, Deserialize, Debug)]
struct GameStats {
    score: u32,
    perfects: u32,
    greats: u32,
    misses: u32,
}

fn main() {
    // Setup logging
    sp1_sdk::utils::setup_logger();

    // Initialize the prover client.
    let client = ProverClient::new();

    // Setup inputs (Mock data for now, in real usage this comes from args)
    let stats = GameStats {
        score: 5500,
        perfects: 50,
        greats: 10,
        misses: 0,
    };
    
    let mut stdin = SP1Stdin::new();
    stdin.write(&stats);

    println!("Executing proof-of-play...");
    let (output, report) = client.execute(ELF, stdin).run().unwrap();
    
    // Read the output.
    let committed_score = output.as_slice();
    println!("Execution finished. Committed output: {:?}", committed_score);

    // In a real scenario, we would generate a proof here using client.prove(...)
    // For now, execution verifies the logic.
    println!("Report: {:?}", report);
}
