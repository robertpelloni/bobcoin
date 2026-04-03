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
		"engine": "Go-Lattice v5.0.0-alpha",
		"stateHash": lattice.StateHash,
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
		lattice.Peers[payload.URL] = "connected"
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
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()

	var delta []*Block
	found := false
	if after == "" { found = true }

	// Simple linear scan for prototype (In production, use index)
	// We'll return blocks in order of creation
	allBlocks, _ := db.LoadAllBlocks()
	for _, b := range allBlocks {
		if found {
			delta = append(delta, b)
		} else if b.Hash == after {
			found = true
		}
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
			resp, err := http.Get(url + "/status")
			if err != nil { continue }
			var stats map[string]interface{}
			json.NewDecoder(resp.Body).Decode(&stats)
			
			// Detect State Divergence
			remoteHash := stats["stateHash"].(string)
			if remoteHash != lattice.StateHash {
				fmt.Printf("[GOSSIP] State Divergence detected with %s! Attempting Auto-Sync...\n", url)
				
				// Fetch missing blocks
				// We'll sync by finding the first common block or start from genesis
				// For this alpha, we just fetch blocks we don't have
				syncResp, err := http.Get(url + "/blocks")
				if err != nil { continue }
				var newBlocks []*Block
				json.NewDecoder(syncResp.Body).Decode(&newBlocks)

				for _, b := range newBlocks {
					lattice.mu.RLock()
					_, exists := lattice.Blocks[b.Hash]
					lattice.mu.RUnlock()
					if !exists {
						fmt.Printf("[SYNC] Integrating block %s from %s\n", b.Hash[:8], url)
						lattice.ProcessBlock(b, false)
					}
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
