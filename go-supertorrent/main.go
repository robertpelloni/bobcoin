package main

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/mr-tron/base58"
)

type Config struct {
	Port          string
	LatticeURL    string
	GameServerURL string
	UploadsDir    string
	DownloadsDir  string
	ShardsDir     string
	ManifestsDir  string
	WalletFile    string
	TorrentsFile  string
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
	Payload       interface{} `json:"payload,omitempty"`
	Timestamp     int64       `json:"timestamp"`
	Hash          string      `json:"hash"`
	Signature     string      `json:"signature"`
}

type TorrentRecord struct {
	Magnet   string `json:"magnet"`
	InfoHash string `json:"infoHash"`
	Name     string `json:"name,omitempty"`
	Size     int64  `json:"size,omitempty"`
	AddedAt  int64  `json:"addedAt"`
	Source   string `json:"source,omitempty"`
	Accepted bool   `json:"accepted"`
}

type Bid struct {
	ID         string  `json:"id"`
	Magnet     string  `json:"magnet"`
	Amount     float64 `json:"amount"`
	Status     string  `json:"status"`
	AcceptedBy string  `json:"acceptedBy,omitempty"`
}

type PendingTx struct {
	Hash   string  `json:"hash"`
	Amount float64 `json:"amount"`
}

type APIResponse struct {
	Success  bool        `json:"success"`
	Error    string      `json:"error,omitempty"`
	Hash     string      `json:"hash,omitempty"`
	Bids     []Bid       `json:"bids,omitempty"`
	Pending  []PendingTx `json:"pending,omitempty"`
	Balance  float64     `json:"balance,omitempty"`
	Frontier string      `json:"frontier,omitempty"`
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

type ShardUploadRequest struct {
	Hash string `json:"hash"`
	Data string `json:"data"`
}

type ManifestPublishRequest struct {
	Manifest map[string]interface{} `json:"manifest"`
}

type SuperTorrentService struct {
	cfg           Config
	wallet        Wallet
	nodeID        string
	started       time.Time
	mu            sync.RWMutex
	torrents      map[string]*TorrentRecord
	httpClient    *http.Client
	matchMu       sync.Mutex
	waitingPlayer *MatchConnection
	upgrader      websocket.Upgrader
}

var coreArcadeAnchors = []struct {
	Name   string
	Magnet string
}{
	{Name: "bobsgame-arcade-tokyo", Magnet: "magnet:?xt=urn:btih:1234567890abcdef1234567890abcdef12345678"},
	{Name: "fwber-hq-node", Magnet: "magnet:?xt=urn:btih:abcdef1234567890abcdef1234567890abcdef12"},
}

func main() {
	cfg := Config{
		Port:          envOrDefault("SUPERNODE_PORT", "8081"),
		LatticeURL:    envOrDefault("LATTICE_URL", "http://localhost:4001"),
		GameServerURL: envOrDefault("GAME_SERVER_URL", "http://localhost:3001"),
		UploadsDir:    envOrDefault("SUPERTORRENT_UPLOADS_DIR", filepath.Join("go-supertorrent", "uploads")),
		DownloadsDir:  envOrDefault("SUPERTORRENT_DOWNLOADS_DIR", filepath.Join("go-supertorrent", "downloads")),
		ShardsDir:     envOrDefault("SUPERTORRENT_SHARDS_DIR", filepath.Join("go-supertorrent", "shards")),
		ManifestsDir:  envOrDefault("SUPERTORRENT_MANIFESTS_DIR", filepath.Join("go-supertorrent", "manifests")),
		WalletFile:    envOrDefault("SUPERTORRENT_WALLET_FILE", filepath.Join("go-supertorrent", "wallet.json")),
		TorrentsFile:  envOrDefault("SUPERTORRENT_TORRENTS_FILE", filepath.Join("go-supertorrent", "torrents.json")),
	}

	service, err := NewSuperTorrentService(cfg)
	if err != nil {
		log.Fatalf("failed to initialize go-supertorrent: %v", err)
	}

	go service.bootstrapWalletOnLattice()
	go service.pollOpenBids()

	mux := http.NewServeMux()
	mux.HandleFunc("/", service.handleRoot)
	mux.HandleFunc("/stats", service.handleStats)
	mux.HandleFunc("/add-torrent", service.handleAddTorrent)
	mux.HandleFunc("/remove-torrent", service.handleRemoveTorrent)
	mux.HandleFunc("/upload", service.handleUpload)
	mux.HandleFunc("/upload-shard", service.handleUploadShard)
	mux.HandleFunc("/publish-manifest", service.handlePublishManifest)
	mux.HandleFunc("/manifests/", service.handleGetManifest)
	mux.HandleFunc("/shards/", service.handleGetShard)
	mux.HandleFunc("/spora/", service.handleSpora)

	log.Printf("[go-supertorrent %s] listening on :%s", service.nodeID, cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, withCORS(mux)); err != nil {
		log.Fatalf("go-supertorrent server failed: %v", err)
	}
}

func NewSuperTorrentService(cfg Config) (*SuperTorrentService, error) {
	for _, dir := range []string{cfg.UploadsDir, cfg.DownloadsDir, cfg.ShardsDir, cfg.ManifestsDir, filepath.Dir(cfg.WalletFile), filepath.Dir(cfg.TorrentsFile)} {
		if dir == "." || dir == "" {
			continue
		}
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, err
		}
	}

	wallet, err := loadOrCreateWallet(cfg.WalletFile)
	if err != nil {
		return nil, err
	}

	torrents, err := loadTorrentRegistry(cfg.TorrentsFile)
	if err != nil {
		return nil, err
	}

	svc := &SuperTorrentService{
		cfg:        cfg,
		wallet:     wallet,
		nodeID:     "sn_" + shortHash(wallet.PublicKey),
		started:    time.Now(),
		torrents:   torrents,
		httpClient: &http.Client{Timeout: 15 * time.Second},
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}

	for _, anchor := range coreArcadeAnchors {
		infoHash := magnetInfoHash(anchor.Magnet)
		if _, ok := svc.torrents[infoHash]; !ok {
			svc.torrents[infoHash] = &TorrentRecord{Magnet: anchor.Magnet, InfoHash: infoHash, Name: anchor.Name, AddedAt: time.Now().UnixMilli(), Source: "core-anchor", Accepted: true}
		}
	}
	if err := svc.saveTorrents(); err != nil {
		return nil, err
	}

	return svc, nil
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

func loadTorrentRegistry(path string) (map[string]*TorrentRecord, error) {
	registry := make(map[string]*TorrentRecord)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return registry, nil
		}
		return nil, err
	}
	var list []*TorrentRecord
	if err := json.Unmarshal(data, &list); err != nil {
		return nil, err
	}
	for _, item := range list {
		registry[item.InfoHash] = item
	}
	return registry, nil
}

