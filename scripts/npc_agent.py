import urllib.request
import json
import random
import time

API_URL = "http://localhost:3001"

def generate_random_address():
    return 'npc_' + ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=16))

def simulate_npc_minting():
    print("[NPC-Agent] Bootstrapping liquidity: Generating simulated Proof-of-Play...")
    proof_payload = {
        "proof": {
            "playerId": generate_random_address(),
            "score": random.randint(1500, 5000),
            "publicValues": {
                "address": generate_random_address(),
                "score": random.randint(1500, 5000),
                "replayLog": [{"time": i*100, "action": "press"} for i in range(10)]
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
