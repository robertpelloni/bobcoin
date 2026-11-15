package main

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/mr-tron/base58"
)

type Config struct {
	LatticeURL    string
	GameServerURL string
	SupernodeURL  string
	WalletFile    string
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

type PendingTx struct {
	Hash   string  `json:"hash"`
	Amount float64 `json:"amount"`
	Sender string  `json:"sender"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Error   string      `json:"error,omitempty"`
	Hash    string      `json:"hash,omitempty"`
	Pending []PendingTx `json:"pending,omitempty"`
}

type CasinoBot struct {
	cfg        Config
	wallet     Wallet
	httpClient *http.Client
}

func main() {
	cfg := Config{
		LatticeURL:    envOrDefault("LATTICE_URL", "http://localhost:4001"),
		GameServerURL: envOrDefault("GAME_SERVER_URL", "http://localhost:3001"),
		SupernodeURL:  envOrDefault("SUPERNODE_URL", "http://localhost:8000"),
		WalletFile:    envOrDefault("CASINO_WALLET_FILE", filepath.Join("go-casino", "casino_wallet.json")),
	}

	bot, err := NewCasinoBot(cfg)
	if err != nil {
		log.Fatalf("failed to initialize go-casino: %v", err)
	}

	log.Printf("[go-casino] Autonomous Smart Contract Bot starting... Wallet: %s", bot.wallet.PublicKey[:16])

	bot.bootstrap()

	// Main Loop
	ticker := time.NewTicker(5 * time.Second)
	for range ticker.C {
		bot.pollAndProcess()
	}
}

func NewCasinoBot(cfg Config) (*CasinoBot, error) {
	if err := os.MkdirAll(filepath.Dir(cfg.WalletFile), 0o755); err != nil {
		return nil, err
	}

	wallet, err := loadOrCreateWallet(cfg.WalletFile)
	if err != nil {
		return nil, err
	}

	return &CasinoBot{
		cfg:        cfg,
		wallet:     wallet,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}, nil
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

func (b *CasinoBot) bootstrap() {
	frontier, _, _, err := b.fetchFrontier(b.wallet.PublicKey)
	if err == nil && frontier != nil {
		log.Printf("[go-casino] Wallet already initialized on lattice.")
		return
	}

	log.Printf("[go-casino] Requesting bootstrap bankroll...")
	payload := map[string]interface{}{"amount": 500, "reason": "Go Casino Bankroll", "address": b.wallet.PublicKey}
	var mintResp APIResponse
	if err := b.postJSON(b.cfg.GameServerURL+"/mint", payload, &mintResp); err != nil || !mintResp.Success {
		log.Printf("[go-casino] bootstrap mint failed: %v", err)
		return
	}

	time.Sleep(2 * time.Second)

	pending, err := b.fetchPending(b.wallet.PublicKey)
	if err != nil || len(pending) == 0 {
		log.Printf("[go-casino] failed to find pending bootstrap funds")
		return
	}

	baseHash := hashString(b.wallet.PublicKey)
	challenge := parseChallenge(baseHash)
	spora := b.getSpora(challenge)

	block := &Block{
		Type:          "open",
		Account:       b.wallet.PublicKey,
		Previous:      nil,
		Balance:       pending[0].Amount,
		StakedBalance: 0,
		Height:        0,
		Link:          mintResp.Hash,
		Spora:         spora,
		Timestamp:     time.Now().UnixMilli(),
	}
	signBlock(block, b.wallet.PrivateKey)

	var resp APIResponse
	if err := b.postJSON(b.cfg.LatticeURL+"/process", map[string]interface{}{"block": block}, &resp); err == nil && resp.Success {
		log.Printf("[go-casino] ✅ Casino is OPEN for business!")
	}
}

func (b *CasinoBot) pollAndProcess() {
	pending, err := b.fetchPending(b.wallet.PublicKey)
	if err != nil || len(pending) == 0 {
		return
	}

	for _, tx := range pending {
		senderPrefix := tx.Sender
		if len(senderPrefix) > 8 {
			senderPrefix = senderPrefix[:8]
		}
		log.Printf("[go-casino] 🎰 Received %f BOB from %s... Processing bet!", tx.Amount, senderPrefix)
		b.processBet(tx)
	}
}

func (b *CasinoBot) processBet(tx PendingTx) {
	frontier, balance, height, err := b.fetchFrontier(b.wallet.PublicKey)
	if err != nil || frontier == nil {
		return
	}

	// 1. Receive
	challenge := parseChallenge(*frontier)
	spora := b.getSpora(challenge)
	newBalance := balance + tx.Amount
	receiveBlock := &Block{
		Type:          "receive",
		Account:       b.wallet.PublicKey,
		Previous:      frontier,
		Balance:       newBalance,
		StakedBalance: 0,
		Height:        height + 1,
		Link:          tx.Hash,
		Spora:         spora,
		Timestamp:     time.Now().UnixMilli(),
	}
	signBlock(receiveBlock, b.wallet.PrivateKey)

	var resp APIResponse
	if err := b.postJSON(b.cfg.LatticeURL+"/process", map[string]interface{}{"block": receiveBlock}, &resp); err != nil || !resp.Success {
		log.Printf("[go-casino] failed to accept bet: %v", err)
		return
	}

	// 2. Play (Provably Fair)
	// Last byte of user's send hash determines win/loss
	lastByte, _ := strconv.ParseInt(tx.Hash[len(tx.Hash)-2:], 16, 64)
	isWinner := lastByte%2 == 0

	if isWinner {
		payout := tx.Amount * 1.98
		log.Printf("[go-casino] 🎉 Player WON! Payout: %f BOB", payout)

		// 3. Payout
		f2, b2, h2, _ := b.fetchFrontier(b.wallet.PublicKey)
		if f2 == nil {
			return
		}

		challenge2 := parseChallenge(*f2)
		spora2 := b.getSpora(challenge2)

		finalBalance := b2 - payout
		sendBlock := &Block{
			Type:          "send",
			Account:       b.wallet.PublicKey,
			Previous:      f2,
			Balance:       finalBalance,
			StakedBalance: 0,
			Height:        h2 + 1,
			Link:          tx.Sender,
			Spora:         spora2,
			Payload:       map[string]interface{}{"memo": "Casino Payout! You won!"},
			Timestamp:     time.Now().UnixMilli(),
		}
		signBlock(sendBlock, b.wallet.PrivateKey)
		b.postJSON(b.cfg.LatticeURL+"/process", map[string]interface{}{"block": sendBlock}, &APIResponse{})
	} else {
		log.Printf("[go-casino] 💀 Player LOST! House keeps the bet.")
	}
}

func (b *CasinoBot) fetchPending(account string) ([]PendingTx, error) {
	var resp APIResponse
	if err := b.getJSON(b.cfg.LatticeURL+"/pending/"+account, &resp); err != nil {
		return nil, err
	}
	return resp.Pending, nil
}

func (b *CasinoBot) fetchFrontier(account string) (*string, float64, int, error) {
	var body map[string]interface{}
	if err := b.getJSON(b.cfg.LatticeURL+"/frontier/"+account, &body); err != nil {
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

func (b *CasinoBot) getSpora(challenge int) *SporaProof {
	url := fmt.Sprintf("%s/spora/%d", b.cfg.SupernodeURL, challenge)
	var resp struct {
		Success bool        `json:"success"`
		Spora   *SporaProof `json:"spora"`
	}
	if err := b.getJSON(url, &resp); err != nil || !resp.Success {
		return nil
	}
	return resp.Spora
}

func (b *CasinoBot) getJSON(url string, target interface{}) error {
	resp, err := b.httpClient.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return json.NewDecoder(resp.Body).Decode(target)
}

func (b *CasinoBot) postJSON(url string, payload interface{}, target interface{}) error {
	body, _ := json.Marshal(payload)
	resp, err := b.httpClient.Post(url, "application/json", strings.NewReader(string(body)))
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

func hashString(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func parseChallenge(baseHash string) int {
	val, _ := strconv.ParseInt(baseHash[:8], 16, 64)
	return int(val)
}

func envOrDefault(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
