package main

import (
	"compress/gzip"
	"encoding/gob"
	"encoding/json"
	"fmt"
	"github.com/gorilla/websocket"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}
	clients   = make(map[*websocket.Conn]bool)
	clientsMu sync.Mutex

	blocksInInterval int
	lastTps          float64
	latticePort      string
)

func broadcastHeartbeat() {
	ticker := time.NewTicker(2 * time.Second)
	for range ticker.C {
		lattice.mu.RLock()
		lastTps = float64(blocksInInterval) / 2.0
		blocksInInterval = 0

		heartbeat := map[string]interface{}{
			"type":       "STATS",
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
	latticePort = os.Getenv("LATTICE_PORT")
	if latticePort == "" {
		latticePort = "4001"
	} // Use 4001 to not conflict with Node node

	http.HandleFunc("/status", handleStatus)
	http.HandleFunc("/process", handleProcess)
	// http.HandleFunc("/simulate", handleSimulate) // Not implemented in this version
	http.HandleFunc("/balance/", handleBalance)
	http.HandleFunc("/frontier", handleFrontiers)
	http.HandleFunc("/frontier/", handleFrontier)
	http.HandleFunc("/pending/", handlePending)
	http.HandleFunc("/chain/", handleChain)
	http.HandleFunc("/anchors", handleAnchors)
	http.HandleFunc("/anchors/", handleAccountAnchors)
	http.HandleFunc("/proposals", handleProposals)
	http.HandleFunc("/votes/", handleVotes)
	http.HandleFunc("/market/bids", handleMarketBids)
	http.HandleFunc("/nfts", handleNFTs)
	http.HandleFunc("/nfts/", handleAccountNFTs)
	http.HandleFunc("/multisigs", handleMultisigs)
	http.HandleFunc("/multisig/", handleMultisigAccount)
	http.HandleFunc("/pools", handlePools)
	http.HandleFunc("/peers", handlePeers)
	http.HandleFunc("/health", handleHealth)
	http.HandleFunc("/heartbeat", handleHeartbeat)
	http.HandleFunc("/blocks", gzipHandler(handleBlocks))
	http.HandleFunc("/sync/bloom", handleBloomSync)
	http.HandleFunc("/snapshot", gzipHandler(handleSnapshot))
	http.HandleFunc("/bootstrap", gzipHandler(handleBootstrap))

	go gossipLoop()
	go broadcastHeartbeat()

	log.Printf("[Go-Lattice] Sovereign Consensus Node starting on port %s", latticePort)
	log.Fatal(http.ListenAndServe(":"+latticePort, nil))
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":      "online",
		"engine":      "Go-Lattice v8.107.3",
		"stateHash":   lattice.StateHash,
		"merkleRoot":  lattice.MerkleRoot,
		"accounts":    len(lattice.Chains),
		"blocks":      len(lattice.Blocks),
		"identities":  lattice.Identities,
		"trustScores": lattice.TrustScores,
	})
}