func (s *SuperTorrentService) saveTorrents() error {
	s.mu.RLock()
	list := make([]*TorrentRecord, 0, len(s.torrents))
	for _, record := range s.torrents {
		copyRecord := *record
		list = append(list, &copyRecord)
	}
	s.mu.RUnlock()
	data, _ := json.MarshalIndent(list, "", "  ")
	return os.WriteFile(s.cfg.TorrentsFile, data, 0o644)
}

func (s *SuperTorrentService) bootstrapWalletOnLattice() {
	time.Sleep(5 * time.Second)
	if err := s.bootstrapWalletOnLatticeOnce(); err != nil {
		log.Printf("[go-supertorrent] bootstrap error: %v", err)
	}
}

func (s *SuperTorrentService) bootstrapWalletOnLatticeOnce() error {
	frontier, _, _, err := s.fetchFrontier(s.wallet.PublicKey)
	if err != nil {
		return err
	}
	if frontier != nil {
		return nil
	}
	log.Printf("[go-supertorrent] account not open on lattice, requesting bootstrap mint")

	payload := map[string]interface{}{"amount": 1, "reason": "Go SuperTorrent Bootstrapping", "address": s.wallet.PublicKey}
	var mintResp APIResponse
	if err := s.postJSON(s.cfg.GameServerURL+"/mint", payload, &mintResp); err != nil {
		return err
	}
	if !mintResp.Success {
		return fmt.Errorf("%s", mintResp.Error)
	}

	pending, err := s.fetchPending(s.wallet.PublicKey)
	if err != nil {
		return err
	}
	if len(pending) == 0 {
		return fmt.Errorf("no pending bootstrap funds found")
	}

	baseHash := hashString(s.wallet.PublicKey)
	challenge := parseChallenge(baseHash)
	infoHash := magnetInfoHash(coreArcadeAnchors[0].Magnet)
	chunkHash := hashString(infoHash + strconv.Itoa(challenge))
	balance := pending[0].Amount
	now := time.Now().UnixMilli()
	block := &Block{Type: "open", Account: s.wallet.PublicKey, Previous: nil, Balance: balance, StakedBalance: 0, Height: 0, Link: mintResp.Hash, Spora: &SporaProof{InfoHash: infoHash, Challenge: challenge, ChunkHash: chunkHash}, Timestamp: now}
	signBlock(block, s.wallet.PrivateKey)

	var resp APIResponse
	if err := s.postJSON(s.cfg.LatticeURL+"/process", map[string]interface{}{"block": block}, &resp); err != nil {
		return err
	}
	if !resp.Success {
		return fmt.Errorf("%s", resp.Error)
	}
	log.Printf("[go-supertorrent] lattice wallet opened successfully")
	return nil
}

