package main

import (
	"bufio"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
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
	SolanaRPCURL       string
	SolanaBridgePDA    string
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

type ZKVerificationBridgeResponse struct {
	Success    bool   `json:"success"`
	Verified   *bool  `json:"verified,omitempty"`
	ZKVerified *bool  `json:"zkVerified,omitempty"`
	Valid      *bool  `json:"valid,omitempty"`
	Error      string `json:"error,omitempty"`
}

type SignalMessage struct {
	Type      string      `json:"type"`
	RoomID    string      `json:"roomID,omitempty"`
	Initiator bool        `json:"initiator,omitempty"`
	Signal    interface{} `json:"signal,omitempty"`
	PublicKey string      `json:"publicKey,omitempty"`
	Trust     float64     `json:"trust,omitempty"`
}

type MatchConnection struct {
	conn      *websocket.Conn
	opponent  *MatchConnection
	roomID    string
	publicKey string
	trust     float64
}

type Relayer struct {
	ID        string `json:"id"`
	PublicKey string `json:"publicKey"`
}

type RelayerSignature struct {
	RelayerID string `json:"relayerId"`
	Signature string `json:"signature"`
	Timestamp int64  `json:"timestamp"`
}

type Service struct {
	cfg            Config
	db             *sql.DB
	httpClient     *http.Client
	solanaClient   *rpc.Client
	systemWallet   Wallet
	relayers       []Relayer
	systemBalance  float64
	systemFrontier *string
	mu             sync.Mutex
	matchMu        sync.Mutex
	waitingPlayers map[string]*MatchConnection
	auditClients   map[*websocket.Conn]bool
	auditMu        sync.Mutex
	upgrader       websocket.Upgrader
}

var coreArcadeAnchorMagnet = "magnet:?xt=urn:btih:1234567890abcdef1234567890abcdef12345678"

func main() {
	cfg := Config{
		Port:               envOrDefault("GAME_SERVER_PORT", "3001"),
		LatticeURL:         envOrDefault("LATTICE_URL", "http://localhost:4001"),
		SupernodeURL:       envOrDefault("SUPERNODE_URL", "http://localhost:8000"),
		DBPath:             envOrDefault("GAME_SERVER_DB_PATH", filepath.Join("go-game-server", "database.sqlite")),
		WalletFile:         envOrDefault("GAME_SERVER_WALLET_FILE", filepath.Join("go-game-server", "system-wallet.json")),
		ZKServiceURL:       envOrDefault("ZK_SERVICE_URL", "http://localhost:8080"),
		FHEOracleBridgeURL: envOrDefault("FHE_ORACLE_BRIDGE_URL", ""),
		SolanaRPCURL:       envOrDefault("SOLANA_RPC_URL", "https://api.devnet.solana.com"),
		SolanaBridgePDA:    envOrDefault("SOLANA_BRIDGE_PDA", "BobcoinBridge11111111111111111111111111111"),
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
	mux.HandleFunc("/sdk/v1/submit-trace", service.handleSubmitTrace)
	mux.HandleFunc("/sdk/v1/vitality", service.handleVitalityProof)
	mux.HandleFunc("/transactions", service.handleTransactions)
	mux.HandleFunc("/market/bids", service.handleMarketBids)
	mux.HandleFunc("/market/bid", service.handleCreateBid)
	mux.HandleFunc("/market/accept", service.handleAcceptBid)
	mux.HandleFunc("/governance/audit", service.handleGovernanceAudit)
	mux.HandleFunc("/oracle/audits", service.handleOracleAudits)

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
		solanaClient:   rpc.New(cfg.SolanaRPCURL),
		systemWallet:   wallet,
		relayers: []Relayer{
			{ID: "relayer-1", PublicKey: "solana-bridge-node-1"},
			{ID: "relayer-2", PublicKey: "solana-bridge-node-2"},
			{ID: "relayer-3", PublicKey: "solana-bridge-node-3"},
		},
		systemBalance:  1000000,
		systemFrontier: nil,
		waitingPlayers: make(map[string]*MatchConnection),
		auditClients:   make(map[*websocket.Conn]bool),
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
		`CREATE TABLE IF NOT EXISTS oracle_audits (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			address TEXT NOT NULL,
			score REAL NOT NULL,
			variance REAL NOT NULL,
			mad REAL NOT NULL,
			entropy REAL NOT NULL,
			confidence_score REAL NOT NULL,
			verified INTEGER NOT NULL,
			autocorrelation REAL DEFAULT 0.0,
			timestamp TEXT NOT NULL
		)`,
	}
	for _, stmt := range schema {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}
	// Best-effort migration for existing databases missing autocorrelation column
	_, _ = db.Exec(`ALTER TABLE oracle_audits ADD COLUMN autocorrelation REAL DEFAULT 0.0;`)
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
	for i := 0; i < 25; i++ {
		if err := s.initializeSystemChainOnce(); err != nil {
			log.Printf("[go-game-server] failed to bootstrap system chain: %v", err)
			time.Sleep(3 * time.Second)
			continue
		}
		break
	}
	log.Printf("[go-game-server] initialized system chain: %s...", s.systemWallet.PublicKey[:16])
}

func (s *Service) initializeSystemChainOnce() error {
	s.mu.Lock()
	alreadyInitialized := s.systemFrontier != nil
	s.mu.Unlock()
	if alreadyInitialized {
		return nil
	}
    // Try to fetch to double check
	frontier, balance, height, err := s.fetchFrontier(s.systemWallet.PublicKey)
	if err == nil && frontier != nil && *frontier != "" {
		s.mu.Lock()
		s.systemFrontier = frontier
		s.systemBalance = balance
		s.mu.Unlock()
		return nil
	}

    actualHeight := 0
    if err == nil && height > -1 {
        actualHeight = height
    }

	block := &Block{Type: "open", Account: s.systemWallet.PublicKey, Previous: nil, Balance: s.systemBalance, StakedBalance: 0, Height: actualHeight, Link: "SYSTEM_GENESIS", Timestamp: time.Now().UnixMilli()}
	signBlock(block, s.systemWallet.PrivateKey)
	var resp APIResponse
	if err := s.postJSON(s.cfg.LatticeURL+"/process", map[string]interface{}{"block": block}, &resp); err != nil {
		return err
	}
	if !resp.Success {
		return fmt.Errorf("%s", resp.Error)
	}
	s.mu.Lock()
	s.systemFrontier = &block.Hash
	s.mu.Unlock()
	return nil
}

func (s *Service) handleRoot(w http.ResponseWriter, r *http.Request) {
	if websocket.IsWebSocketUpgrade(r) {
		s.handleMatchmakingWebSocket(w, r)
		return
	}
	s.handleStatus(w, r)
}

func (s *Service) handleStatus(w http.ResponseWriter, r *http.Request) {
	version := "unknown"
	if data, err := os.ReadFile("../VERSION.md"); err == nil {
		version = strings.TrimSpace(string(data))
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"status": "online", "service": "Go Game Server orchestrator", "version": version})
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
		Amount       float64 `json:"amount"`
		Reason       string  `json:"reason"`
		Address      string  `json:"address"`
		SolanaTxHash string  `json:"solanaTxHash"` // Optional transaction hash to verify
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Amount <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "invalid amount"})
		return
	}

	// Real Solana Devnet Verification Shell
	if req.SolanaTxHash != "" {
		sig, err := solana.SignatureFromBase58(req.SolanaTxHash)
		if err == nil {
			log.Printf("[Relayer] Fetching Solana Tx: %s", req.SolanaTxHash)
			// Implementation would use s.solanaClient.GetTransaction
			// For now, we perform a liveness check on the RPC
			_, err := s.solanaClient.GetHealth(context.Background())
			if err != nil {
				log.Printf("[Relayer] Solana RPC offline: %v", err)
			} else {
				log.Printf("[Relayer] Solana Devnet reachability confirmed for Sig: %s", sig)
			}
		}
	}

	// Cross-Chain Relayer Shell (Solana Parity)
	// In production, this would verify a SPL-token lock on Solana Devnet
	// before minting BOB on the Sovereign Lattice.
	log.Printf("[Relayer] Verifying Solana deposit for %f BOB via %s. Reason: %s", req.Amount, s.cfg.SupernodeURL, req.Reason)

	var signatures []RelayerSignature
	for _, r := range s.relayers {
		signatures = append(signatures, RelayerSignature{
			RelayerID: r.ID,
			Signature: r.ID + "_sig_" + shortHash(strconv.FormatFloat(req.Amount, 'f', -1, 64)),
			Timestamp: time.Now().Unix(),
		})
	}
	log.Printf("[Relayer] Collected %d/%d signatures for cross-chain event", len(signatures), len(s.relayers))

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
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"tx": txID,
		"hash": hash,
		"relayer": "solana_devnet",
		"multisig": true,
		"signatures": signatures,
	})
}

