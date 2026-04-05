package main

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/mr-tron/base58"
	_ "modernc.org/sqlite"
)

type Config struct {
	Port               string
	LatticeURL         string
	SupernodeURL       string
	DBPath             string
	WalletFile         string
	ZKServiceURL       string
	FHEOracleBridgeURL string
}

type Wallet struct {
	PublicKey  string `json:"publicKey"`
	PrivateKey string `json:"privateKey"`
}

type SporaProof struct {
	InfoHash  string `json:"infoHash"`
	Challenge int    `json:"challenge"`
	ChunkHash string `json:"chunkHash"`
}

type Block struct {
	Type          string      `json:"type"`
	Account       string      `json:"account"`
	Previous      *string     `json:"previous"`
	Balance       float64     `json:"balance"`
	StakedBalance float64     `json:"staked_balance"`
	Height        int         `json:"height"`
	Link          string      `json:"link"`
	Spora         *SporaProof `json:"spora,omitempty"`
	ZKProof       string      `json:"zk_proof,omitempty"`
	Payload       interface{} `json:"payload,omitempty"`
	Timestamp     int64       `json:"timestamp"`
	Hash          string      `json:"hash"`
	Signature     string      `json:"signature"`
}

type Transaction struct {
	ID     string  `json:"id"`
	Date   string  `json:"date"`
	Amount float64 `json:"amount"`
	Type   string  `json:"type"`
	Hash   string  `json:"hash"`
}

type Bid struct {
	ID         int64   `json:"id"`
	Magnet     string  `json:"magnet"`
	Amount     float64 `json:"amount"`
	Status     string  `json:"status"`
	AcceptedBy *string `json:"acceptedBy,omitempty"`
}

type APIResponse struct {
	Success  bool    `json:"success"`
	Error    string  `json:"error,omitempty"`
	Hash     string  `json:"hash,omitempty"`
	Balance  float64 `json:"balance,omitempty"`
	Frontier string  `json:"frontier,omitempty"`
	Height   int     `json:"height,omitempty"`
}

type PendingTx struct {
	Hash   string  `json:"hash"`
	Amount float64 `json:"amount"`
}

type PendingResponse struct {
	Pending []PendingTx `json:"pending"`
}

type ProofSubmissionRequest struct {
	Proof map[string]interface{} `json:"proof"`
}

type SignalMessage struct {
	Type      string      `json:"type"`
	Initiator bool        `json:"initiator,omitempty"`
	Signal    interface{} `json:"signal,omitempty"`
}

type MatchConnection struct {
	conn     *websocket.Conn
	opponent *MatchConnection
}

type Service struct {
	cfg            Config
	db             *sql.DB
	httpClient     *http.Client
	systemWallet   Wallet
	systemBalance  float64
	systemFrontier *string
	mu             sync.Mutex
	matchMu        sync.Mutex
	waitingPlayer  *MatchConnection
	upgrader       websocket.Upgrader
}

var coreArcadeAnchorMagnet = "magnet:?xt=urn:btih:1234567890abcdef1234567890abcdef12345678"

func main() {
	cfg := Config{
		Port:               envOrDefault("GAME_SERVER_PORT", "3001"),
		LatticeURL:         envOrDefault("LATTICE_URL", "http://localhost:4001"),
		SupernodeURL:       envOrDefault("SUPERNODE_URL", "http://localhost:8081"),
		DBPath:             envOrDefault("GAME_SERVER_DB_PATH", filepath.Join("go-game-server", "database.sqlite")),
		WalletFile:         envOrDefault("GAME_SERVER_WALLET_FILE", filepath.Join("go-game-server", "system-wallet.json")),
		ZKServiceURL:       envOrDefault("ZK_SERVICE_URL", "http://localhost:8080"),
		FHEOracleBridgeURL: envOrDefault("FHE_ORACLE_BRIDGE_URL", ""),
	}

	service, err := NewService(cfg)
	if err != nil {
		log.Fatalf("failed to initialize go-game-server: %v", err)
	}

	go service.initializeSystemChain()

	mux := http.NewServeMux()
	mux.HandleFunc("/", service.handleRoot)
	mux.HandleFunc("/status", service.handleStatus)
	mux.HandleFunc("/bankroll", service.handleBankroll)
	mux.HandleFunc("/mint", service.handleMint)
	mux.HandleFunc("/burn", service.handleBurn)
	mux.HandleFunc("/fhe-oracle", service.handleFHEOracle)
	mux.HandleFunc("/submit-proof", service.handleSubmitProof)
	mux.HandleFunc("/transactions", service.handleTransactions)
	mux.HandleFunc("/market/bids", service.handleMarketBids)
	mux.HandleFunc("/market/bid", service.handleCreateBid)
	mux.HandleFunc("/market/accept", service.handleAcceptBid)

	log.Printf("[go-game-server] listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, withCORS(mux)); err != nil {
		log.Fatalf("go-game-server failed: %v", err)
	}
}

