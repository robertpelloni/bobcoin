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
use std::io::{BufRead, BufReader, Write};
use std::net::TcpListener;
use std::process::ExitCode;

fn arg_value(args: &[String], name: &str) -> Option<String> {
    args.windows(2)
        .find(|w| w[0] == name)
        .map(|w| w[1].clone())
}

/// Long-lived daemon: runs the expensive `client.setup(elf)` once, then
/// verifies proofs sent over TCP. Protocol per connection: send
/// "<byte-length>\n" followed by the raw serialized proof bytes, read back
/// "VALID\n" or "INVALID <reason>\n". Bytes (not a file path) because
/// verifying a proof loaded from the Windows 9p mount (/mnt/c) takes
/// minutes vs ~1s from WSL-native storage. Start with:
///   proof-of-play-verifier --serve 127.0.0.1:9823 --elf <program-elf>
fn serve(addr: &str, elf_path: &str) -> Result<(), String> {
    let elf_bytes =
        std::fs::read(elf_path).map_err(|e| format!("cannot read ELF {elf_path}: {e}"))?;
    let client = ProverClient::from_env();
    let pk = client
        .setup(Elf::from(elf_bytes))
        .map_err(|e| format!("setup failed: {e}"))?;
    let listener = TcpListener::bind(addr).map_err(|e| format!("cannot bind {addr}: {e}"))?;
    println!("SP1 VERIFIER DAEMON READY {addr}");
    // Sequential by design: concurrent EnvProver::verify calls deadlock
    // (observed idle-stuck threads in v8.117.6 testing). One verification
    // at a time; compressed proofs verify in ~1s so the queue stays short.
    for stream in listener.incoming() {
        let mut stream = match stream {
            Ok(s) => s,
            Err(_) => continue,
        };
        use std::io::Read;
        let mut line = String::new();
        let proof_path = match stream.try_clone() {
            Ok(cloned) => {
                let mut reader = BufReader::new(cloned);
                let len: usize = match reader.read_line(&mut line) {
                    Ok(_) => match line.trim().parse() {
                        Ok(n) => n,
                        Err(_) => continue,
                    },
                    Err(_) => continue,
                };
                if len > 64 * 1024 * 1024 {
                    continue;
                }
                let mut bytes = vec![0u8; len];
                match reader.read_exact(&mut bytes) {
                    Ok(()) => {
                        // Stage in native temp storage: SP1 load/verify over
                        // the 9p mount is ~200x slower than native fs.
                        let staged = std::env::temp_dir()
                            .join(format!("sp1_daemon_proof_{}.bin", std::process::id()));
                        match std::fs::write(&staged, &bytes) {
                            Ok(()) => staged,
                            Err(_) => continue,
                        }
                    }
                    Err(_) => continue,
                }
            }
            Err(_) => continue,
        };
        let verdict = match SP1ProofWithPublicValues::load(&proof_path) {
            Ok(proof) => match client.verify(&proof, pk.verifying_key(), None) {
                Ok(()) => "VALID".to_string(),
                Err(e) => format!("INVALID verification failed: {e}"),
            },
            Err(e) => format!("INVALID cannot load proof: {e}"),
        };
        let _ = std::fs::remove_file(&proof_path);
        let _ = stream.write_all(format!("{verdict}\n").as_bytes());
    }
    Ok(())
}

fn run() -> Result<(), String> {
    let args: Vec<String> = std::env::args().collect();
    if let Some(pos) = args.iter().position(|a| a == "--serve") {
        let addr = args.get(pos + 1).cloned().ok_or("missing --serve <addr>")?;
        let elf_path = arg_value(&args, "--elf").ok_or("missing --elf <path>")?;
        return serve(&addr, &elf_path);
    }
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
