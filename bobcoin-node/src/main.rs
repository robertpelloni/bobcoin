use libp2p::{
    core::upgrade,
    gossipsub,
    kad::{store::MemoryStore, Behaviour as KadBehaviour},
    mdns,
    noise,
    swarm::{NetworkBehaviour, SwarmEvent},
    tcp,
    yamux,
    Transport,
};
use libp2p::futures::StreamExt;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::time::Duration;
use tracing::{info, warn, error};
use std::env;
use serde::{Serialize, Deserialize};
use bobcoin_dance::{DanceOffSession, DanceMove, GrooveVerifier, BasicGrooveVerifier};
use bobcoin_core::Block;
use bobcoin_mining::SocialValueProof;

const VERSION: &str = include_str!("../../VERSION.md");

#[derive(Debug, Serialize, Deserialize)]
enum NetworkMessage {
    NewDance(DanceOffSession),
}

// Define the custom network behaviour that combines Gossipsub, Kademlia, and mDNS
#[derive(NetworkBehaviour)]
struct BobcoinBehaviour {
    gossipsub: gossipsub::Behaviour,
    kademlia: KadBehaviour<MemoryStore>,
    mdns: mdns::tokio::Behaviour,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();
    
    let args: Vec<String> = env::args().collect();
    if args.len() > 1 && args[1] == "--version" {
        println!("Bobcoin Node v{}", VERSION.trim());
        return Ok(());
    }

    info!("Starting Bobcoin Node v{}...", VERSION.trim());

    // 1. Generate an Identity Keypair
    let id_keys = libp2p::identity::Keypair::generate_ed25519();
    let peer_id = libp2p::PeerId::from(id_keys.public());
    info!("Local Peer ID: {}", peer_id);

    // 2. Build the Transport (TCP + Noise + Yamux)
    // Note: In production we will add QUIC for mobile optimization
    let transport = tcp::tokio::Transport::new(tcp::Config::default().nodelay(true))
        .upgrade(upgrade::Version::V1)
        .authenticate(noise::Config::new(&id_keys).expect("signing libp2p-noise static keypair"))
        .multiplex(yamux::Config::default())
        .boxed();

    // 3. Configure Gossipsub (The "PubSub" layer)
    // We hash messages by their content for deduplication
    let message_id_fn = |message: &gossipsub::Message| {
        let mut s = DefaultHasher::new();
        message.data.hash(&mut s);
        gossipsub::MessageId::from(s.finish().to_string())
    };

    let gossipsub_config = gossipsub::ConfigBuilder::default()
        .heartbeat_interval(Duration::from_secs(10)) // Slow heartbeat for battery saving
        .validation_mode(gossipsub::ValidationMode::Strict)
        .message_id_fn(message_id_fn)
        .build()
        .expect("Valid config");

    let gossipsub = gossipsub::Behaviour::new(
        gossipsub::MessageAuthenticity::Signed(id_keys.clone()),
        gossipsub_config,
    )?;

    // 4. Configure Kademlia (The Discovery layer)
    let kademlia = KadBehaviour::new(
        peer_id,
        MemoryStore::new(peer_id),
    );

    // 5. Configure mDNS (Local Discovery)
    let mdns = mdns::tokio::Behaviour::new(mdns::Config::default(), peer_id)?;

    // 6. Combine behaviors into the Swarm
    // Using the new SwarmBuilder API for libp2p v0.53
    let mut swarm = libp2p::SwarmBuilder::with_existing_identity(id_keys)
        .with_tokio()
        .with_other_transport(|_key| transport)?
        .with_behaviour(|_key| {
            BobcoinBehaviour {
                gossipsub,
                kademlia,
                mdns,
            }
        })?
        .with_swarm_config(|c| c.with_idle_connection_timeout(Duration::from_secs(60)))
        .build();

    // 7. Subscribe to the "dance-floor" topic
    let topic = gossipsub::IdentTopic::new("dance-floor");
    swarm.behaviour_mut().gossipsub.subscribe(&topic)?;