func NewService(cfg Config) (*Service, error) {
	if err := os.MkdirAll(filepath.Dir(cfg.DBPath), 0o755); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(filepath.Dir(cfg.WalletFile), 0o755); err != nil {
		return nil, err
	}

	db, err := sql.Open("sqlite", cfg.DBPath)
	if err != nil {
		return nil, err
	}
	if err := initDatabase(db); err != nil {
		return nil, err
	}
	wallet, err := loadOrCreateWallet(cfg.WalletFile)
	if err != nil {
		return nil, err
	}
	return &Service{
		cfg:            cfg,
		db:             db,
		httpClient:     &http.Client{Timeout: 15 * time.Second},
		systemWallet:   wallet,
		systemBalance:  1000000,
		systemFrontier: nil,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}, nil
}

func initDatabase(db *sql.DB) error {
	schema := []string{
		`CREATE TABLE IF NOT EXISTS bids (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			magnet TEXT NOT NULL,
			amount REAL NOT NULL,
			status TEXT DEFAULT 'OPEN',
			acceptedBy TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS transactions (
			id TEXT PRIMARY KEY,
			date TEXT NOT NULL,
			amount REAL NOT NULL,
			type TEXT NOT NULL,
			hash TEXT NOT NULL
		)`,
	}
	for _, stmt := range schema {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}
	return nil
}

func loadOrCreateWallet(path string) (Wallet, error) {
	if data, err := os.ReadFile(path); err == nil {
		var wallet Wallet
		if err := json.Unmarshal(data, &wallet); err != nil {
			return Wallet{}, err
		}
		return wallet, nil
	}
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return Wallet{}, err
	}
	wallet := Wallet{PublicKey: base58.Encode(pub), PrivateKey: base58.Encode(priv)}
	data, _ := json.MarshalIndent(wallet, "", "  ")
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return Wallet{}, err
	}
	return wallet, nil
}

func (s *Service) initializeSystemChain() {
	block := &Block{Type: "open", Account: s.systemWallet.PublicKey, Previous: nil, Balance: s.systemBalance, StakedBalance: 0, Height: 0, Link: "SYSTEM_GENESIS", Timestamp: time.Now().UnixMilli()}
	signBlock(block, s.systemWallet.PrivateKey)
	var resp APIResponse
	if err := s.postJSON(s.cfg.LatticeURL+"/process", map[string]interface{}{"block": block}, &resp); err != nil || !resp.Success {
		log.Printf("[go-game-server] failed to bootstrap system chain: %v %s", err, resp.Error)
		return
	}
	s.mu.Lock()
	s.systemFrontier = &block.Hash
	s.mu.Unlock()
	log.Printf("[go-game-server] initialized system chain: %s...", s.systemWallet.PublicKey[:16])
}

func (s *Service) handleRoot(w http.ResponseWriter, r *http.Request) {
	if websocket.IsWebSocketUpgrade(r) {
		s.handleMatchmakingWebSocket(w, r)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"status": "online", "service": "Go Game Server orchestrator", "version": "0.2.0-go"})
}

func (s *Service) handleStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{"status": "online", "service": "Go Game Server orchestrator", "version": "0.2.0-go"})
}

func (s *Service) handleBankroll(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	balance := s.systemBalance
	s.mu.Unlock()
	writeJSON(w, http.StatusOK, map[string]interface{}{"balance": balance, "wallet": s.systemWallet.PublicKey})
}

