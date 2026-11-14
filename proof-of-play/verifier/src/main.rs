//! proof-of-play-verifier
//! Host-side SP1 proof verifier for the Bobcoin game server.
//!
//! Why this exists: SP1 v6 `cargo prove` has no `verify` subcommand —
//! verification is done through sp1-sdk. The Go game-server shells out to
//! this binary (natively on Linux/CI, or via `wsl -d Ubuntu --` on Windows):
//!
//!   proof-of-play-verifier --elf <program-elf> --proof <serialized-proof>
//!
//! Exit code 0 = proof valid for the program's verification key.
//! Exit code 1 = invalid proof, bad arguments, or unreadable inputs.
//! The proof file is an `SP1ProofWithPublicValues` saved with
//! `proof.save(path)` by an sp1-sdk prover.

use sp1_sdk::blocking::{Prover, ProverClient};
use sp1_sdk::{Elf, ProvingKey, SP1ProofWithPublicValues};
use std::process::ExitCode;

fn run() -> Result<(), String> {
    let args: Vec<String> = std::env::args().collect();
    let mut elf_path: Option<String> = None;
    let mut proof_path: Option<String> = None;
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--elf" => {
                i += 1;
                elf_path = args.get(i).cloned();
            }
            "--proof" => {
                i += 1;
                proof_path = args.get(i).cloned();
            }
            other => return Err(format!("unknown argument: {other}")),
        }
        i += 1;
    }
    let elf_path = elf_path.ok_or("missing --elf <path>")?;
    let proof_path = proof_path.ok_or("missing --proof <path>")?;

    let elf_bytes =
        std::fs::read(&elf_path).map_err(|e| format!("cannot read ELF {elf_path}: {e}"))?;

    // Blocking EnvProver (SP1_PROVER env selects cpu/mock/network; the Go
    // bridge never sets `mock`, so a mock proof cannot pass as real here).
    let client = ProverClient::from_env();
    let pk = client
        .setup(Elf::from(elf_bytes))
        .map_err(|e| format!("setup failed: {e}"))?;

    let proof = SP1ProofWithPublicValues::load(&proof_path)
        .map_err(|e| format!("cannot load proof {proof_path}: {e}"))?;

    client
        .verify(&proof, pk.verifying_key(), None)
        .map_err(|e| format!("verification failed: {e}"))?;

    println!("PROOF VALID");
    Ok(())
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::from(0),
        Err(msg) => {
            eprintln!("PROOF INVALID: {msg}");
            ExitCode::from(1)
        }
    }
}