func handleProcess(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		return
	}

	var payload struct {
		Block *Block `json:"block"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	if payload.Block == nil {
		http.Error(w, "missing block payload", 400)
		return
	}

	normalizeLegacyBlock(payload.Block)

	if err := lattice.ProcessBlock(payload.Block, false); err != nil {
		fmt.Printf("[Lattice Error] %v\n", err)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
		return
	}

	blocksInInterval++
	broadcastBlock(payload.Block)
	fmt.Printf("[Lattice] Processed %s block for %s...\n", payload.Block.Type, payload.Block.Account[:8])
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "hash": payload.Block.Hash})
}

func broadcastBlock(block *Block) {
	msg, _ := json.Marshal(map[string]interface{}{
		"type":  "NEW_BLOCK",
		"block": block,
	})
	clientsMu.Lock()
	for client := range clients {
		_ = client.WriteMessage(websocket.TextMessage, msg)
	}
	clientsMu.Unlock()
}

func normalizeLegacyBlock(block *Block) {
	if block == nil {
		return
	}

	if block.Timestamp == 0 {
		block.Timestamp = time.Now().UnixNano() / 1e6
	}

	lattice.mu.RLock()
	chain := lattice.Chains[block.Account]
	var head *Block
	if len(chain) > 0 {
		head = chain[len(chain)-1]
	}
	lattice.mu.RUnlock()

	if head == nil {
		return
	}

	if block.Height == 0 && block.Type != "open" {
		block.Height = head.Height + 1
	}

	if block.StakedBalance == 0 && block.Type != "stake_lock" && block.Type != "stake_unlock" {
		block.StakedBalance = head.StakedBalance
	}
}

func handleBalance(w http.ResponseWriter, r *http.Request) {
	account := r.URL.Path[len("/balance/"):]
	balance := lattice.GetBalance(account, time.Now().UnixNano()/1e6)
	json.NewEncoder(w).Encode(map[string]interface{}{"balance": balance})
}

func handleFrontiers(w http.ResponseWriter, r *http.Request) {
	now := time.Now().UnixNano() / 1e6
	lattice.mu.RLock()
	accounts := make(map[string]interface{}, len(lattice.Chains))
	for account, chain := range lattice.Chains {
		var hash *string
		stakedBalance := 0.0
		balance := 0.0
		if len(chain) > 0 {
			head := chain[len(chain)-1]
			h := head.Hash
			hash = &h
			stakedBalance = head.StakedBalance
			elapsed := now - head.Timestamp
			if elapsed <= 0 {
				balance = head.Balance
			} else {
				decay := head.Balance * lattice.DemurrageRate * float64(elapsed)
				if head.Balance > decay {
					balance = head.Balance - decay
				}
			}
		}
		accounts[account] = map[string]interface{}{
			"balance":        balance,
			"staked_balance": stakedBalance,
			"height":         len(chain),
			"headHash":       hash,
			"balances":       lattice.Balances[account],
		}
	}
	lattice.mu.RUnlock()
	json.NewEncoder(w).Encode(accounts)
}

func handleFrontier(w http.ResponseWriter, r *http.Request) {
	account := r.URL.Path[len("/frontier/"):]
	now := time.Now().UnixNano() / 1e6
	lattice.mu.RLock()
	chain := lattice.Chains[account]
	var hash *string
	balance := 0.0
	stakedBalance := 0.0
	if len(chain) > 0 {
		head := chain[len(chain)-1]
		h := head.Hash
		hash = &h
		elapsed := now - head.Timestamp
		if elapsed <= 0 {
			balance = head.Balance
		} else {
			decay := head.Balance * lattice.DemurrageRate * float64(elapsed)
			if head.Balance > decay {
				balance = head.Balance - decay
			}
		}
		stakedBalance = head.StakedBalance
	}
	height := len(chain)
	lattice.mu.RUnlock()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"frontier":       hash,
		"balance":        balance,
		"staked_balance": stakedBalance,
		"height":         height,
		"balances":       lattice.Balances[account],
	})
}

func handlePending(w http.ResponseWriter, r *http.Request) {
	account := r.URL.Path[len("/pending/"):]
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()
	pending := lattice.Pending[account]
	if pending == nil {
		pending = []*PendingTx{}
	}
	json.NewEncoder(w).Encode(map[string]interface{}{"pending": pending})
}

func handleChain(w http.ResponseWriter, r *http.Request) {
	account := r.URL.Path[len("/chain/"):]
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()
	chain := lattice.Chains[account]
	if chain == nil {
		chain = []*Block{}
	}
	json.NewEncoder(w).Encode(map[string]interface{}{"chain": chain})
}

func handleAnchors(w http.ResponseWriter, r *http.Request) {
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()
	anchors := make([]interface{}, 0, len(lattice.Anchors))
	for _, anchor := range lattice.Anchors {
		anchors = append(anchors, anchor)
	}
	json.NewEncoder(w).Encode(map[string]interface{}{"anchors": anchors})
}

func handleAccountAnchors(w http.ResponseWriter, r *http.Request) {
	account := r.URL.Path[len("/anchors/"):]
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()
	anchors := make([]interface{}, 0)
	for _, anchorRaw := range lattice.Anchors {
		anchor, ok := anchorRaw.(map[string]interface{})
		if ok {
			owner, _ := anchor["owner"].(string)
			if owner == account {
				anchors = append(anchors, anchor)
			}
		}
	}
	json.NewEncoder(w).Encode(map[string]interface{}{"anchors": anchors})
}

func handleProposals(w http.ResponseWriter, r *http.Request) {
	lattice.mu.Lock()
	lattice.refreshProposalStatusesAt(time.Now())
	proposals := make([]interface{}, 0, len(lattice.Proposals))
	for _, proposal := range lattice.Proposals {
		proposals = append(proposals, proposal)
	}
	lattice.mu.Unlock()
	json.NewEncoder(w).Encode(proposals)
}

func handleVotes(w http.ResponseWriter, r *http.Request) {
	proposalHash := r.URL.Path[len("/votes/"):]
	lattice.mu.Lock()
	lattice.refreshProposalStatusesAt(time.Now())
	votes := lattice.Votes[proposalHash]
	if votes == nil {
		votes = map[string]map[string]interface{}{}
	}
	lattice.mu.Unlock()
	json.NewEncoder(w).Encode(votes)
}

func handleMarketBids(w http.ResponseWriter, r *http.Request) {
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()
	bids := make([]interface{}, 0, len(lattice.MarketBids))
	for _, bidRaw := range lattice.MarketBids {
		bid, ok := bidRaw.(map[string]interface{})
		if ok && bid["status"] == "OPEN" {
			bids = append(bids, bid)
		}
	}
	json.NewEncoder(w).Encode(map[string]interface{}{"bids": bids})
}

func handleNFTs(w http.ResponseWriter, r *http.Request) {
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()
	nfts := make([]interface{}, 0, len(lattice.Nfts))
	for _, nft := range lattice.Nfts {
		nfts = append(nfts, nft)
	}
	json.NewEncoder(w).Encode(map[string]interface{}{"nfts": nfts})
}

func handleAccountNFTs(w http.ResponseWriter, r *http.Request) {
	account := r.URL.Path[len("/nfts/"):]
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()
	nfts := make([]interface{}, 0)
	for _, nftRaw := range lattice.Nfts {
		nft, ok := nftRaw.(map[string]interface{})
		if ok {
			owner, _ := nft["owner"].(string)
			if owner == account {
				nfts = append(nfts, nft)
			}
		}
	}
	json.NewEncoder(w).Encode(map[string]interface{}{"nfts": nfts})
}

func handleMultisigs(w http.ResponseWriter, r *http.Request) {
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()
	json.NewEncoder(w).Encode(map[string]interface{}{"multisigs": lattice.Multisigs})
}

func handleMultisigAccount(w http.ResponseWriter, r *http.Request) {
	account := r.URL.Path[len("/multisig/"):]
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()
	vault, ok := lattice.Multisigs[account]
	if !ok {
		json.NewEncoder(w).Encode(map[string]interface{}{"error": "Multisig not found"})
		return
	}
	json.NewEncoder(w).Encode(vault)
}

func handlePools(w http.ResponseWriter, r *http.Request) {
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()
	json.NewEncoder(w).Encode(lattice.Pools)
}

func handlePeers(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var payload struct {
			URL string `json:"url"`
		}
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
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
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

func handleHealth(w http.ResponseWriter, r *http.Request) {
	lattice.mu.RLock()
	defer lattice.mu.RUnlock()

	agreeCount := 0
	for _, p := range lattice.Peers {
		if p.Status == "online" && p.MerkleRoot == lattice.MerkleRoot {
			agreeCount++
		}
	}

	quorum := 100.0
	if len(lattice.Peers) > 0 {
		quorum = (float64(agreeCount) / float64(len(lattice.Peers))) * 100.0
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"quorum":    quorum,
		"tps":       lastTps,
		"peers":     len(lattice.Peers),
		"stateHash": lattice.StateHash,
		"merkle":    lattice.MerkleRoot,
		"blocks":    len(lattice.Blocks),
	})
}

func gossipLoop() {
	// Gossip Mesh Optimization: Use adaptive intervals and peer scoring
	interval := 5 * time.Second
	ticker := time.NewTicker(interval)
	for range ticker.C {
		lattice.mu.RLock()
		peerURLs := make([]string, 0, len(lattice.Peers))
		for url, peer := range lattice.Peers {
			if peer.Status != "banned" {
				peerURLs = append(peerURLs, url)
			}
		}
		lattice.mu.RUnlock()

		for _, url := range peerURLs {
			start := time.Now()
			resp, err := http.Get(url + "/status")
			latency := time.Since(start).Milliseconds()

			lattice.mu.Lock()
			peer := lattice.Peers[url]
			if err != nil {
				if peer != nil {
					peer.Status = "offline"
					// Prune old peers
					if time.Now().Unix()-peer.LastSeen > 300 {
						delete(lattice.Peers, url)
						fmt.Printf("[GOSSIP] Pruned stale peer: %s\n", url)
					}
				}
				lattice.mu.Unlock()
				continue
			}

			var stats map[string]interface{}
			json.NewDecoder(resp.Body).Decode(&stats)

			remoteMerkle := stats["merkleRoot"].(string)
			remoteBlocks := int(stats["blocks"].(float64))
			if peer != nil {
				peer.Status = "online"
				peer.Latency = latency
				peer.LastSeen = time.Now().Unix()
				peer.MerkleRoot = remoteMerkle
				peer.Blocks = remoteBlocks

				// Adaptive peer scoring: high latency nodes are de-prioritized
				if latency > 1000 {
					log.Printf("[GOSSIP] Slow peer detected: %s (%d ms). Reducing reputation.", url, latency)
					peer.Score -= 5
				} else if latency < 100 {
					peer.Score += 2
				}
				if peer.Score < 0 {
					peer.Score = 0
				}
				if peer.Score > 100 {
					peer.Score = 100
				}
			}

			// Peer Discovery: Request their peer list
			peerResp, err := http.Get(url + "/peers")
			if err == nil {
				var remotePeers map[string]*PeerInfo
				if err := json.NewDecoder(peerResp.Body).Decode(&remotePeers); err == nil {
					for rUrl := range remotePeers {
						// Don't add ourselves or already known peers
						if rUrl != "http://localhost:"+latticePort && lattice.Peers[rUrl] == nil {
							lattice.Peers[rUrl] = &PeerInfo{URL: rUrl, Status: "discovered"}
							fmt.Printf("[GOSSIP] Discovered new peer through %s: %s\n", url, rUrl)
						}
					}
				}
				peerResp.Body.Close()
			}

			if remoteMerkle != lattice.MerkleRoot {
				fmt.Printf("[GOSSIP] State Divergence with %s! Attempting Bloom Sync...\n", url)

				// Speed up gossip when out of sync
				if interval > 2 * time.Second {
					interval = 2 * time.Second
					ticker.Reset(interval)
					log.Printf("[GOSSIP] Synchronizing... Increasing gossip frequency to 2s.")
				}

				// Build Bloom Filter of local block hashes
				lattice.mu.RLock()
				bf := NewBloomFilter(1000, 3)
				for h := range lattice.Blocks {
					bf.Add([]byte(h))
				}
				lattice.mu.RUnlock()

				bfBody, _ := json.Marshal(bf)
				syncResp, err := http.Post(url+"/sync/bloom", "application/json", strings.NewReader(string(bfBody)))

				failures := 0
				banned := false

				if err == nil {
					var syncData struct {
						Missing []*Block `json:"missing"`
					}
					json.NewDecoder(syncResp.Body).Decode(&syncData)
					syncResp.Body.Close()

					for _, b := range syncData.Missing {
						lattice.mu.RLock()
						_, exists := lattice.Blocks[b.Hash]
						lattice.mu.RUnlock()
						if !exists {
							if err := lattice.ProcessBlock(b, false); err != nil {
								failures++
								if failures > 3 {
									banned = true
									break
								}
							}
						}
					}
					if len(syncData.Missing) > 0 {
						fmt.Printf("[SYNC] Integrated %d missing blocks via Bloom filter from %s\n", len(syncData.Missing), url)
					}
				}

				for !banned {
					// Fallback to sequential batch sync if still divergent
					syncResp, err := http.Get(fmt.Sprintf("%s/blocks?after=%s&limit=100", url, lattice.StateHash))
					if err != nil {
						break
					}
					var newBlocks []*Block
					json.NewDecoder(syncResp.Body).Decode(&newBlocks)

					if len(newBlocks) == 0 {
						break
					}

					for _, b := range newBlocks {
						lattice.mu.RLock()
						_, exists := lattice.Blocks[b.Hash]
						lattice.mu.RUnlock()
						if !exists {
							if err := lattice.ProcessBlock(b, false); err != nil {
								failures++
								fmt.Printf("[GOSSIP] Invalid block from %s: %v\n", url, err)
								if failures > 3 {
									fmt.Printf("[GOSSIP] Banning %s for exceeding invalid block threshold.\n", url)
									lattice.mu.Lock()
									if lattice.Peers[url] != nil {
										lattice.Peers[url].Status = "banned"
									}
									lattice.mu.Unlock()
									banned = true
									break
								}
							}
						}
					}
					if banned {
						break
					}
					fmt.Printf("[SYNC] Integrated compressed batch of %d blocks from %s\n", len(newBlocks), url)
					if len(newBlocks) < 100 {
						break
					}
				}
			}

			// Update Quorum Score
			lattice.mu.Lock()
			agreeCount := 0
			totalOnline := 0
			for _, p := range lattice.Peers {
				if p.Status == "online" {
					totalOnline++
					if p.MerkleRoot == lattice.MerkleRoot {
						agreeCount++
					}
				}
			}
			if totalOnline > 0 {
				lattice.QuorumScore = (float64(agreeCount) / float64(totalOnline)) * 100.0
			} else {
				lattice.QuorumScore = 100.0 // Solo mode
			}

			// Return to healthy interval if quorum reached
			if lattice.QuorumScore >= lattice.QuorumThreshold && interval < 10 * time.Second {
				interval = 10 * time.Second
				ticker.Reset(interval)
				log.Printf("[GOSSIP] Network healthy. Relaxing gossip frequency to 10s.")
			}
			lattice.mu.Unlock()
		}
	}
}

func handleSnapshot(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		lattice.mu.Lock()
		defer lattice.mu.Unlock()

		fmt.Println("[Snapshot] Received compressed binary state. Commencing import...")

		var reader io.Reader = r.Body
		if r.Header.Get("Content-Encoding") == "gzip" {
			gz, err := gzip.NewReader(r.Body)
			if err != nil {
				http.Error(w, "invalid gzip", 400)
				return
			}
			defer gz.Close()
			reader = gz
		}

		// Use GOB decoder to restore state
		err := gob.NewDecoder(reader).Decode(lattice)
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

	// Export state in compressed binary GOB format
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Encoding", "gzip")
	gz := gzip.NewWriter(w)
	defer gz.Close()

	err := gob.NewEncoder(gz).Encode(lattice)
	if err != nil {
		fmt.Printf("[Snapshot Error] %v\n", err)
	}
}

func handleBootstrap(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var snapshot struct {
			Chains     map[string][]*Block                          `json:"chains"`
			Blocks     map[string]*Block                            `json:"blocks"`
			Pending    map[string][]*PendingTx                      `json:"pending"`
			Proposals  map[string]interface{}                       `json:"proposals"`
			Votes      map[string]map[string]map[string]interface{} `json:"votes"`
			MarketBids map[string]interface{}                       `json:"marketBids"`
			Swaps      map[string]*HTLCSwap                         `json:"swaps"`
			Nfts       map[string]interface{}                       `json:"nfts"`
			Anchors    map[string]interface{}                       `json:"anchors"`
			Multisigs  map[string]*MultisigVault                    `json:"multisigs"`
			StateHash  string                                       `json:"stateHash"`
			MerkleRoot string                                       `json:"merkleRoot"`
		}
		if err := json.NewDecoder(r.Body).Decode(&snapshot); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		if snapshot.StateHash == "" {
			http.Error(w, "invalid snapshot", 400)
			return
		}

		lattice.mu.Lock()
		defer lattice.mu.Unlock()

		fmt.Println("[Bootstrap] Received network snapshot. Commencing security audit...")

		lattice.Chains = snapshot.Chains
		lattice.Blocks = snapshot.Blocks
		if snapshot.Pending != nil {
			lattice.Pending = snapshot.Pending
		}
		if snapshot.Proposals != nil {
			lattice.Proposals = snapshot.Proposals
		}
		if snapshot.Votes != nil {
			lattice.Votes = snapshot.Votes
		}
		if snapshot.MarketBids != nil {
			lattice.MarketBids = snapshot.MarketBids
		}
		if snapshot.Swaps != nil {
			lattice.Swaps = snapshot.Swaps
		}
		if snapshot.Nfts != nil {
			lattice.Nfts = snapshot.Nfts
		}
		if snapshot.Anchors != nil {
			lattice.Anchors = snapshot.Anchors
		}
		if snapshot.Multisigs != nil {
			lattice.Multisigs = snapshot.Multisigs
		}

		if err := lattice.AuditState(); err != nil {
			fmt.Printf("[Bootstrap Error] Snapshot Rejected: %v\n", err)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "Cryptographic audit failed: Malicious or corrupted snapshot."})
			return
		}

		for _, chain := range lattice.Chains {
			for _, b := range chain {
				db.SaveBlock(b)
			}
		}

		json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "stateHash": lattice.StateHash, "merkleRoot": lattice.MerkleRoot})
		return
	}

	json.NewEncoder(w).Encode(lattice.GetStateSnapshot())
}

func handleBloomSync(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", 405)
		return
	}
	var bf BloomFilter
	if err := json.NewDecoder(r.Body).Decode(&bf); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	lattice.mu.RLock()
	defer lattice.mu.RUnlock()

	var missing []*Block
	for _, block := range lattice.Blocks {
		if !bf.Test([]byte(block.Hash)) {
			missing = append(missing, block)
		}
		if len(missing) >= 100 {
			break
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"missing": missing})
}