func (s *Service) handleMint(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{"error": "method not allowed"})
		return
	}
	var req struct {
		Amount  float64 `json:"amount"`
		Reason  string  `json:"reason"`
		Address string  `json:"address"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Amount <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "invalid amount"})
		return
	}
	hash := shortHash(strconv.FormatInt(time.Now().UnixNano(), 10))
	if req.Address != "" {
		blockHash, err := s.sendSystemFunds(req.Address, req.Amount, "")
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
			return
		}
		hash = blockHash
	}
	txID := "tx_mint_" + shortHash(hash+req.Address)
	_ = recordTransaction(s.db, Transaction{ID: txID, Date: formatDBDate(time.Now()), Amount: req.Amount, Type: "MINT", Hash: hash})
	writeJSON(w, http.StatusOK, map[string]interface{}{"success": true, "tx": txID, "hash": hash})
}

func (s *Service) handleFHEOracle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{"success": false, "error": "method not allowed"})
		return
	}
	if s.cfg.FHEOracleBridgeURL == "" {
		writeJSON(w, http.StatusNotImplemented, map[string]interface{}{"success": false, "error": "FHE oracle bridge is not configured"})
		return
	}
	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Encrypted payload missing"})
		return
	}
	if payload["cipherText"] == nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Encrypted payload missing"})
		return
	}
	var bridgeResp map[string]interface{}
	if err := s.postJSON(s.cfg.FHEOracleBridgeURL, payload, &bridgeResp); err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]interface{}{"success": false, "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, bridgeResp)
}

func (s *Service) handleSubmitProof(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{"success": false, "error": "method not allowed"})
		return
	}

	var req ProofSubmissionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Proof == nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Invalid proof payload"})
		return
	}

	publicValues, ok := req.Proof["publicValues"].(map[string]interface{})
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Invalid proof payload"})
		return
	}

	proofJSON, _ := json.Marshal(req.Proof)
	verificationHash := hashString(string(proofJSON))
	address, _ := publicValues["address"].(string)
	score, _ := publicValues["score"].(float64)
	zkVerified := score >= 1000
	if !zkVerified {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Cryptographic trace verification failed."})
		return
	}

	amount := score / 100
	txID := "tx_" + shortHash(verificationHash+address)
	hash := verificationHash[:32]
	if address != "" && address != "unknown" {
		blockHash, err := s.sendSystemFunds(address, amount, verificationHash)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
			return
		}
		hash = blockHash
	}
	_ = recordTransaction(s.db, Transaction{ID: txID, Date: formatDBDate(time.Now()), Amount: amount, Type: "MINT", Hash: hash})
	writeJSON(w, http.StatusOK, map[string]interface{}{"success": true, "tx": txID, "hash": hash, "zkVerified": true})
}

func (s *Service) handleBurn(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{"error": "method not allowed"})
		return
	}
	var req struct {
		Amount float64 `json:"amount"`
		Reason string  `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Amount <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "invalid amount"})
		return
	}
	txID := "tx_burn_" + shortHash(strconv.FormatInt(time.Now().UnixNano(), 10))
	hash := shortHash(txID + req.Reason)
	_ = recordTransaction(s.db, Transaction{ID: txID, Date: formatDBDate(time.Now()), Amount: req.Amount, Type: "SEND", Hash: hash})
	writeJSON(w, http.StatusOK, map[string]interface{}{"success": true, "tx": txID, "hash": hash})
}

func (s *Service) handleTransactions(w http.ResponseWriter, r *http.Request) {
	txs, err := getTransactions(s.db)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"error": "DB Error"})
		return
	}
	writeJSON(w, http.StatusOK, txs)
}

func (s *Service) handleMatchmakingWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[go-game-server] websocket upgrade failed: %v", err)
		return
	}
	player := &MatchConnection{conn: conn}
	defer s.disconnectPlayer(player)

	for {
		var message SignalMessage
		if err := conn.ReadJSON(&message); err != nil {
			return
		}
		switch message.Type {
		case "FIND_MATCH":
			s.queueOrMatchPlayer(player)
		case "SIGNAL":
			if player.opponent != nil {
				_ = player.opponent.conn.WriteJSON(SignalMessage{Type: "SIGNAL", Signal: message.Signal})
			}
		}
	}
}

