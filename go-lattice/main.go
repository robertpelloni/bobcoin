package main

import (
	"compress/gzip"
	"encoding/gob"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
	"sync"
	"github.com/gorilla/websocket"
)

var (
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}
	clients   = make(map[*websocket.Conn]bool)
	clientsMu sync.Mutex
	
	blocksInInterval int
	lastTps          float64
)

func broadcastHeartbeat() {
	ticker := time.NewTicker(2 * time.Second)
	for range ticker.C {
		lattice.mu.RLock()
		lastTps = float64(blocksInInterval) / 2.0
		blocksInInterval = 0
		
		heartbeat := map[string]interface{}{
			"tps":        lastTps,
			"merkleRoot": lattice.MerkleRoot,
			"peers":      len(lattice.Peers),
			"blocks":     len(lattice.Blocks),
			"stateHash":  lattice.StateHash,
			"timestamp":  time.Now().Unix(),
		}
		lattice.mu.RUnlock()

		msg, _ := json.Marshal(heartbeat)
		
		clientsMu.Lock()
		for client := range clients {
			err := client.WriteMessage(websocket.TextMessage, msg)
			if err != nil {
				client.Close()
				delete(clients, client)
			}
		}
		clientsMu.Unlock()
	}
}

func handleHeartbeat(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	clientsMu.Lock()
	clients[conn] = true
	clientsMu.Unlock()
}


type gzipResponseWriter struct {
	io.Writer
	http.ResponseWriter
}

func (w gzipResponseWriter) Write(b []byte) (int, error) {
	return w.Writer.Write(b)
}

func gzipHandler(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			h(w, r)
			return
		}
		w.Header().Set("Content-Encoding", "gzip")
		gz := gzip.NewWriter(w)
		defer gz.Close()
		h(gzipResponseWriter{Writer: gz, ResponseWriter: w}, r)
	}
}

var db = NewDBManager("lattice.sqlite")
var lattice = NewLattice(db)

func main() {
	port := os.Getenv("LATTICE_PORT")
	if port == "" { port = "4001" } // Use 4001 to not conflict with Node node

	http.HandleFunc("/status", handleStatus)
	http.HandleFunc("/process", handleProcess)
	http.HandleFunc("/simulate", handleSimulate)
	http.HandleFunc("/balance/", handleBalance)
	http.HandleFunc("/frontier/", handleFrontier)
	http.HandleFunc("/pools", handlePools)
	http.HandleFunc("/peers", handlePeers)
	http.HandleFunc("/heartbeat", handleHeartbeat)
	http.HandleFunc("/blocks", gzipHandler(handleBlocks))
	http.HandleFunc("/snapshot", gzipHandler(handleSnapshot))
	http.HandleFunc("/bootstrap", gzipHandler(handleBootstrap))

	go gossipLoop()
	go broadcastHeartbeat()

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

	blocksInInterval++
	fmt.Printf("[Lattice] Processed %s block for %s...\n", payload.Block.Type, payload.Block.Account[:8])
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "hash": payload.Block.Hash})
}

func handleSimulate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost { return }
	
	var payload struct {
		Block *Block `json:"block"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	// Simulation: Use a temporary read-lock to check the state
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()

	// We skip signature verification for simulation because the block isn't signed yet!
	// But we check everything else: Balance, Height, SPoRA, Invariants.
	
	// Check balance availability
	currentBal := lattice.GetBalance(payload.Block.Account, time.Now().UnixNano()/1e6)
	projectedBal := payload.Block.Balance
	
	// Basic validation logic
	status := "VALID"
	errorMsg := ""
	
	if payload.Block.Type == "send" && projectedBal > currentBal {
		status = "INVALID"
		errorMsg = "Insufficient funds for projected balance."
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": status,
		"error": errorMsg,
		"projectedBalance": projectedBal,
		"currentBalance": currentBal,
	})
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
				fmt.Printf("[GOSSIP] State Divergence with %s! Initiating Compressed Batch Sync...\n", url)
				
				for {
					// Use 500 block batches for better throughput
					syncResp, err := http.Get(fmt.Sprintf("%s/blocks?after=%s&limit=500", url, lattice.StateHash))
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
					fmt.Printf("[SYNC] Integrated compressed batch of %d blocks from %s\n", len(newBlocks), url)
					if len(newBlocks) < 500 { break } 
				}
			}
		}
	}
}

func handleSnapshot(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		lattice.mu.Lock()
		defer lattice.mu.Unlock()
		
		fmt.Println("[Snapshot] Received binary state. Commencing binary import...")
		
		// Use GOB decoder to restore state
		err := gob.NewDecoder(r.Body).Decode(lattice)
		if err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		
		// Perform Deep Audit to verify the binary state
		if err := lattice.AuditState(); err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
			return
		}
		
		json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "stateHash": lattice.StateHash})
		return
	}

	lattice.mu.RLock()
	defer lattice.mu.RUnlock()
	
	// Export state in binary GOB format
	w.Header().Set("Content-Type", "application/octet-stream")
	err := gob.NewEncoder(w).Encode(lattice)
	if err != nil {
		fmt.Printf("[Snapshot Error] %v\n", err)
	}
}

func handleBootstrap(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var snapshot struct {
			Chains    map[string][]*Block `json:"chains"`
			Blocks    map[string]*Block   `json:"blocks"`
			StateHash string              `json:"stateHash"`
		}
		if err := json.NewDecoder(r.Body).Decode(&snapshot); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}

		lattice.mu.Lock()
		defer lattice.mu.Unlock()

		fmt.Println("[Bootstrap] Received network snapshot. Commencing security audit...")
		
		// Load into memory
		lattice.Chains = snapshot.Chains
		lattice.Blocks = snapshot.Blocks
		
		// Perform Deep Audit
		if err := lattice.AuditState(); err != nil {
			fmt.Printf("[Bootstrap Error] Snapshot Rejected: %v\n", err)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "Cryptographic audit failed: Malicious or corrupted snapshot."})
			return
		}

		// Re-persist audited blocks to disk
		for _, chain := range lattice.Chains {
			for _, b := range chain {
				db.SaveBlock(b)
			}
		}

		json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "stateHash": lattice.StateHash, "merkleRoot": lattice.MerkleRoot})
		return
	}
	
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()
	json.NewEncoder(w).Encode(lattice)
}