    // 8. Listen on all interfaces
    swarm.listen_on("/ip4/0.0.0.0/tcp/0".parse()?)?;

    // Simulation: Broadcast a dummy dance every 30 seconds
    let mut dance_interval = tokio::time::interval(Duration::from_secs(30));
    // Verify ourselves just for initialization
    let verifier = BasicGrooveVerifier;

    // 9. Event Loop
    loop {
        tokio::select! {
            _ = dance_interval.tick() => {
                // Construct a dummy session
                let dummy_session = DanceOffSession {
                    moves: vec![
                        DanceMove { name: "Robot".into(), duration: 3, intensity: 6 },
                        DanceMove { name: "Moonwalk".into(), duration: 5, intensity: 8 },
                    ],
                    timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs(),
                    location_hash: "coord_x_y".into(),
                    witness_id: peer_id.to_string(),
                    witness_signature: "simulated_sig_123".into(),
                    biometric_auth_passed: true,
                };
                
                let message = NetworkMessage::NewDance(dummy_session);
                match serde_json::to_vec(&message) {
                    Ok(bytes) => {
                        if let Err(e) = swarm.behaviour_mut().gossipsub.publish(topic.clone(), bytes) {
                            error!("Failed to publish dance: {:?}", e);
                        } else {
                            info!("💃 Broadcasting a new Dance Off session to the network!");
                        }
                    }
                    Err(e) => error!("Failed to serialize dance: {:?}", e),
                }
            }
            event = swarm.select_next_some() => match event {
                SwarmEvent::NewListenAddr { address, .. } => {
                    info!("Listening on {:?}", address);
                }
                SwarmEvent::Behaviour(BobcoinBehaviourEvent::Mdns(mdns::Event::Discovered(list))) => {
                    for (peer_id, multiaddr) in list {
                        info!("mDNS discovered a new peer: {}", peer_id);
                        swarm.behaviour_mut().gossipsub.add_explicit_peer(&peer_id);
                        swarm.behaviour_mut().kademlia.add_address(&peer_id, multiaddr);
                    }
                }
                SwarmEvent::Behaviour(BobcoinBehaviourEvent::Mdns(mdns::Event::Expired(list))) => {
                    for (peer_id, _multiaddr) in list {
                        info!("mDNS peer expired: {}", peer_id);
                        swarm.behaviour_mut().gossipsub.remove_explicit_peer(&peer_id);
                    }
                }
                SwarmEvent::Behaviour(BobcoinBehaviourEvent::Gossipsub(gossipsub::Event::Message {
                    propagation_source: peer_id,
                    message_id: id,
                    message,
                })) => {
                     // Deserialize and Verify
                     match serde_json::from_slice::<NetworkMessage>(&message.data) {
                        Ok(NetworkMessage::NewDance(session)) => {
                            info!("Received Dance Off from {}: {} moves", peer_id, session.moves.len());
                            
                            // Verification Logic
                            if verifier.verify_groove(&session) {
                                info!("✅ VALID GROOVE: Dance session {} verified successfully!", id);
                                
                                // Create a mock SocialValueProof
                                let mut social_proof = SocialValueProof::new(peer_id.to_string());
                                social_proof.exercise_score = 50.0;
                                social_proof.social_score = 60.0; // Total > 25.0

                                // Create a new Block
                                let block = Block::new(
                                    1, // Mock index
                                    vec![], // No transactions yet
                                    "00000000000000000000000000000000".to_string(), // Genesis previous hash
                                    Some(social_proof),
                                    Some(session),
                                );

                                info!("⛏️  MINED NEW BLOCK with Social Proof! Hash: {}", block.hash);
                            } else {
                                warn!("❌ WEAK SAUCE: Dance session {} failed verification.", id);
                            }
                        }
                        Err(e) => {
                            warn!("Received unparseable message from {}: {:?}", peer_id, e);
                        }
                    }
                }
                _ => {}
            }
        }
    }
}