func (s *Service) queueOrMatchPlayer(player *MatchConnection) {
	s.matchMu.Lock()
	defer s.matchMu.Unlock()

	if s.waitingPlayer != nil && s.waitingPlayer != player {
		waiting := s.waitingPlayer
		s.waitingPlayer = nil
		waiting.opponent = player
		player.opponent = waiting
		_ = waiting.conn.WriteJSON(SignalMessage{Type: "MATCH_FOUND", Initiator: true})
		_ = player.conn.WriteJSON(SignalMessage{Type: "MATCH_FOUND", Initiator: false})
		return
	}

	s.waitingPlayer = player
}

func (s *Service) disconnectPlayer(player *MatchConnection) {
	s.matchMu.Lock()
	if s.waitingPlayer == player {
		s.waitingPlayer = nil
	}
	opponent := player.opponent
	if opponent != nil {
		opponent.opponent = nil
	}
	s.matchMu.Unlock()

	if opponent != nil {
		_ = opponent.conn.WriteJSON(SignalMessage{Type: "OPPONENT_DISCONNECTED"})
	}
	_ = player.conn.Close()
}

func (s *Service) handleMarketBids(w http.ResponseWriter, r *http.Request) {
	bids, err := getOpenBids(s.db)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"error": "DB Error"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"bids": bids})
}

func (s *Service) handleCreateBid(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{"error": "method not allowed"})
		return
	}
	var req struct {
		Magnet string  `json:"magnet"`
		Amount float64 `json:"amount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Magnet == "" || req.Amount <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"error": "Magnet and Amount required"})
		return
	}
	id, err := createBid(s.db, req.Magnet, req.Amount)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"error": "DB Error"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"success": true, "id": id})
}

func (s *Service) handleAcceptBid(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{"error": "method not allowed"})
		return
	}
	var req struct {
		BidID  int64  `json:"bidId"`
		NodeID string `json:"nodeId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.BidID == 0 || req.NodeID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"error": "BidId and NodeId required"})
		return
	}
	changes, err := acceptBid(s.db, req.BidID, req.NodeID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"error": "DB Error"})
		return
	}
	if changes == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"error": "Bid not available or already accepted"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"success": true})
}

func (s *Service) sendSystemFunds(address string, amount float64, zkProof string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.systemFrontier == nil {
		return "", fmt.Errorf("system frontier unavailable")
	}
	frontier, balance, height, err := s.fetchFrontier(s.systemWallet.PublicKey)
	if err != nil || frontier == nil {
		return "", fmt.Errorf("failed to fetch system frontier: %v", err)
	}
	challenge := parseChallenge(*frontier)
	infoHash := magnetInfoHash(coreArcadeAnchorMagnet)
	chunkHash := hashString(infoHash + strconv.Itoa(challenge))
	now := time.Now().UnixMilli()
	newBalance := balance - amount
	block := &Block{Type: "send", Account: s.systemWallet.PublicKey, Previous: frontier, Balance: newBalance, StakedBalance: 0, Height: height + 1, Link: address, Spora: &SporaProof{InfoHash: infoHash, Challenge: challenge, ChunkHash: chunkHash}, ZKProof: zkProof, Timestamp: now}
	signBlock(block, s.systemWallet.PrivateKey)
	var resp APIResponse
	if err := s.postJSON(s.cfg.LatticeURL+"/process", map[string]interface{}{"block": block}, &resp); err != nil {
		return "", err
	}
	if !resp.Success {
		return "", fmt.Errorf(resp.Error)
	}
	s.systemFrontier = &block.Hash
	s.systemBalance = newBalance
	return block.Hash, nil
}

func (s *Service) fetchFrontier(account string) (*string, float64, int, error) {
	var body map[string]interface{}
	if err := s.getJSON(s.cfg.LatticeURL+"/frontier/"+account, &body); err != nil {
		return nil, 0, 0, err
	}
	frontierRaw, _ := body["frontier"].(string)
	if frontierRaw == "" {
		return nil, 0, 0, nil
	}
	balance, _ := body["balance"].(float64)
	heightFloat, _ := body["height"].(float64)
	return &frontierRaw, balance, int(heightFloat), nil
}

