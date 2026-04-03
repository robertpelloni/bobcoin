package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

var db = NewDBManager("lattice.sqlite")
var lattice = NewLattice(db)

func main() {
	port := os.Getenv("LATTICE_PORT")
	if port == "" { port = "4001" } // Use 4001 to not conflict with Node node

	http.HandleFunc("/status", handleStatus)
	http.HandleFunc("/process", handleProcess)
	http.HandleFunc("/balance/", handleBalance)
	http.HandleFunc("/frontier/", handleFrontier)
	http.HandleFunc("/pools", handlePools)
	http.HandleFunc("/peers", handlePeers)
	http.HandleFunc("/blocks", handleBlocks)
	http.HandleFunc("/bootstrap", handleBootstrap)

	go gossipLoop()

	fmt.Printf("[Go-Lattice] Sovereign Consensus Node starting on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "online",
		"engine": "Go-Lattice v7.0.0",
		"stateHash": lattice.StateHash,
		"merkleRoot": lattice.MerkleRoot,
		"accounts": len(lattice.Chains),
	})
}

func handleProcess(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost { return }
	
	var payload struct {
		Block *Block `json:"block"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	if err := lattice.ProcessBlock(payload.Block, false); err != nil {
		fmt.Printf("[Lattice Error] %v\n", err)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
		return
	}

	fmt.Printf("[Lattice] Processed %s block for %s...\n", payload.Block.Type, payload.Block.Account[:8])
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "hash": payload.Block.Hash})
}

func handleBalance(w http.ResponseWriter, r *http.Request) {
	account := r.URL.Path[len("/balance/"):]
	balance := lattice.GetBalance(account, time.Now().UnixNano()/1e6)
	json.NewEncoder(w).Encode(map[string]interface{}{"balance": balance})
}

func handleFrontier(w http.ResponseWriter, r *http.Request) {
	account := r.URL.Path[len("/frontier/"):]
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()
	
	chain := lattice.Chains[account]
	var hash *string
	if len(chain) > 0 {
		h := chain[len(chain)-1].Hash
		hash = &h
	}
	json.NewEncoder(w).Encode(map[string]interface{}{"frontier": hash})
}

func handlePools(w http.ResponseWriter, r *http.Request) {
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()
	json.NewEncoder(w).Encode(lattice.Pools)
}

func handlePeers(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var payload struct { URL string `json:"url"` }
		json.NewDecoder(r.Body).Decode(&payload)
		lattice.mu.Lock()
		lattice.Peers[payload.URL] = &PeerInfo{URL: payload.URL, Status: "connected"}
		lattice.mu.Unlock()
		w.WriteHeader(200)
		return
	}
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()
	json.NewEncoder(w).Encode(lattice.Peers)
}

func handleBlocks(w http.ResponseWriter, r *http.Request) {
	after := r.URL.Query().Get("after")
	limitStr := r.URL.Query().Get("limit")
	limit := 100 // Default batch size
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil { limit = l }
	}

	lattice.mu.RLock()
	defer lattice.mu.RUnlock()

	delta, err := db.LoadBlocksAfter(after)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	// Apply limit
	if len(delta) > limit {
		delta = delta[:limit]
	}
	json.NewEncoder(w).Encode(delta)
}

func gossipLoop() {
	ticker := time.NewTicker(10 * time.Second)
	for range ticker.C {
		lattice.mu.RLock()
		peerURLs := make([]string, 0, len(lattice.Peers))
		for url := range lattice.Peers { peerURLs = append(peerURLs, url) }
		lattice.mu.RUnlock()

		for _, url := range peerURLs {
			start := time.Now()
			resp, err := http.Get(url + "/status")
			latency := time.Since(start).Milliseconds()
			
			lattice.mu.Lock()
			peer := lattice.Peers[url]
			if err != nil {
				if peer != nil { peer.Status = "offline" }
				lattice.mu.Unlock()
				continue
			}
			if peer != nil {
				peer.Status = "online"
				peer.Latency = latency
				peer.LastSeen = time.Now().Unix()
			}
			lattice.mu.Unlock()

			var stats map[string]interface{}
			json.NewDecoder(resp.Body).Decode(&stats)
			
			// Detect State Divergence
			remoteHash := stats["stateHash"].(string)
			if remoteHash != lattice.StateHash {
				fmt.Printf("[GOSSIP] State Divergence with %s! Initiating Batch Sync...\n", url)
				
				for {
					syncResp, err := http.Get(fmt.Sprintf("%s/blocks?after=%s&limit=100", url, lattice.StateHash))
					if err != nil { break }
					var newBlocks []*Block
					json.NewDecoder(syncResp.Body).Decode(&newBlocks)
					
					if len(newBlocks) == 0 { break }

					for _, b := range newBlocks {
						lattice.mu.RLock()
						_, exists := lattice.Blocks[b.Hash]
						lattice.mu.RUnlock()
						if !exists {
							lattice.ProcessBlock(b, false)
						}
					}
					fmt.Printf("[SYNC] Integrated batch of %d blocks from %s\n", len(newBlocks), url)
					if len(newBlocks) < 100 { break } // Finished syncing
				}
			}
		}
	}
}

func handleBootstrap(w http.ResponseWriter, r *http.Request) {
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()
	json.NewEncoder(w).Encode(lattice)
}