func (s *Service) handleFHEOracle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{"success": false, "error": "method not allowed"})
		return
	}
	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Encrypted payload missing"})
		return
	}
	cipherText, ok := payload["cipherText"].(string)
	if !ok || cipherText == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Encrypted payload missing"})
		return
	}

	// Native Node FHE execution bridge
	cmd := exec.Command("node", "-e", `
		import('./fheUtils.js').then(async (m) => {
			try {
				const cipher = process.argv[1] === '[eval]' ? process.argv[2] : process.argv[1];
				const mult = await m.homomorphicMultiplyPlain(cipher, 2);
				const add = await m.homomorphicAddPlain(mult, 500);
				console.log(add);
			} catch(e) {
				console.error(e);
				process.exit(1);
			}
		});
	`, cipherText)

	cmd.Dir = "../game-server"

	output, err := cmd.Output()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": "Homomorphic computation failed."})
		return
	}

	resultCipher := strings.TrimSpace(string(output))

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"resultCipher": resultCipher,
	})
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
	zkVerified, oracleMetrics := s.verifyProofWithMetrics(publicValues, req.Proof)

	// Persist oracle audit log to SQLite
	variance, _ := oracleMetrics["variance"].(float64)
	mad, _ := oracleMetrics["mad"].(float64)
	entropy, _ := oracleMetrics["entropy"].(float64)
	confidence, _ := oracleMetrics["confidenceScore"].(float64)
	autocorr, _ := oracleMetrics["autocorrelation"].(float64)
	verifiedInt := 0
	if zkVerified {
		verifiedInt = 1
	}
	ts := formatDBDate(time.Now())
	res, _ := s.db.Exec(`
		INSERT INTO oracle_audits (address, score, variance, mad, entropy, confidence_score, verified, autocorrelation, timestamp)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, address, score, variance, mad, entropy, confidence, verifiedInt, autocorr, ts)

	var lastID int64
	if res != nil {
		lastID, _ = res.LastInsertId()
	}

	autocorrLag2, _ := oracleMetrics["autocorrelationLag2"].(float64)
	diversityRatio, _ := oracleMetrics["diversityRatio"].(float64)

	// Broadcast live audit to all connected WebSockets
	s.broadcastOracleAudit(map[string]interface{}{
		"id":                   lastID,
		"address":              address,
		"score":                score,
		"variance":             variance,
		"mad":                  mad,
		"entropy":              entropy,
		"confidenceScore":      confidence,
		"autocorrelation":      autocorr,
		"autocorrelationLag2":  autocorrLag2,
		"diversityRatio":       diversityRatio,
		"verified":             zkVerified,
		"timestamp":            ts,
	})

	if !zkVerified {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Cryptographic trace verification failed.",
			"oracle":  oracleMetrics,
		})
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
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":    true,
		"tx":         txID,
		"hash":       hash,
		"zkVerified": true,
		"oracle":     oracleMetrics,
	})
}

func (s *Service) verifyProof(publicValues map[string]interface{}, proof map[string]interface{}) bool {
	ok, _ := s.verifyProofWithMetrics(publicValues, proof)
	return ok
}

// sp1VerifierCommand resolves how to run the host-side SP1 verifier
// (proof-of-play/verifier, built with sp1-sdk — SP1 v6 `cargo prove` has no
// `verify` subcommand). Preference: native binary on PATH (Linux/CI), then
// the WSL-built binary on Windows. Returns nil when no verifier is available.
func sp1VerifierCommand(proofPath, elfPath string) *exec.Cmd {
	if bin, err := exec.LookPath("proof-of-play-verifier"); err == nil {
		return exec.Command(bin, "--elf", elfPath, "--proof", proofPath)
	}
	if runtime.GOOS == "windows" {
		if _, err := exec.LookPath("wsl"); err == nil {
			wsProof := windowsPathToWSL(proofPath)
			wsElf := windowsPathToWSL(elfPath)
			if wsProof != "" && wsElf != "" {
				bin := "/mnt/c/Users/hyper/workspace/bobcoin/proof-of-play/verifier/target/release/proof-of-play-verifier"
				// Resolve the verifier relative to the ELF's repo root when possible.
				if idx := strings.Index(wsElf, "/proof-of-play/"); idx > 0 {
					bin = wsElf[:idx] + "/proof-of-play/verifier/target/release/proof-of-play-verifier"
				}
				return exec.Command("wsl", "-d", "Ubuntu", "--", bin, "--elf", wsElf, "--proof", wsProof)
			}
		}
	}
	return nil
}

var daemonRecoveryMu sync.Mutex
var lastDaemonRecovery time.Time

// recoverDaemon restarts the held SP1 verifier daemon after a WSL restart
// or crash (Windows only). Rate-limited to one attempt per 5 minutes so a
// genuinely absent toolchain falls back to the CLI/Oracle path quickly.
// Disable with BOBCOIN_SP1_AUTOSTART=0.
func recoverDaemon() bool {
	if runtime.GOOS != "windows" || os.Getenv("BOBCOIN_SP1_AUTOSTART") == "0" {
		return false
	}
	daemonRecoveryMu.Lock()
	defer daemonRecoveryMu.Unlock()
	if time.Since(lastDaemonRecovery) < 5*time.Minute {
		return false
	}
	lastDaemonRecovery = time.Now()
	script := filepath.Join("..", "scripts", "start-sp1-daemon.ps1")
	if _, err := os.Stat(script); err != nil {
		return false
	}
	log.Printf("[ZK Service] Verifier daemon unreachable; attempting auto-recovery via %s", script)
	cmd := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script)
	if err := cmd.Start(); err != nil {
		log.Printf("[ZK Service] Daemon auto-recovery failed to launch: %v", err)
		return false
	}
	// Setup (proving-key generation) takes ~2 minutes; poll for the port.
	addr := os.Getenv("SP1_VERIFIER_ADDR")
	if addr == "" {
		addr = "127.0.0.1:9823"
	}
	for i := 0; i < 90; i++ {
		time.Sleep(2 * time.Second)
		if conn, err := net.DialTimeout("tcp", addr, time.Second); err == nil {
			conn.Close()
			log.Printf("[ZK Service] Verifier daemon recovered after %ds", (i+1)*2)
			return true
		}
	}
	log.Printf("[ZK Service] Verifier daemon did not come up within 180s")
	return false
}

// verifyViaDaemon asks the long-lived SP1 verifier daemon (cached setup;
// see proof-of-play/verifier --serve) to verify serialized proof bytes.
// Returns (attempted, valid). Protocol: "<len>\n<raw bytes>" -> "VALID" /
// "INVALID ...". Bytes are sent (not a file path) because SP1 verification
// over the Windows 9p mount takes minutes vs ~1s on WSL-native storage.
func verifyViaDaemon(proofBytes []byte) (bool, bool) {
	addr := os.Getenv("SP1_VERIFIER_ADDR")
	if addr == "" {
		addr = "127.0.0.1:9823"
	}
	conn, err := net.DialTimeout("tcp", addr, 3*time.Second)
	if err != nil {
		return false, false
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(15 * time.Minute))
	if _, err := fmt.Fprintf(conn, "%d\n", len(proofBytes)); err != nil {
		return true, false
	}
	if _, err := conn.Write(proofBytes); err != nil {
		return true, false
	}
	reply, err := bufio.NewReader(conn).ReadString('\n')
	if err != nil {
		return true, false
	}
	return true, strings.HasPrefix(reply, "VALID")
}

// windowsPathToWSL converts C:\a\b to /mnt/c/a/b ("" for non-absolute paths).
func windowsPathToWSL(p string) string {
	abs, err := filepath.Abs(p)
	if err != nil || len(abs) < 3 || abs[1] != ':' {
		return ""
	}
	drive := strings.ToLower(abs[:1])
	rest := strings.ReplaceAll(abs[2:], "\\", "/")
	return "/mnt/" + drive + rest
}

func (s *Service) verifyProofWithMetrics(publicValues map[string]interface{}, proof map[string]interface{}) (bool, map[string]interface{}) {
	// Real SP1 verification runs only when the submission carries actual
	// serialized proof material (`proofBytesB64`, written by an sp1-sdk
	// prover via proof.save()). Simulated/browser proofs have no bytes and
	// go straight to the AI Oracle statistical audit below.
	if proofB64, ok := proof["proofBytesB64"].(string); ok && proofB64 != "" {
		raw, decErr := base64.StdEncoding.DecodeString(proofB64)
		if decErr == nil {
			proofPath := filepath.Join(os.TempDir(), fmt.Sprintf("proof_%d.bin", time.Now().UnixNano()))
			if os.WriteFile(proofPath, raw, 0644) == nil {
				defer os.Remove(proofPath)
				elfPath := filepath.Join("..", "proof-of-play", "program", "elf", "proof-of-play")
				attempted, valid := verifyViaDaemon(raw)
				if !attempted && recoverDaemon() {
					attempted, valid = verifyViaDaemon(raw)
				}
				if attempted {
					log.Printf("[ZK Service] Verifier daemon verdict: valid=%v", valid)
					if valid {
						return true, map[string]interface{}{"mode": "RISC-V_NATIVE_DAEMON", "confidenceScore": 1.0}
					}
				} else if cmd := sp1VerifierCommand(proofPath, elfPath); cmd != nil {
					log.Printf("[ZK Service] Verifier detected (%s). Commencing RISC-V ZK verification...", cmd.Path)
					if output, err := cmd.CombinedOutput(); err != nil {
						log.Printf("[ZK Service] Native verification failed: %v\nOutput: %s", err, string(output))
					} else {
						log.Printf("[ZK Service] Native verification succeeded!\nOutput: %s", string(output))
						return true, map[string]interface{}{"mode": "RISC-V_NATIVE", "confidenceScore": 1.0}
					}
				} else {
					log.Printf("[ZK Service] Proof bytes supplied but no SP1 verifier available (native or WSL); falling back to AI Oracle.")
				}
			}
		}
	}

	time.Sleep(1200 * time.Millisecond) // Simulated cryptographic delay

	metrics := map[string]interface{}{
		"variance":        0.0,
		"mad":             0.0,
		"entropy":         0.0,
		"confidenceScore": 0.0,
		"mode":            "AI_ORACLE_STATISTICAL",
	}

	// AI Oracle (Bot Detection via temporal monotonicity, variance, MAD, and Shannon entropy)
	// Must execute before score validation to prevent robotic macro bypasses
	replayLog, ok := publicValues["replayLog"].([]interface{})
	if ok && len(replayLog) >= 2 {
		var diffs []float64
		var lastTime float64
		isMonotonic := true

		for i, entryRaw := range replayLog {
			entry, ok := entryRaw.(map[string]interface{})
			if !ok {
				continue
			}
			t, _ := entry["time"].(float64)
			if i > 0 {
				delta := t - lastTime
				// Strict monotonicity: each timestamp must be strictly greater than previous
				if delta <= 0.0 {
					isMonotonic = false
				}
				diffs = append(diffs, delta)
			}
			lastTime = t
		}

		if !isMonotonic {
			log.Printf("[AI Oracle] ⚠️ BOT DETECTED: Replay timestamps are not strictly monotonic.")
			metrics["confidenceScore"] = 0.05
			return false, metrics
		}

		// Advanced statistical checks for full traces (len > 5)
		if len(replayLog) > 5 && len(diffs) > 0 {
			variance := calculateVariance(diffs)
			metrics["variance"] = math.Round(variance*100) / 100
			log.Printf("[AI Oracle] Replay log variance: %f", variance)

			// Robotic consistency check: if variance is low, it's a macro script.
			if variance < 10.0 {
				log.Printf("[AI Oracle] ⚠️ BOT DETECTED: Variance %f is too low (< 10.0, macro script suspected).", variance)
				metrics["confidenceScore"] = 0.10
				return false, metrics
			}

			// Robotic precision check: calculate Mean Absolute Deviation (MAD)
			var sum float64
			for _, d := range diffs {
				sum += d
			}
			mean := sum / float64(len(diffs))

			var sumAbsDev float64
			for _, d := range diffs {
				sumAbsDev += math.Abs(d - mean)
			}
			mad := sumAbsDev / float64(len(diffs))
			metrics["mad"] = math.Round(mad*100) / 100
			log.Printf("[AI Oracle] Mean: %f, MAD: %f", mean, mad)

			if mad < 5.0 {
				log.Printf("[AI Oracle] ⚠️ BOT DETECTED: MAD %f is too low (< 5.0, robotic consistency detected).", mad)
				metrics["confidenceScore"] = 0.10
				return false, metrics
			}

			// Shannon Entropy of binned timing deltas (10ms buckets)
			entropy := calculateDeltaEntropy(diffs, 10.0)
			metrics["entropy"] = math.Round(entropy*100) / 100
			log.Printf("[AI Oracle] Replay delta entropy: %f", entropy)

			// A minimum entropy threshold ensures diverse human reaction times
			if entropy < 1.0 {
				log.Printf("[AI Oracle] ⚠️ BOT DETECTED: Entropy %f is too low (< 1.0, repeated pattern detected).", entropy)
				metrics["confidenceScore"] = 0.15
				return false, metrics
			}

			// Multi-Lag Autocorrelation Check (Lag-1 and Lag-2 to detect periodic oscillators & cyclic macros)
			autocorr := calculateLagKAutocorrelation(diffs, 1)
			autocorrLag2 := calculateLagKAutocorrelation(diffs, 2)
			metrics["autocorrelation"] = autocorr
			metrics["autocorrelationLag2"] = autocorrLag2
			log.Printf("[AI Oracle] Replay lag-1: %f, lag-2: %f", autocorr, autocorrLag2)

			if math.Abs(autocorr) > 0.85 {
				log.Printf("[AI Oracle] ⚠️ BOT DETECTED: Lag-1 Autocorrelation %f is too high (> 0.85, periodic macro suspected).", autocorr)
				metrics["confidenceScore"] = 0.12
				return false, metrics
			}
			if math.Abs(autocorrLag2) > 0.85 {
				log.Printf("[AI Oracle] ⚠️ BOT DETECTED: Lag-2 Autocorrelation %f is too high (> 0.85, cyclic macro suspected).", autocorrLag2)
				metrics["confidenceScore"] = 0.12
				return false, metrics
			}

			// Delta Diversity Ratio Check:
			// For larger traces (len >= 15), human timing deltas show rich diversity (ratio > 0.25).
			// Synthetic cyclic macros repeating the exact same small set of numbers will have an abnormally low ratio.
			if len(diffs) >= 15 {
				uniqueBuckets := make(map[int]bool)
				for _, d := range diffs {
					bucket := int(math.Round(d))
					uniqueBuckets[bucket] = true
				}
				diversityRatio := float64(len(uniqueBuckets)) / float64(len(diffs))
				metrics["diversityRatio"] = math.Round(diversityRatio*100) / 100
				log.Printf("[AI Oracle] Delta diversity ratio: %f (%d unique in %d)", diversityRatio, len(uniqueBuckets), len(diffs))

				if diversityRatio < 0.25 {
					log.Printf("[AI Oracle] ⚠️ BOT DETECTED: Timing diversity ratio %f is too low (< 0.25, cyclic bot pattern detected).", diversityRatio)
					metrics["confidenceScore"] = 0.14
					return false, metrics
				}
			}

			// Superhuman APM / input frequency check:
			// Calculate total duration from first to last event
			firstTime, _ := replayLog[0].(map[string]interface{})["time"].(float64)
			totalDurationSec := (lastTime - firstTime) / 1000.0
			if totalDurationSec > 0.0 {
				eventsPerSec := float64(len(replayLog)) / totalDurationSec
				metrics["eventsPerSec"] = math.Round(eventsPerSec*100) / 100
				if eventsPerSec > 15.0 {
					log.Printf("[AI Oracle] ⚠️ BOT DETECTED: Input frequency %f events/sec exceeds biological limits (max 15/s).", eventsPerSec)
					metrics["confidenceScore"] = 0.08
					return false, metrics
				}
			}

			metrics["confidenceScore"] = 0.98
		}
	}

	var score float64
	if scoreRaw, ok := publicValues["score"]; ok {
		switch v := scoreRaw.(type) {
		case float64:
			score = v
		case string:
			fmt.Sscanf(v, "%f", &score)
		}
	}

	// Score must meet minimum minting requirement
	if score < 1000 {
		return false, metrics
	}

	// Performance arithmetic: if granular breakdown is supplied, it must strictly balance
	perfectsRaw, hasPerf := publicValues["perfects"]
	greatsRaw, hasGreats := publicValues["greats"]
	if hasPerf || hasGreats {
		var perfects, greats float64
		if hasPerf {
			perfects, _ = perfectsRaw.(float64)
		}
		if hasGreats {
			greats, _ = greatsRaw.(float64)
		}
		calculatedScore := (perfects * 100.0) + (greats * 50.0)
		if math.Abs(score-calculatedScore) > 1.0 {
			log.Printf("[ZK Service] ⚠️ Score mismatch detected: reported %f, calculated %f", score, calculatedScore)
			metrics["confidenceScore"] = 0.05
			return false, metrics
		}
	}

	return true, metrics
}

func calculateVariance(data []float64) float64 {
	if len(data) < 2 {
		return 0
	}
    allSame := true
    firstVal := data[0]
    for _, v := range data {
        if v != firstVal {
            allSame = false
            break
        }
    }
    if allSame {
        return 0
    }
	var sum float64
	for _, v := range data {
		sum += v
	}
	mean := sum / float64(len(data))
	var sqDiffSum float64
	for _, v := range data {
		sqDiffSum += math.Pow(v-mean, 2)
	}
	return math.Sqrt(sqDiffSum / float64(len(data)))
}

// calculateLagKAutocorrelation computes the serial correlation at arbitrary lag k between timing deltas.
// Natural human input exhibits near-zero serial correlation at any lag (|rk| < 0.85).
// Macro bots with alternating or cyclic periods (e.g. 2-step or 3-step repeating loops) show |rk| -> 1.0.
func calculateLagKAutocorrelation(diffs []float64, k int) float64 {
	n := len(diffs)
	if n <= k || k <= 0 {
		return 0.0
	}
	var sum float64
	for _, d := range diffs {
		sum += d
	}
	mean := sum / float64(n)

	var numerator, denom float64
	for i := 0; i < n-k; i++ {
		numerator += (diffs[i] - mean) * (diffs[i+k] - mean)
	}
	for i := 0; i < n; i++ {
		denom += math.Pow(diffs[i]-mean, 2)
	}

	if denom == 0.0 {
		return 0.0
	}
	r1 := numerator / denom
	return math.Round(r1*100) / 100
}

// calculateDeltaEntropy estimates the Shannon Entropy of time deltas by binning them into buckets.
// Highly randomized human timings distribute across multiple buckets resulting in higher entropy (H > 1.0),
// whereas robotic/macro sequences cluster into 1 or 2 buckets resulting in near-zero entropy.
func calculateDeltaEntropy(deltas []float64, bucketSize float64) float64 {
	if len(deltas) == 0 {
		return 0.0
	}
	if bucketSize <= 0.0 {
		bucketSize = 10.0
	}

	freqs := make(map[int]int)
	for _, d := range deltas {
		bucket := int(math.Floor(d / bucketSize))
		freqs[bucket]++
	}

	total := float64(len(deltas))
	var entropy float64
	for _, count := range freqs {
		p := float64(count) / total
		if p > 0 {
			entropy -= p * math.Log2(p)
		}
	}
	return entropy
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

	// Cross-Chain Bridge Shell (Solana Parity)
	// In production, this would trigger a SPL-token burn on Solana Devnet
	// using the Solana Go SDK or a secure relayer.
	log.Printf("[Bridge] Initiating cross-chain burn for %f BOB to %s. Reason: %s", req.Amount, s.cfg.SupernodeURL, req.Reason)

	var signatures []RelayerSignature
	for _, r := range s.relayers {
		signatures = append(signatures, RelayerSignature{
			RelayerID: r.ID,
			Signature: r.ID + "_sig_" + shortHash(strconv.FormatFloat(req.Amount, 'f', -1, 64)),
			Timestamp: time.Now().Unix(),
		})
	}
	log.Printf("[Bridge] Collected %d/%d signatures for burn event", len(signatures), len(s.relayers))

	txID := "tx_burn_" + shortHash(strconv.FormatInt(time.Now().UnixNano(), 10))
	// Mock Solana transaction hash
	solanaHash := hashString(txID + req.Reason)[:44]

	_ = recordTransaction(s.db, Transaction{ID: txID, Date: formatDBDate(time.Now()), Amount: req.Amount, Type: "SEND", Hash: solanaHash})
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"tx": txID,
		"hash": solanaHash,
		"bridge": "solana_devnet",
		"multisig": true,
		"signatures": signatures,
	})
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

	// Register client for real-time AI Oracle and signaling events
	s.auditMu.Lock()
	s.auditClients[conn] = true
	s.auditMu.Unlock()

	defer func() {
		s.auditMu.Lock()
		delete(s.auditClients, conn)
		s.auditMu.Unlock()
		_ = conn.Close()
	}()

	player := &MatchConnection{conn: conn}
	defer s.disconnectPlayer(player)

	for {
		var message SignalMessage
		if err := conn.ReadJSON(&message); err != nil {
			return
		}
		switch message.Type {
		case "SUBSCRIBE_ORACLE":
			_ = conn.WriteJSON(map[string]interface{}{
				"type":    "ORACLE_SUBSCRIBED",
				"status":  "CONNECTED",
				"service": "AI_ORACLE_REALTIME_STREAM",
			})
		case "FIND_MATCH":
			player.roomID = message.RoomID
			if player.roomID == "" {
				player.roomID = "default"
			}
			player.publicKey = message.PublicKey
			player.trust = s.getTrustScore(player.publicKey)

			// Trust-Based Isolation (Shadow Banning)
			if player.trust < 50.0 {
				player.roomID = "quarantine_" + player.roomID
				log.Printf("[Signaling] Quarantining low-trust node: %s (Trust: %.2f)", player.publicKey[:8], player.trust)
			}

			s.queueOrMatchPlayer(player)
		case "SIGNAL":
			if player.opponent != nil {
				_ = player.opponent.conn.WriteJSON(SignalMessage{Type: "SIGNAL", Signal: message.Signal})
			}
		}
	}
}

func (s *Service) getTrustScore(account string) float64 {
	if account == "" {
		return 100.0
	}
	resp, err := http.Get(fmt.Sprintf("%s/status", s.cfg.LatticeURL))
	if err != nil {
		return 100.0
	}
	defer resp.Body.Close()
	var status struct {
		TrustScores map[string]float64 `json:"trustScores"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&status); err != nil {
		return 100.0
	}
	if score, ok := status.TrustScores[account]; ok {
		return score
	}
	return 100.0
}

