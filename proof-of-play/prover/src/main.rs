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
use sp1_sdk::blocking::{ProveRequest, Prover, ProverClient, SP1ProofMode};
use sp1_sdk::{Elf, SP1Stdin};
use std::io::{Read, Write};
use std::net::TcpListener;
use std::process::ExitCode;
use std::sync::{Arc, Mutex};

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

#[derive(Deserialize)]
struct ProveRequestBody {
    score: u32,
    keystrokes: Vec<u64>,
}

/// Proving sidecar: POST /prove {"score":2000,"keystrokes":[75,215,...]}
/// -> {"proofBytesB64":"..."}. Proving is serialized (one CPU proof at a
/// time) and slow (minutes for compressed); GET /health -> "ok".
/// The browser mints through this sidecar, then submits the proof to the
/// Go game-server, which verifies it via the SP1 verifier daemon.
fn serve(addr: &str, elf_path: &str) -> Result<(), String> {
    let elf_bytes =
        std::fs::read(elf_path).map_err(|e| format!("cannot read ELF {elf_path}: {e}"))?;
    let client = ProverClient::from_env();
    let pk = Arc::new(
        client
            .setup(Elf::from(elf_bytes))
            .map_err(|e| format!("setup failed: {e}"))?,
    );
    let client = Arc::new(client);
    let prove_lock = Arc::new(Mutex::new(()));
    let listener = TcpListener::bind(addr).map_err(|e| format!("cannot bind {addr}: {e}"))?;
    println!("SP1 PROVER SIDECAR READY {addr}");
    for stream in listener.incoming() {
        let mut stream = match stream {
            Ok(s) => s,
            Err(_) => continue,
        };
        let client = client.clone();
        let pk = pk.clone();
        let prove_lock = prove_lock.clone();
        std::thread::spawn(move || {
            let mut buf = Vec::new();
            let mut chunk = [0u8; 8192];
            // Read headers, then Content-Length bytes of body.
            let mut content_length = 0usize;
            let mut header_done = false;
            loop {
                match stream.read(&mut chunk) {
                    Ok(0) => break,
                    Ok(n) => {
                        buf.extend_from_slice(&chunk[..n]);
                        if !header_done {
                            if let Some(pos) = find_subslice(&buf, b"\r\n\r\n") {
                                header_done = true;
                                let head = String::from_utf8_lossy(&buf[..pos]).to_lowercase();
                                for line in head.lines() {
                                    if let Some(v) = line.strip_prefix("content-length:") {
                                        content_length = v.trim().parse().unwrap_or(0);
                                    }
                                }
                                if buf.len() >= pos + 4 + content_length {
                                    break;
                                }
                            }
                        } else if buf.len() >= content_length {
                            break;
                        }
                    }
                    Err(_) => return,
                }
                if buf.len() > 8 * 1024 * 1024 {
                    break;
                }
            }
            let text = String::from_utf8_lossy(&buf).to_string();
            let (status, body) = if text.starts_with("GET /health") {
                ("200 OK", "{\"status\":\"ok\"}".to_string())
            } else if text.starts_with("POST /prove") {
                let json_start = text.find('{').unwrap_or(text.len());
                match serde_json::from_str::<ProveRequestBody>(&text[json_start..]) {
                    Ok(req) => {
                        let _guard = prove_lock.lock().unwrap();
                        let mut stdin = SP1Stdin::new();
                        stdin.write(&GameInput {
                            score: req.score,
                            keystrokes: req.keystrokes,
                        });
                        match client.prove(&pk, stdin).mode(SP1ProofMode::Compressed).run() {
                            Ok(proof) => {
                                let tmp = std::env::temp_dir().join(format!(
                                    "pop_sidecar_proof_{}.bin",
                                    std::process::id()
                                ));
                                match proof.save(&tmp) {
                                    Ok(()) => match std::fs::read(&tmp) {
                                        Ok(bytes) => (
                                            "200 OK",
                                            serde_json::json!({
                                                "proofBytesB64": base64_encode(&bytes)
                                            })
                                            .to_string(),
                                        ),
                                        Err(e) => ("500 Internal Server Error", format!("{{\"error\":\"read proof: {e}\"}}")),
                                    },
                                    Err(e) => ("500 Internal Server Error", format!("{{\"error\":\"save proof: {e}\"}}")),
                                }
                            }
                            Err(e) => ("500 Internal Server Error", format!("{{\"error\":\"proving failed: {e}\"}}")),
                        }
                    }
                    Err(e) => ("400 Bad Request", format!("{{\"error\":\"bad request: {e}\"}}")),
                }
            } else {
                ("404 Not Found", "{\"error\":\"not found\"}".to_string())
            };
            let response = format!(
                "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n{body}",
                body.len()
            );
            let _ = stream.write_all(response.as_bytes());
        });
    }
    Ok(())
}

fn find_subslice(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .position(|w| w == needle)
}

fn base64_encode(data: &[u8]) -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(data.len().div_ceil(3) * 4);
    for chunk in data.chunks(3) {
        let b = [chunk[0], *chunk.get(1).unwrap_or(&0), *chunk.get(2).unwrap_or(&0)];
        let n = ((b[0] as u32) << 16) | ((b[1] as u32) << 8) | b[2] as u32;
        out.push(ALPHABET[(n >> 18) as usize & 63] as char);
        out.push(ALPHABET[(n >> 12) as usize & 63] as char);
        out.push(if chunk.len() > 1 { ALPHABET[(n >> 6) as usize & 63] as char } else { '=' });
        out.push(if chunk.len() > 2 { ALPHABET[n as usize & 63] as char } else { '=' });
    }
    out
}

fn run() -> Result<(), String> {
    let args: Vec<String> = std::env::args().collect();
    if let Some(pos) = args.iter().position(|a| a == "--serve") {
        let addr = args.get(pos + 1).cloned().ok_or("missing --serve <addr>")?;
        let elf_path = arg_value(&args, "--elf").ok_or("missing --elf <path>")?;
        return serve(&addr, &elf_path);
    }
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

    // Compressed proofs verify far faster than core proofs (the daemon
    // spent minutes verifying a core proof); proving takes longer but
    // happens once, on the prover side.
    let proof = client
        .prove(&pk, stdin)
        .mode(SP1ProofMode::Compressed)
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
