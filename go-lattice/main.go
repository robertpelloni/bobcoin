package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

var lattice = NewLattice()

func main() {
	port := os.Getenv("LATTICE_PORT")
	if port == "" { port = "4001" } // Use 4001 to not conflict with Node node

	http.HandleFunc("/status", handleStatus)
	http.HandleFunc("/process", handleProcess)
	http.HandleFunc("/balance/", handleBalance)
	http.HandleFunc("/frontier/", handleFrontier)
	http.HandleFunc("/bootstrap", handleBootstrap)

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

	if err := lattice.ProcessBlock(payload.Block); err != nil {
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

func handleBootstrap(w http.ResponseWriter, r *http.Request) {
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()
	json.NewEncoder(w).Encode(lattice)
}