func (s *SuperTorrentService) pollOpenBids() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		if err := s.processOpenBidsOnce(); err != nil {
			log.Printf("[go-supertorrent] open bid polling error: %v", err)
		}
	}
}

func (s *SuperTorrentService) processOpenBidsOnce() error {
	var resp APIResponse
	if err := s.getJSON(s.cfg.LatticeURL+"/market/bids", &resp); err != nil {
		return err
	}
	for _, bid := range resp.Bids {
		if bid.Status != "OPEN" || bid.Magnet == "" {
			continue
		}
		infoHash := magnetInfoHash(bid.Magnet)
		s.mu.RLock()
		_, alreadyTracking := s.torrents[infoHash]
		s.mu.RUnlock()
		if alreadyTracking {
			continue
		}
		s.trackTorrent(TorrentRecord{Magnet: bid.Magnet, InfoHash: infoHash, Name: "market-bid-" + shortHash(bid.ID), AddedAt: time.Now().UnixMilli(), Source: "market-bid", Accepted: true})
		if err := s.acceptBidOnLattice(bid); err != nil {
			log.Printf("[go-supertorrent] failed to accept bid %s: %v", shortHash(bid.ID), err)
		}
	}
	return nil
}

func (s *SuperTorrentService) acceptBidOnLattice(bid Bid) error {
	frontier, balance, height, err := s.fetchFrontier(s.wallet.PublicKey)
	if err != nil {
		return err
	}
	if frontier == nil {
		return fmt.Errorf("wallet not initialized on lattice")
	}
	baseHash := *frontier
	challenge := parseChallenge(baseHash)
	infoHash := magnetInfoHash(coreArcadeAnchors[0].Magnet)
	chunkHash := hashString(infoHash + strconv.Itoa(challenge))
	now := time.Now().UnixMilli()
	block := &Block{Type: "accept_bid", Account: s.wallet.PublicKey, Previous: frontier, Balance: balance + bid.Amount, StakedBalance: 0, Height: height + 1, Link: bid.ID, Spora: &SporaProof{InfoHash: infoHash, Challenge: challenge, ChunkHash: chunkHash}, Timestamp: now}
	signBlock(block, s.wallet.PrivateKey)
	var resp APIResponse
	if err := s.postJSON(s.cfg.LatticeURL+"/process", map[string]interface{}{"block": block}, &resp); err != nil {
		return err
	}
	if !resp.Success {
		return fmt.Errorf("%s", resp.Error)
	}
	return nil
}

func (s *SuperTorrentService) handleRoot(w http.ResponseWriter, r *http.Request) {
	if websocket.IsWebSocketUpgrade(r) {
		s.handleMatchmakingWebSocket(w, r)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"status": "online", "service": "Go SuperTorrent control plane", "version": "0.2.0-go", "wallet": s.wallet.PublicKey})
}

