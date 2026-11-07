import urllib.request
import json
import random
import time

API_URL = "http://localhost:3001"

def generate_random_address():
    return 'npc_' + ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=16))

def simulate_npc_minting():
    print("[NPC-Agent] Bootstrapping liquidity: Generating simulated Proof-of-Play...")
    # Generate human-like jitter with diverse multi-bucket reaction intervals so AI Oracle accepts the proof
    curr_time = 0
    replay_log = []
    for _ in range(12):
        curr_time += random.randint(70, 180)
        replay_log.append({"time": float(curr_time), "action": "press"})

    proof_payload = {
        "proof": {
            "playerId": generate_random_address(),
            "score": random.randint(1500, 5000),
            "publicValues": {
                "address": generate_random_address(),
                "score": random.randint(1500, 5000),
                "replayLog": replay_log
            },
            "simulated": True
        }
    }

    req = urllib.request.Request(
        f'{API_URL}/submit-proof',
        data=json.dumps(proof_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )

    try:
        response = urllib.request.urlopen(req)
        print(f"[NPC-Agent] Mint successful! Mined {proof_payload['proof']['score']} BOB.")
    except Exception as e:
        print(f"[NPC-Agent] Mint failed: {e}")

if __name__ == '__main__':
    time.sleep(10) # Wait for backend services to boot
    while True:
        simulate_npc_minting()
        time.sleep(random.randint(10, 30))
