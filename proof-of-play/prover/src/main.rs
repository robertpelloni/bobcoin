//! proof-of-play-prover
//! Host-side SP1 prover for Bobcoin Proof-of-Play.
//!
//! Executes the proof-of-play zkVM program on a game trace and writes a
//! serialized `SP1ProofWithPublicValues` that the Go game-server verifies
//! (via proof-of-play-verifier) when submitted as `proofBytesB64`:
//!
//!   proof-of-play-prover --elf <program-elf> --score 2000 \
//!       --keystrokes 75,215,305,465,550,680,790,965,1060,1180 --out proof.bin
//!
//! Exit code 0 = proof written. The committed public value is the program's
//! validity verdict (score >= keystroke count, at least 5 keystrokes).

use serde::{Deserialize, Serialize};
use sp1_sdk::blocking::{ProveRequest, Prover, ProverClient};
use sp1_sdk::{Elf, SP1Stdin};
use std::process::ExitCode;

// Must match proof-of-play/program/src/main.rs GameInput exactly.
#[derive(Serialize, Deserialize)]
struct GameInput {
    score: u32,
    keystrokes: Vec<u64>,
}

fn arg_value(args: &[String], name: &str) -> Option<String> {
    args.windows(2)
        .find(|w| w[0] == name)
        .map(|w| w[1].clone())
}

fn run() -> Result<(), String> {
    let args: Vec<String> = std::env::args().collect();
    let elf_path = arg_value(&args, "--elf").ok_or("missing --elf <path>")?;
    let out_path = arg_value(&args, "--out").ok_or("missing --out <path>")?;
    let score: u32 = arg_value(&args, "--score")
        .ok_or("missing --score <u32>")?
        .parse()
        .map_err(|e| format!("bad --score: {e}"))?;
    let keystrokes: Vec<u64> = arg_value(&args, "--keystrokes")
        .ok_or("missing --keystrokes <csv-ms>")?
        .split(',')
        .map(|s| s.trim().parse::<u64>())
        .collect::<Result<_, _>>()
        .map_err(|e| format!("bad --keystrokes: {e}"))?;

    let elf_bytes =
        std::fs::read(&elf_path).map_err(|e| format!("cannot read ELF {elf_path}: {e}"))?;

    let client = ProverClient::from_env();
    let pk = client
        .setup(Elf::from(elf_bytes))
        .map_err(|e| format!("setup failed: {e}"))?;

    let mut stdin = SP1Stdin::new();
    stdin.write(&GameInput { score, keystrokes });

    let proof = client
        .prove(&pk, stdin)
        .run()
        .map_err(|e| format!("proving failed: {e}"))?;

    proof
        .save(&out_path)
        .map_err(|e| format!("cannot save proof {out_path}: {e}"))?;
    println!("PROOF WRITTEN {out_path}");
    Ok(())
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::from(0),
        Err(msg) => {
            eprintln!("PROVING FAILED: {msg}");
            ExitCode::from(1)
        }
    }
}