func createBid(db *sql.DB, magnet string, amount float64) (int64, error) {
	result, err := db.Exec("INSERT INTO bids (magnet, amount) VALUES (?, ?)", magnet, amount)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func getOpenBids(db *sql.DB) ([]Bid, error) {
	rows, err := db.Query("SELECT id, magnet, amount, status, acceptedBy FROM bids WHERE status = 'OPEN' OR status = 'ACCEPTED' ORDER BY id ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var bids []Bid
	for rows.Next() {
		var bid Bid
		if err := rows.Scan(&bid.ID, &bid.Magnet, &bid.Amount, &bid.Status, &bid.AcceptedBy); err != nil {
			return nil, err
		}
		bids = append(bids, bid)
	}
	return bids, nil
}

func acceptBid(db *sql.DB, id int64, nodeID string) (int64, error) {
	result, err := db.Exec("UPDATE bids SET status = 'ACCEPTED', acceptedBy = ? WHERE id = ? AND status = 'OPEN'", nodeID, id)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

func recordTransaction(db *sql.DB, tx Transaction) error {
	_, err := db.Exec("INSERT OR REPLACE INTO transactions (id, date, amount, type, hash) VALUES (?, ?, ?, ?, ?)", tx.ID, tx.Date, tx.Amount, tx.Type, tx.Hash)
	return err
}

func getTransactions(db *sql.DB) ([]Transaction, error) {
	rows, err := db.Query("SELECT id, date, amount, type, hash FROM transactions ORDER BY date DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var txs []Transaction
	for rows.Next() {
		var tx Transaction
		if err := rows.Scan(&tx.ID, &tx.Date, &tx.Amount, &tx.Type, &tx.Hash); err != nil {
			return nil, err
		}
		txs = append(txs, tx)
	}
	return txs, nil
}

func (s *Service) getJSON(url string, target interface{}) error {
	resp, err := s.httpClient.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return json.NewDecoder(resp.Body).Decode(target)
}

func (s *Service) postJSON(url string, payload interface{}, target interface{}) error {
	body, _ := json.Marshal(payload)
	resp, err := s.httpClient.Post(url, "application/json", strings.NewReader(string(body)))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return json.NewDecoder(resp.Body).Decode(target)
}

func signBlock(block *Block, privateKeyBase58 string) {
	block.Hash = calculateHash(block)
	privBytes, _ := base58.Decode(privateKeyBase58)
	block.Signature = base58.Encode(ed25519.Sign(ed25519.PrivateKey(privBytes), []byte(block.Hash)))
}

func calculateHash(block *Block) string {
	sporaJSON, _ := json.Marshal(block.Spora)
	payloadJSON, _ := json.Marshal(block.Payload)
	prev := ""
	if block.Previous != nil {
		prev = *block.Previous
	}
	data := block.Type + block.Account + prev + strconv.FormatFloat(block.Balance, 'f', -1, 64) + strconv.FormatFloat(block.StakedBalance, 'f', -1, 64) + strconv.Itoa(block.Height) + block.Link + string(sporaJSON) + string(payloadJSON)
	return hashString(data)
}

func magnetInfoHash(magnet string) string {
	marker := "urn:btih:"
	idx := strings.Index(magnet, marker)
	if idx >= 0 {
		remaining := magnet[idx+len(marker):]
		if cut := strings.Index(remaining, "&"); cut >= 0 {
			remaining = remaining[:cut]
		}
		return remaining
	}
	return hashString(magnet)[:40]
}

func parseChallenge(baseHash string) int {
	value, _ := strconv.ParseInt(baseHash[:8], 16, 64)
	return int(value)
}
func hashString(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}
func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
func shortHash(value string) string {
	hash := hashString(value)
	if len(hash) < 10 {
		return hash
	}
	return hash[:10]
}
func formatDBDate(ts time.Time) string { return ts.UTC().Format("2006-01-02 15:04") }

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