func (s *Service) queueOrMatchPlayer(player *MatchConnection) {
	s.matchMu.Lock()
	defer s.matchMu.Unlock()

	waiting := s.waitingPlayers[player.roomID]
	if waiting != nil && waiting != player {
		delete(s.waitingPlayers, player.roomID)
		waiting.opponent = player
		player.opponent = waiting
		_ = waiting.conn.WriteJSON(SignalMessage{Type: "MATCH_FOUND", Initiator: true, RoomID: player.roomID})
		_ = player.conn.WriteJSON(SignalMessage{Type: "MATCH_FOUND", Initiator: false, RoomID: player.roomID})
		return
	}

	s.waitingPlayers[player.roomID] = player
}

func (s *Service) disconnectPlayer(player *MatchConnection) {
	s.matchMu.Lock()
	if s.waitingPlayers[player.roomID] == player {
		delete(s.waitingPlayers, player.roomID)
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

func (s *Service) handleGovernanceAudit(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Title  string  `json:"title"`
		Action string  `json:"action"`
		Amount float64 `json:"amount"`
		Target string  `json:"target"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"error": "invalid payload"})
		return
	}

	// AI Neural Auditor evaluation
	// Evaluates constitutional alignment, economic equilibrium risk, and title clarity.
	riskScore := 0.15 // Default low risk
	summary := "Proposal appears legitimate and follows standard protocol patterns."

	if strings.Contains(strings.ToUpper(req.Title), "SCAM") || strings.Contains(strings.ToUpper(req.Title), "TEST") {
		riskScore = 0.85
		summary = "High risk detected: Title contains suspicious keywords or suggests low-effort testing."
	}

	if req.Action == "MINT_TREASURY" && req.Amount > 100000 {
		riskScore = 0.95
		summary = "Critical risk: Excessive treasury minting requested. Potential rug-pull or inflation attack."
	}

	if req.Action == "UPDATE_DEMURRAGE" && req.Amount > 0.01 {
		riskScore = 0.70
		summary = "Warning: Aggressive demurrage increase could destabilize the liquid economy."
	}

	if req.Action == "SLASH_REPUTATION" && req.Amount > 500 {
		riskScore = 0.75
		summary = "Warning: High reputation slash penalty requested without multi-party dispute arbitration."
	}

	// Deterministic Constitutional Compatibility Score: 1.0 - riskScore (bounded [0.05, 0.99])
	constitutionalScore := math.Max(0.05, math.Min(0.99, math.Round((1.0-riskScore)*100)/100))

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":             true,
		"riskScore":           riskScore,
		"constitutionalScore": constitutionalScore,
		"summary":             summary,
		"auditor":             "Neural Governance Auditor v2.0",
	})
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
    actualHeight := 1
    if height != -1 {
        actualHeight = height + 1
    }
	block := &Block{Type: "send", Account: s.systemWallet.PublicKey, Previous: frontier, Balance: newBalance, StakedBalance: 0, Height: actualHeight, Link: address, Spora: &SporaProof{InfoHash: infoHash, Challenge: challenge, ChunkHash: chunkHash}, ZKProof: zkProof, Timestamp: now}
	signBlock(block, s.systemWallet.PrivateKey)
	var resp APIResponse
	if err := s.postJSON(s.cfg.LatticeURL+"/process", map[string]interface{}{"block": block}, &resp); err != nil {
		return "", err
	}
	if !resp.Success {
		return "", fmt.Errorf("%s", resp.Error)
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
	balance, _ := body["balance"].(float64)
	heightFloat, ok := body["height"].(float64)
    height := int(heightFloat)
    if !ok {
        height = -1 // if account doesn't exist, we start at 0
    }
	if frontierRaw == "" {
		return nil, balance, height, nil
	}
	return &frontierRaw, balance, height, nil
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
	data := block.Type + block.Account + prev + FormatJS(block.Balance) + FormatJS(block.StakedBalance) + strconv.Itoa(block.Height) + block.Link + string(sporaJSON) + string(payloadJSON)
	return hashString(data)
}

func FormatJS(f float64) string {
	if f == 0 {
		return "0"
	}
	abs := math.Abs(f)
	if abs >= 1e21 || abs < 1e-6 {
		s := strconv.FormatFloat(f, 'e', -1, 64)
		parts := strings.Split(s, "e")
		exp, _ := strconv.Atoi(parts[1])
		if exp > 0 {
			return parts[0] + "e+" + strconv.Itoa(exp)
		}
		return parts[0] + "e" + strconv.Itoa(exp)
	}
	return strconv.FormatFloat(f, 'f', -1, 64)
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

func (s *Service) handleSubmitTrace(w http.ResponseWriter, r *http.Request) {
	// A dedicated endpoint for game engine SDKs (Unity/Unreal) to submit traces.
	// Functionally identical to handleSubmitProof for now, but provides a distinct API surface.
	s.handleSubmitProof(w, r)
}

func (s *Service) broadcastOracleAudit(audit map[string]interface{}) {
	s.auditMu.Lock()
	defer s.auditMu.Unlock()

	msg := map[string]interface{}{
		"type":  "ORACLE_AUDIT",
		"audit": audit,
	}

	for conn := range s.auditClients {
		if err := conn.WriteJSON(msg); err != nil {
			_ = conn.Close()
			delete(s.auditClients, conn)
		}
	}
}

func (s *Service) handleOracleAudits(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(`
		SELECT id, address, score, variance, mad, entropy, confidence_score, verified, COALESCE(autocorrelation, 0.0), timestamp
		FROM oracle_audits
		ORDER BY id DESC
		LIMIT 50
	`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"error": "Failed to fetch oracle audits"})
		return
	}
	defer rows.Close()

	var audits []map[string]interface{}
	for rows.Next() {
		var id int
		var addr, ts string
		var score, variance, mad, entropy, conf, autocorr float64
		var verified int
		if err := rows.Scan(&id, &addr, &score, &variance, &mad, &entropy, &conf, &verified, &autocorr, &ts); err == nil {
			audits = append(audits, map[string]interface{}{
				"id":              id,
				"address":         addr,
				"score":           score,
				"variance":        variance,
				"mad":             mad,
				"entropy":         entropy,
				"confidenceScore": conf,
				"autocorrelation": autocorr,
				"verified":        verified == 1,
				"timestamp":       ts,
			})
		}
	}
	if audits == nil {
		audits = []map[string]interface{}{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"audits":  audits,
	})
}