func (s *SuperTorrentService) handleMatchmakingWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[go-supertorrent] websocket upgrade failed: %v", err)
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

func (s *SuperTorrentService) queueOrMatchPlayer(player *MatchConnection) {
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

func (s *SuperTorrentService) disconnectPlayer(player *MatchConnection) {
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

func (s *SuperTorrentService) trackTorrent(record TorrentRecord) {
	s.mu.Lock()
	s.torrents[record.InfoHash] = &record
	s.mu.Unlock()
	_ = s.saveTorrents()
}

func (s *SuperTorrentService) removeTorrent(infoHash string) {
	s.mu.Lock()
	delete(s.torrents, infoHash)
	s.mu.Unlock()
	_ = s.saveTorrents()
}

func (s *SuperTorrentService) handleStats(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	torrents := make([]map[string]interface{}, 0, len(s.torrents))
	var totalSize int64
	for _, torrent := range s.torrents {
		torrents = append(torrents, map[string]interface{}{"infoHash": torrent.InfoHash, "name": torrent.Name, "progress": 1.0, "peers": 0, "totalSize": torrent.Size, "source": torrent.Source})
		totalSize += torrent.Size
	}
	s.mu.RUnlock()
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"address": s.nodeID,
		"wallet":  s.wallet.PublicKey,
		"uptime":  time.Since(s.started).Seconds(),
		"network": map[string]interface{}{"downloadSpeed": 0, "uploadSpeed": 0, "peers": 0},
		"storage": map[string]interface{}{"totalSize": totalSize, "torrents": torrents},
	})
}

func (s *SuperTorrentService) handleAddTorrent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{"error": "method not allowed"})
		return
	}
	var req struct {
		Magnet string `json:"magnet"`
		Name   string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Magnet == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"error": "magnet link required"})
		return
	}
	infoHash := magnetInfoHash(req.Magnet)
	s.trackTorrent(TorrentRecord{Magnet: req.Magnet, InfoHash: infoHash, Name: firstNonEmpty(req.Name, "tracked-"+infoHash[:12]), AddedAt: time.Now().UnixMilli(), Source: "manual", Accepted: true})
	writeJSON(w, http.StatusOK, map[string]interface{}{"success": true, "status": "tracked", "infoHash": infoHash})
}

