use actix_web::{web, App, HttpServer, HttpResponse, Responder};
use sp1_sdk::{ProverClient, SP1Stdin};
use serde::{Deserialize, Serialize};

// Compile-time ELF embedding
const ELF: &[u8] = include_bytes!("../../program/elf/riscv32im-succinct-zkvm-elf");

#[derive(Serialize, Deserialize, Debug)]
struct GameStats {
    score: u32,
    perfects: u32,
    greats: u32,
    misses: u32,
}

#[derive(Serialize, Deserialize, Debug)]
struct ProofRequest {
    playerId: String,
    publicValues: GameStats,
    proofBytes: Option<String> // Base64 or similar, optional for now in simulation
}

async fn verify(req: web::Json<ProofRequest>) -> impl Responder {
    println!("[ZK-Service] Received verification request for player: {}", req.playerId);
    
    // In a real ZK verifier, we would:
    // 1. Decode proofBytes
    // 2. Verify against VK
    // 3. Ensure public inputs match req.publicValues

    // For now, we utilize the SP1 Prover Client to EXECUTE the trace 
    // to ensure the public values are valid according to the circuit logic.
    // This is "Server-Side Proving" as a validation step.

    let client = ProverClient::new();
    let mut stdin = SP1Stdin::new();
    stdin.write(&req.publicValues);

    println!("[ZK-Service] Executing Circuit to validate logic...");
    
    match client.execute(ELF, stdin).run() {
        Ok((output, report)) => {
            let committed_score = output.as_slice();
            println!("[ZK-Service] Circuit Execution Successful. Committed Score bytes: {:?}", committed_score);
            println!("[ZK-Service] Report: {:?}", report);

            // TODO: Decode committed_score from bytes to u32 and compare with req.publicValues.score

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "status": "Verified",
                "method": "ExecutionTrace" 
            }))
        },
        Err(e) => {
            println!("[ZK-Service] Circuit Execution Failed: {}", e);
            HttpResponse::BadRequest().json(serde_json::json!({
                "success": false,
                "error": e.to_string()
            }))
        }
    }
}

async fn health() -> impl Responder {
    HttpResponse::Ok().body("ZK Service Ready")
}

#[tokio::main]
async fn main() -> std::io::Result<()> {
    println!("[ZK-Service] Starting server on 0.0.0.0:8080");
    
    HttpServer::new(|| {
        App::new()
            .route("/verify", web::post().to(verify))
            .route("/health", web::get().to(health))
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}