func (s *SuperTorrentService) handleRemoveTorrent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{"error": "method not allowed"})
		return
	}
	var req struct {
		InfoHash string `json:"infoHash"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.InfoHash == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"error": "infoHash required"})
		return
	}
	s.removeTorrent(req.InfoHash)
	writeJSON(w, http.StatusOK, map[string]interface{}{"success": true})
}

func (s *SuperTorrentService) handleUploadShard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{"error": "method not allowed"})
		return
	}
	var req ShardUploadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Hash == "" || req.Data == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"error": "hash and data required"})
		return
	}
	decoded, err := base64.StdEncoding.DecodeString(req.Data)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"error": "invalid base64 shard data"})
		return
	}
	shardPath := filepath.Join(s.cfg.ShardsDir, req.Hash)
	if err := os.WriteFile(shardPath, decoded, 0o644); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"success": true, "hash": req.Hash, "size": len(decoded), "url": "/shards/" + req.Hash})
}

func (s *SuperTorrentService) handlePublishManifest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{"error": "method not allowed"})
		return
	}
	var req ManifestPublishRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Manifest == nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"error": "manifest required"})
		return
	}
	manifestID, _ := req.Manifest["manifestId"].(string)
	if manifestID == "" {
		manifestID = "manifest-" + shortHash(strconv.FormatInt(time.Now().UnixNano(), 10))
		req.Manifest["manifestId"] = manifestID
	}
	manifestPath := filepath.Join(s.cfg.ManifestsDir, manifestID+".json")
	manifestURL := "/manifests/" + manifestID
	if _, ok := req.Manifest["locator"]; !ok {
		req.Manifest["locator"] = "bobtorrent://manifest/" + manifestID
	}
	if _, ok := req.Manifest["manifestUrl"]; !ok {
		req.Manifest["manifestUrl"] = manifestURL
	}
	data, _ := json.MarshalIndent(req.Manifest, "", "  ")
	if err := os.WriteFile(manifestPath, data, 0o644); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"success": true, "id": manifestID, "locator": req.Manifest["locator"], "manifestUrl": req.Manifest["manifestUrl"], "manifest": req.Manifest})
}

func (s *SuperTorrentService) handleGetManifest(w http.ResponseWriter, r *http.Request) {
	manifestID := strings.TrimPrefix(r.URL.Path, "/manifests/")
	if manifestID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"error": "manifest id required"})
		return
	}
	data, err := os.ReadFile(filepath.Join(s.cfg.ManifestsDir, manifestID+".json"))
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]interface{}{"error": "manifest not found"})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func (s *SuperTorrentService) handleGetShard(w http.ResponseWriter, r *http.Request) {
	hash := strings.TrimPrefix(r.URL.Path, "/shards/")
	if hash == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"error": "shard hash required"})
		return
	}
	data, err := os.ReadFile(filepath.Join(s.cfg.ShardsDir, hash))
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]interface{}{"error": "shard not found"})
		return
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func (s *SuperTorrentService) handleUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{"error": "method not allowed"})
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"error": "no file uploaded"})
		return
	}
	defer file.Close()
	storedPath, size, infoHash, err := saveUploadedFile(file, header, s.cfg.UploadsDir)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	magnet := "magnet:?xt=urn:btih:" + infoHash
	s.trackTorrent(TorrentRecord{Magnet: magnet, InfoHash: infoHash, Name: header.Filename, Size: size, AddedAt: time.Now().UnixMilli(), Source: storedPath, Accepted: true})
	writeJSON(w, http.StatusOK, map[string]interface{}{"success": true, "name": header.Filename, "magnet": magnet, "infoHash": infoHash, "size": size})
}

func (s *SuperTorrentService) handleSpora(w http.ResponseWriter, r *http.Request) {
	challenge := strings.TrimPrefix(r.URL.Path, "/spora/")
	if challenge == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"error": "challenge required"})
		return
	}
	infoHash := magnetInfoHash(coreArcadeAnchors[0].Magnet)
	chunkHash := hashString(infoHash + challenge)
	writeJSON(w, http.StatusOK, map[string]interface{}{"success": true, "spora": map[string]interface{}{"infoHash": infoHash, "challenge": atoiDefault(challenge), "chunkHash": chunkHash}})
}

func saveUploadedFile(file multipart.File, header *multipart.FileHeader, uploadsDir string) (string, int64, string, error) {
	tempPath := filepath.Join(uploadsDir, fmt.Sprintf("%d_%s", time.Now().UnixNano(), filepath.Base(header.Filename)))
	out, err := os.Create(tempPath)
	if err != nil {
		return "", 0, "", err
	}
	defer out.Close()
	hasher := sha256.New()
	written, err := io.Copy(io.MultiWriter(out, hasher), file)
	if err != nil {
		return "", 0, "", err
	}
	return tempPath, written, hex.EncodeToString(hasher.Sum(nil)), nil
}

func (s *SuperTorrentService) fetchPending(account string) ([]PendingTx, error) {
	var resp APIResponse
	if err := s.getJSON(s.cfg.LatticeURL+"/pending/"+account, &resp); err != nil {
		return nil, err
	}
	return resp.Pending, nil
}

func (s *SuperTorrentService) fetchFrontier(account string) (*string, float64, int, error) {
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

func (s *SuperTorrentService) getJSON(url string, target interface{}) error {
	resp, err := s.httpClient.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return json.NewDecoder(resp.Body).Decode(target)
}

func (s *SuperTorrentService) postJSON(url string, payload interface{}, target interface{}) error {
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

func shortHash(value string) string {
	h := hashString(value)
	if len(h) < 10 {
		return h
	}
	return h[:10]
}

func parseChallenge(baseHash string) int { return atoiDefault(baseHash[:8]) }
func atoiDefault(v string) int           { n, _ := strconv.ParseInt(v, 16, 64); return int(n) }
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
func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

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
