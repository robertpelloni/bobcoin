package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"sort"
	"strconv"
	"sync"
	"time"
)

type PendingTx struct {
	Hash   string  `json:"hash"`
	Amount float64 `json:"amount"`
	Sender string  `json:"account"`
}

type MultisigVault struct {
	Participants     []string             `json:"participants"`
	Threshold        int                  `json:"threshold"`
	Balance          float64              `json:"balance"`
	PendingProposals map[string]*Proposal `json:"pendingProposals"`
}

type Proposal struct {
	ID         string   `json:"id"`
	Recipient  string   `json:"recipient"`
	Amount     float64  `json:"amount"`
	Signatures []string `json:"signatures"` // List of member pubkeys who signed
	Executed   bool     `json:"executed"`
}

type LiquidityPool struct {
	AssetA      string  `json:"assetA"` // Always BOB
	AssetB      string  `json:"assetB"` // e.g., sSOL
	ReserveA    float64 `json:"reserveA"`
	ReserveB    float64 `json:"reserveB"`
	TotalShares float64 `json:"totalShares"`
}

type HTLCSwap struct {
	Sender    string  `json:"sender"`
	Recipient string  `json:"recipient"`
	Amount    float64 `json:"amount"`
	Expiry    int64   `json:"expiry"`
	Status    string  `json:"status"`
	Claimer   string  `json:"claimer,omitempty"`
}

type PeerInfo struct {
	URL        string `json:"url"`
	Latency    int64  `json:"latency"` // in milliseconds
	LastSeen   int64  `json:"lastSeen"`
	Status     string `json:"status"`
	MerkleRoot string `json:"merkleRoot"`
	Blocks     int    `json:"blocks"`
}

type Lattice struct {
	mu            sync.RWMutex
	db            *DBManager
	Chains        map[string][]*Block
	Blocks        map[string]*Block
	Pending       map[string][]*PendingTx
	Proposals     map[string]interface{}
	Votes         map[string]map[string]map[string]interface{}
	MarketBids    map[string]interface{}
	Swaps         map[string]*HTLCSwap
	Nfts          map[string]interface{}
	Anchors       map[string]interface{}
	Multisigs     map[string]*MultisigVault
	Pools         map[string]*LiquidityPool // PairName -> Pool
	Peers         map[string]*PeerInfo      // URL -> Stats
	StateHash     string
	MerkleRoot    string  // God-Hash of all account states
	QuorumScore   float64 // % of network in agreement
	DemurrageRate float64
}

func newEphemeralLattice() *Lattice {
	l := &Lattice{
		Chains:        make(map[string][]*Block),
		Blocks:        make(map[string]*Block),
		Pending:       make(map[string][]*PendingTx),
		Proposals:     make(map[string]interface{}),
		Votes:         make(map[string]map[string]map[string]interface{}),
		MarketBids:    make(map[string]interface{}),
		Swaps:         make(map[string]*HTLCSwap),
		Nfts:          make(map[string]interface{}),
		Anchors:       make(map[string]interface{}),
		Multisigs:     make(map[string]*MultisigVault),
		Pools:         make(map[string]*LiquidityPool),
		Peers:         make(map[string]*PeerInfo),
		StateHash:     "0000000000000000000000000000000000000000000000000000000000000000",
		MerkleRoot:    "0000000000000000000000000000000000000000000000000000000000000000",
		QuorumScore:   100.0,
		DemurrageRate: 0.0001 / 60000,
	}

	l.Pools["BOB/sSOL"] = &LiquidityPool{
		AssetA:      "BOB",
		AssetB:      "sSOL",
		ReserveA:    10000,
		ReserveB:    420,
		TotalShares: 1000,
	}

	return l
}

func NewLattice(db *DBManager) *Lattice {
	l := newEphemeralLattice()
	l.db = db

	// Cold Boot Recovery
	l.Recovery()
	return l
}

func (l *Lattice) Recovery() {
	fmt.Println("[Lattice] Initializing Cold Boot Recovery...")
	blocks, err := l.db.LoadAllBlocks()
	if err != nil {
		fmt.Printf("[Recovery Error] %v\n", err)
		return
	}

	type recoveryFailure struct {
		block *Block
		err   error
	}

	remaining := append([]*Block(nil), blocks...)
	recovered := 0
	for len(remaining) > 0 {
		bucketEnd := 1
		for bucketEnd < len(remaining) && remaining[bucketEnd].Timestamp == remaining[0].Timestamp {
			bucketEnd++
		}
		bucket := append([]*Block(nil), remaining[:bucketEnd]...)
		remaining = remaining[bucketEnd:]

		for len(bucket) > 0 {
			nextBucket := make([]*Block, 0, len(bucket))
			failures := make([]recoveryFailure, 0, len(bucket))
			progress := false

			for _, b := range bucket {
				if err := l.ProcessBlock(b, true); err != nil {
					nextBucket = append(nextBucket, b)
					failures = append(failures, recoveryFailure{block: b, err: err})
					continue
				}
				recovered++
				progress = true
			}

			if !progress {
				for _, failure := range failures {
					fmt.Printf("[Recovery Error] Block %s rejected during replay: %v\n", failure.block.Hash[:8], failure.err)
				}
				remaining = nil
				break
			}
			bucket = nextBucket
		}
	}
	fmt.Printf("[Lattice] Recovery Complete. Restored %d blocks. Root: %s...\n", recovered, l.StateHash[:16])
}

func (l *Lattice) ProcessBlock(block *Block, isRecovery bool) error {
	if !isRecovery {
		l.mu.Lock()
		defer l.mu.Unlock()
	}

	// 1. Signature Verification
	if !block.Verify() {
		return errors.New("invalid block signature")
	}

	isGenesisBootstrap := block.Type == "open" && block.Link == "SYSTEM_GENESIS" && len(l.Chains) == 0

	// 1.5 ZK-Proof Verification (for Minting blocks)
	if block.Type == "receive" && block.Link == "SYSTEM_MINT" {
		if block.ZKProof == "" {
			return errors.New("missing SP1 zero-knowledge proof for minting")
		}
		fmt.Printf("[Lattice] Validating ZK Proof for minting block: %s...\n", block.ZKProof[:16])
	}

	// 1.6 SPoRA Verification (Succinct Proof of Random Access)
	// Bypassed only for the single system genesis bootstrapping block.
	if !isGenesisBootstrap {
		if block.Spora == nil || block.Spora.InfoHash == "" || block.Spora.ChunkHash == "" {
			return errors.New("missing or invalid SPoRA proof. Must seed Bobtorrent to mine")
		}

		// Challenge must be deterministic based on the previous block hash
		prevHash := ""
		if block.Previous != nil {
			prevHash = *block.Previous
		} else {
			// For 'open' blocks, use account hash as challenge base
			h := sha256.New()
			h.Write([]byte(block.Account))
			prevHash = hex.EncodeToString(h.Sum(nil))
		}

		expectedChallenge, _ := strconv.ParseInt(prevHash[:8], 16, 64)
		if int(expectedChallenge) != block.Spora.Challenge {
			return fmt.Errorf("SPoRA challenge mismatch. Expected %d, got %d", expectedChallenge, block.Spora.Challenge)
		}

		// Re-verify the chunk proof (Simulated cryptographic check)
		expectedChunkData := block.Spora.InfoHash + strconv.Itoa(int(expectedChallenge))
		h := sha256.New()
		h.Write([]byte(expectedChunkData))
		verifiedChunkHash := hex.EncodeToString(h.Sum(nil))

		if block.Spora.ChunkHash != verifiedChunkHash {
			return errors.New("SPoRA chunkHash is mathematically invalid")
		}
	}

	chain := l.Chains[block.Account]
	var head *Block
	if len(chain) > 0 {
		head = chain[len(chain)-1]
	}

	// 2. Continuity & Height Checks
	if block.Type == "open" {
		if head != nil {
			return errors.New("account already open")
		}
		if block.Height != 0 {
			return errors.New("open block height must be 0")
		}
	} else {
		if head == nil {
			return errors.New("account not open")
		}
		if block.Previous == nil || *block.Previous != head.Hash {
			return errors.New("invalid previous hash link")
		}
		if block.Height != head.Height+1 {
			return fmt.Errorf("invalid height: expected %d, got %d", head.Height+1, block.Height)
		}
	}

	// 3. Staked Invariant
	prevStaked := 0.0
	if head != nil {
		prevStaked = head.StakedBalance
	}
	if block.Type != "stake_lock" && block.Type != "stake_unlock" && block.Type != "open" {
		if math.Abs(block.StakedBalance-prevStaked) > 0.001 {
			return errors.New("staked balance invariant violation")
		}
	}

	// 4. Consensus Rules (Balance, etc)
	l.refreshProposalStatusesAt(time.UnixMilli(block.Timestamp))
	epsilon := 0.001
	prevBalance := 0.0
	if head != nil {
		prevBalance = head.Balance
		// Apply Demurrage
		elapsed := block.Timestamp - head.Timestamp
		if elapsed > 0 {
			decay := prevBalance * l.DemurrageRate * float64(elapsed)
			prevBalance = math.Max(0, prevBalance-decay)
		}
	}

	if block.Type == "send" {
		if block.Balance > prevBalance+epsilon {
			return fmt.Errorf("insufficient balance for send")
		}
		amount := prevBalance - block.Balance

		// If recipient is a multisig, update its balance
		if vault, ok := l.Multisigs[block.Link]; ok {
			vault.Balance += amount
		} else {
			// Standard account pending
			l.Pending[block.Link] = append(l.Pending[block.Link], &PendingTx{
				Hash:   block.Hash,
				Amount: amount,
				Sender: block.Account,
			})
		}
	} else if block.Type == "receive" || block.Type == "open" {
		if isGenesisBootstrap {
			// Genesis bootstrap open block bypasses pending-receive requirements.
		} else {
			list := l.Pending[block.Account]
			found := false
			var amount float64
			for i, p := range list {
				if p.Hash == block.Link {
					amount = p.Amount
					l.Pending[block.Account] = append(list[:i], list[i+1:]...)
					found = true
					break
				}
			}
			if !found {
				return fmt.Errorf("pending send block not found")
			}
			if math.Abs(block.Balance-(prevBalance+amount)) > epsilon {
				return fmt.Errorf("invalid receive balance")
			}
		}
	} else if block.Type == "proposal" {
		if math.Abs(block.Balance-(prevBalance-10)) > epsilon {
			return fmt.Errorf("proposal costs 10 BOB")
		}
		payload, ok := block.Payload.(map[string]interface{})
		if !ok || payload["title"] == nil || payload["endTime"] == nil {
			return fmt.Errorf("invalid proposal payload")
		}
	} else if block.Type == "vote" {
		if math.Abs(block.Balance-prevBalance) > epsilon {
			return fmt.Errorf("vote block must not change balance")
		}
		payload, ok := block.Payload.(map[string]interface{})
		if !ok || payload["vote"] == nil {
			return fmt.Errorf("invalid vote payload")
		}
	} else if block.Type == "market_bid" {
		if block.Balance > prevBalance+epsilon {
			return fmt.Errorf("market bid must decrease balance")
		}
		payload, ok := block.Payload.(map[string]interface{})
		if !ok || payload["magnet"] == nil {
			return fmt.Errorf("invalid market bid payload")
		}
	} else if block.Type == "accept_bid" {
		bidRaw, ok := l.MarketBids[block.Link]
		if !ok {
			return fmt.Errorf("target market bid not found")
		}
		bid := bidRaw.(map[string]interface{})
		if bid["status"] != "OPEN" {
			return fmt.Errorf("market bid is already accepted or closed")
		}
		amount, ok := bid["amount"].(float64)
		if !ok {
			return fmt.Errorf("market bid amount malformed")
		}
		if math.Abs(block.Balance-(prevBalance+amount)) > epsilon {
			return fmt.Errorf("accept bid block must correctly increment balance by bid amount")
		}
	} else if block.Type == "achievement_unlock" {
		if math.Abs(block.Balance-prevBalance) > epsilon {
			return fmt.Errorf("achievement unlock cannot change balance")
		}
	} else if block.Type == "swap_lock" {
		amount := prevBalance - block.Balance
		if amount <= 0 {
			return fmt.Errorf("swap lock must decrease balance")
		}
		payload, ok := block.Payload.(map[string]interface{})
		if !ok || payload["secretHash"] == nil || payload["recipient"] == nil {
			return fmt.Errorf("invalid swap_lock payload")
		}
	} else if block.Type == "swap_claim" {
		payload, ok := block.Payload.(map[string]interface{})
		if !ok || payload["secret"] == nil || payload["secretHash"] == nil {
			return fmt.Errorf("invalid swap_claim payload")
		}
		secretHash, _ := payload["secretHash"].(string)
		swap := l.Swaps[secretHash]
		if swap == nil {
			return fmt.Errorf("swap not found")
		}
		if swap.Status != "LOCKED" {
			return fmt.Errorf("swap already claimed or expired")
		}
		if time.Now().UnixMilli() > swap.Expiry {
			return fmt.Errorf("swap expired")
		}
		secret, _ := payload["secret"].(string)
		if Hash(secret) != secretHash {
			return fmt.Errorf("invalid secret for HTLC claim")
		}
		if math.Abs(block.Balance-(prevBalance+swap.Amount)) > epsilon {
			return fmt.Errorf("swap claim must increment balance by locked amount")
		}
	} else if block.Type == "mint_nft" {
		if math.Abs(block.Balance-(prevBalance-50)) > epsilon {
			return fmt.Errorf("NFT minting costs exactly 50 BOB")
		}
		payload, ok := block.Payload.(map[string]interface{})
		if !ok || payload["name"] == nil || payload["magnet"] == nil {
			return fmt.Errorf("invalid NFT metadata")
		}
	} else if block.Type == "transfer_nft" {
		if math.Abs(block.Balance-(prevBalance-1)) > epsilon {
			return fmt.Errorf("NFT transfer costs 1 BOB fee")
		}
		nftRaw, ok := l.Nfts[block.Link]
		if !ok {
			return fmt.Errorf("NFT not found")
		}
		nft, ok := nftRaw.(map[string]interface{})
		if !ok {
			return fmt.Errorf("NFT state malformed")
		}
		owner, _ := nft["owner"].(string)
		if owner != block.Account {
			return fmt.Errorf("you do not own this NFT")
		}
		payload, ok := block.Payload.(map[string]interface{})
		if !ok || payload["recipient"] == nil {
			return fmt.Errorf("recipient required for NFT transfer")
		}
	} else if block.Type == "data_anchor" {
		amount := prevBalance - block.Balance
		if amount <= 0 {
			return fmt.Errorf("data anchor must pay storage fee")
		}
		payload, ok := block.Payload.(map[string]interface{})
		if !ok || payload["magnet"] == nil || payload["name"] == nil {
			return fmt.Errorf("invalid data anchor metadata")
		}
	} else if block.Type == "publish_manifest" {
		if math.Abs(block.Balance-prevBalance) > epsilon {
			return fmt.Errorf("publish_manifest cannot change balance")
		}
		payload, ok := block.Payload.(map[string]interface{})
		if !ok || payload["manifestId"] == nil || payload["locator"] == nil || payload["manifestUrl"] == nil {
			return fmt.Errorf("invalid publish_manifest payload")
		}
	} else if block.Type == "multisig_create" {
		if math.Abs(block.Balance-(prevBalance-100)) > epsilon {
			return fmt.Errorf("multisig creation costs exactly 100 BOB")
		}
		payload, ok := block.Payload.(map[string]interface{})
		if !ok || payload["participants"] == nil || payload["threshold"] == nil {
			return fmt.Errorf("invalid multisig parameters")
		}
	} else if block.Type == "multisig_propose" {
		if math.Abs(block.Balance-prevBalance) > epsilon {
			return fmt.Errorf("multisig propose cannot change balance")
		}
	} else if block.Type == "multisig_approve" {
		if math.Abs(block.Balance-prevBalance) > epsilon {
			return fmt.Errorf("multisig approve cannot change balance")
		}
	} else if block.Type == "stake_lock" {
		amount := prevBalance - block.Balance
		if amount <= 0 {
			return errors.New("stake lock must decrease liquid balance")
		}
		if math.Abs(block.StakedBalance-(prevStaked+amount)) > epsilon {
			return errors.New("invalid staked balance")
		}
	} else if block.Type == "stake_unlock" {
		amount := block.Balance - prevBalance
		if amount <= 0 {
			return errors.New("stake unlock must increase liquid balance")
		}
		if math.Abs(block.StakedBalance-(prevStaked-amount)) > epsilon {
			return errors.New("invalid staked balance")
		}
		if block.StakedBalance < -epsilon {
			return errors.New("insufficient staked balance")
		}
	} else if block.Type == "amm_swap" {
		payload, ok := block.Payload.(map[string]interface{})
		if !ok || payload["pair"] == nil || payload["amountIn"] == nil {
			return fmt.Errorf("invalid amm swap payload")
		}
	} else {
		return fmt.Errorf("invalid block type")
	}

	// 6. Type-Specific State Updates (Governance, Storage, NFTs, Multisig, DeFi)
	if block.Type == "proposal" {
		payload := block.Payload.(map[string]interface{})
		endTime, _ := payload["endTime"].(string)
		l.Proposals[block.Hash] = map[string]interface{}{
			"id":           block.Hash,
			"proposer":     block.Account,
			"title":        payload["title"],
			"status":       "Active",
			"votesFor":     0.0,
			"votesAgainst": 0.0,
			"endTime":      endTime,
			"timestamp":    block.Timestamp,
		}
		l.Votes[block.Hash] = make(map[string]map[string]interface{})
	} else if block.Type == "vote" {
		payload := block.Payload.(map[string]interface{})
		proposalRaw, ok := l.Proposals[block.Link]
		if !ok {
			return fmt.Errorf("target proposal not found")
		}
		proposal := proposalRaw.(map[string]interface{})
		if proposal["status"] != "Active" {
			return fmt.Errorf("proposal is closed")
		}
		endTime, _ := proposal["endTime"].(string)
		if endTime != "" {
			if parsed, err := time.Parse(time.RFC3339, endTime); err == nil && block.Timestamp >= parsed.UnixMilli() {
				return fmt.Errorf("proposal is closed")
			}
		}
		if _, ok := l.Votes[block.Link]; !ok {
			l.Votes[block.Link] = make(map[string]map[string]interface{})
		}
		if _, exists := l.Votes[block.Link][block.Account]; exists {
			return fmt.Errorf("account has already voted on this proposal")
		}

		voteType, _ := payload["vote"].(string)
		power := math.Sqrt(math.Max(block.Balance, 0))
		l.Votes[block.Link][block.Account] = map[string]interface{}{
			"type":  voteType,
			"power": power,
		}

		if voteType == "FOR" {
			proposal["votesFor"] = proposal["votesFor"].(float64) + power
		} else {
			proposal["votesAgainst"] = proposal["votesAgainst"].(float64) + power
		}
	} else if block.Type == "market_bid" {
		payload := block.Payload.(map[string]interface{})
		amount := math.Max(prevBalance-block.Balance, 0)
		l.MarketBids[block.Hash] = map[string]interface{}{
			"id":        block.Hash,
			"creator":   block.Account,
			"magnet":    payload["magnet"],
			"amount":    amount,
			"status":    "OPEN",
			"timestamp": block.Timestamp,
		}
	} else if block.Type == "accept_bid" {
		bid := l.MarketBids[block.Link].(map[string]interface{})
		bid["status"] = "ACCEPTED"
		bid["acceptedBy"] = block.Account
	} else if block.Type == "swap_lock" {
		payload := block.Payload.(map[string]interface{})
		expiry := int64(time.Now().UnixMilli() + 3600000)
		switch v := payload["expiry"].(type) {
		case float64:
			expiry = int64(v)
		case int64:
			expiry = v
		case int:
			expiry = int64(v)
		}
		amount := prevBalance - block.Balance
		secretHash, _ := payload["secretHash"].(string)
		recipient, _ := payload["recipient"].(string)
		l.Swaps[secretHash] = &HTLCSwap{
			Sender:    block.Account,
			Recipient: recipient,
			Amount:    amount,
			Expiry:    expiry,
			Status:    "LOCKED",
		}
	} else if block.Type == "swap_claim" {
		payload := block.Payload.(map[string]interface{})
		secretHash, _ := payload["secretHash"].(string)
		swap := l.Swaps[secretHash]
		swap.Status = "CLAIMED"
		swap.Claimer = block.Account
	} else if block.Type == "mint_nft" {
		payload := block.Payload.(map[string]interface{})
		l.Nfts[block.Hash] = map[string]interface{}{
			"id":          block.Hash,
			"owner":       block.Account,
			"name":        payload["name"],
			"magnet":      payload["magnet"],
			"description": payload["description"],
			"timestamp":   block.Timestamp,
		}
	} else if block.Type == "transfer_nft" {
		payload := block.Payload.(map[string]interface{})
		nft := l.Nfts[block.Link].(map[string]interface{})
		nft["owner"] = payload["recipient"]
	} else if block.Type == "data_anchor" || block.Type == "publish_manifest" {
		payload, ok := block.Payload.(map[string]interface{})
		payloadCopy := map[string]interface{}{}
		if ok {
			for key, value := range payload {
				payloadCopy[key] = value
			}
		}
		payloadCopy["id"] = block.Hash
		payloadCopy["owner"] = block.Account
		payloadCopy["timestamp"] = block.Timestamp
		if payloadCopy["type"] == nil {
			payloadCopy["type"] = block.Type
		}
		l.Anchors[block.Hash] = payloadCopy
	} else if block.Type == "multisig_create" {
		payload := block.Payload.(map[string]interface{})
		partsRaw := payload["participants"].([]interface{})
		var participants []string
		for _, p := range partsRaw {
			participants = append(participants, p.(string))
		}
		vaultAddr := deterministicMultisigAddress(participants)

		l.Multisigs[vaultAddr] = &MultisigVault{
			Participants:     participants,
			Threshold:        int(payload["threshold"].(float64)),
			Balance:          0,
			PendingProposals: make(map[string]*Proposal),
		}
	} else if block.Type == "multisig_propose" {
		payload := block.Payload.(map[string]interface{})
		vaultAddr := payload["vault"].(string)
		vault := l.Multisigs[vaultAddr]
		if vault == nil {
			return fmt.Errorf("vault not found")
		}

		vault.PendingProposals[block.Hash] = &Proposal{
			ID:         block.Hash,
			Recipient:  payload["recipient"].(string),
			Amount:     payload["amount"].(float64),
			Signatures: []string{block.Account},
			Executed:   false,
		}
	} else if block.Type == "multisig_approve" {
		payload := block.Payload.(map[string]interface{})
		vaultAddr := payload["vault"].(string)
		proposalID := payload["proposalID"].(string)
		vault := l.Multisigs[vaultAddr]
		if vault == nil {
			return fmt.Errorf("vault not found")
		}
		prop := vault.PendingProposals[proposalID]
		if prop == nil {
			return fmt.Errorf("proposal not found")
		}

		for _, s := range prop.Signatures {
			if s == block.Account {
				return fmt.Errorf("already signed")
			}
		}
		prop.Signatures = append(prop.Signatures, block.Account)

		if len(prop.Signatures) >= vault.Threshold {
			if vault.Balance < prop.Amount {
				return fmt.Errorf("insufficient vault balance")
			}
			prop.Executed = true
			vault.Balance -= prop.Amount
			l.Pending[prop.Recipient] = append(l.Pending[prop.Recipient], &PendingTx{
				Hash: prop.ID, Amount: prop.Amount, Sender: vaultAddr,
			})
			fmt.Printf("[Lattice] Multisig proposal executed: %s\n", prop.ID[:8])
		}
	} else if block.Type == "amm_swap" {
		payload := block.Payload.(map[string]interface{})
		pair := payload["pair"].(string)
		pool := l.Pools[pair]
		if pool == nil {
			return fmt.Errorf("pool not found")
		}

		amountIn := payload["amountIn"].(float64)
		// Swap BOB (A) for sSOL (B)
		// Constant Product: (x + dx)(y - dy) = xy
		// dy = y * dx / (x + dx)
		dx := amountIn
		dy := (pool.ReserveB * dx) / (pool.ReserveA + dx)

		fmt.Printf("[AMM] Swap: %f BOB for %f sSOL. New Price: %f\n", dx, dy, (pool.ReserveA+dx)/(pool.ReserveB-dy))

		pool.ReserveA += dx
		pool.ReserveB -= dy
	}

	// 7. Commit In-Memory
	l.Chains[block.Account] = append(l.Chains[block.Account], block)
	l.Blocks[block.Hash] = block

	// 8. Persist to Disk
	if !isRecovery {
		if err := l.db.SaveBlock(block); err != nil {
			if rollbackErr := l.rollbackUnpersistedBlock(block); rollbackErr != nil {
				return fmt.Errorf("failed to persist block: %v (rollback failed: %v)", err, rollbackErr)
			}
			return fmt.Errorf("failed to persist block: %v", err)
		}
	}

	// 9. Update State Root + State Merkle Tree only after all validation and persistence succeeds
	h := sha256.New()
	h.Write([]byte(l.StateHash + block.Hash))
	l.StateHash = hex.EncodeToString(h.Sum(nil))
	l.MerkleRoot = calculateMerkleRootFromChains(l.Chains)

	return nil
}

func (l *Lattice) GetBalance(account string, ts int64) float64 {
	l.mu.RLock()
	defer l.mu.RUnlock()

	chain, ok := l.Chains[account]
	if !ok || len(chain) == 0 {
		return 0
	}
	head := chain[len(chain)-1]

	// Apply Demurrage
	elapsed := ts - head.Timestamp
	if elapsed <= 0 {
		return head.Balance
	}
	decay := head.Balance * l.DemurrageRate * float64(elapsed)
	return math.Max(0, head.Balance-decay)
}

func deterministicMultisigAddress(participants []string) string {
	participantsJSON, _ := json.Marshal(participants)
	address := Hash(string(participantsJSON))
	if len(address) > 44 {
		return address[:44]
	}
	return address
}

func (l *Lattice) refreshProposalStatusesAt(at time.Time) {
	for _, proposalRaw := range l.Proposals {
		proposal, ok := proposalRaw.(map[string]interface{})
		if !ok {
			continue
		}
		status, _ := proposal["status"].(string)
		if status != "Active" {
			continue
		}
		endTime, _ := proposal["endTime"].(string)
		if endTime == "" {
			continue
		}
		parsed, err := time.Parse(time.RFC3339, endTime)
		if err != nil || at.Before(parsed) {
			continue
		}
		votesFor, _ := proposal["votesFor"].(float64)
		votesAgainst, _ := proposal["votesAgainst"].(float64)
		if votesFor > votesAgainst {
			proposal["status"] = "Passed"
		} else {
			proposal["status"] = "Rejected"
		}
	}
}

func (l *Lattice) rollbackUnpersistedBlock(block *Block) error {
	chain := l.Chains[block.Account]
	if len(chain) > 0 && chain[len(chain)-1].Hash == block.Hash {
		chain = chain[:len(chain)-1]
		if len(chain) == 0 {
			delete(l.Chains, block.Account)
		} else {
			l.Chains[block.Account] = chain
		}
	}
	delete(l.Blocks, block.Hash)
	return l.AuditState()
}

func (l *Lattice) GetStateSnapshot() map[string]interface{} {
	l.mu.RLock()
	defer l.mu.RUnlock()

	return map[string]interface{}{
		"chains":     l.Chains,
		"blocks":     l.Blocks,
		"pending":    l.Pending,
		"proposals":  l.Proposals,
		"votes":      l.Votes,
		"marketBids": l.MarketBids,
		"swaps":      l.Swaps,
		"nfts":       l.Nfts,
		"anchors":    l.Anchors,
		"multisigs":  l.Multisigs,
		"stateHash":  l.StateHash,
		"merkleRoot": l.MerkleRoot,
		"timestamp":  time.Now().UnixMilli(),
	}
}

func cloneBlock(block *Block) (*Block, error) {
	encoded, err := json.Marshal(block)
	if err != nil {
		return nil, err
	}
	var clone Block
	if err := json.Unmarshal(encoded, &clone); err != nil {
		return nil, err
	}
	return &clone, nil
}

func hashMatchesWithLegacyDerivedFields(block *Block) bool {
	if expected := block.CalculateHash(); expected == block.Hash {
		return true
	}

	if _, ok := block.Payload.(map[string]interface{}); !ok {
		return false
	}
	if block.Type != "data_anchor" && block.Type != "publish_manifest" {
		return false
	}

	clone, err := cloneBlock(block)
	if err != nil {
		return false
	}
	payloadClone, ok := clone.Payload.(map[string]interface{})
	if !ok {
		return false
	}
	delete(payloadClone, "id")
	delete(payloadClone, "owner")
	delete(payloadClone, "timestamp")
	if derivedType, ok := payloadClone["type"].(string); ok && derivedType == block.Type {
		delete(payloadClone, "type")
	}
	clone.Payload = payloadClone
	return clone.CalculateHash() == block.Hash
}

/**
 * Perform a full cryptographic audit of the entire ledger.
 * Replays all blocks onto a shadow lattice so derived state maps are rebuilt
 * from chain history rather than trusted blindly.
 */
func (l *Lattice) AuditState() error {
	fmt.Println("[Lattice] Initiating Global Consensus Audit...")

	type orderedBlock struct {
		account string
		index   int
		block   *Block
	}

	var ordered []orderedBlock
	for account, chain := range l.Chains {
		for i, block := range chain {
			if !block.Verify() {
				return fmt.Errorf("audit failed: invalid signature on block %s", block.Hash[:8])
			}
			if block.Height != i {
				return fmt.Errorf("audit failed: height gap detected in account %s", account[:8])
			}
			if !hashMatchesWithLegacyDerivedFields(block) {
				return fmt.Errorf("audit failed: hash mismatch on block %s", block.Hash[:8])
			}
			ordered = append(ordered, orderedBlock{account: account, index: i, block: block})
		}
	}

	sort.Slice(ordered, func(i, j int) bool {
		bi := ordered[i].block
		bj := ordered[j].block
		if bi.Timestamp != bj.Timestamp {
			return bi.Timestamp < bj.Timestamp
		}
		if bi.Account != bj.Account {
			return bi.Account < bj.Account
		}
		if bi.Height != bj.Height {
			return bi.Height < bj.Height
		}
		return bi.Hash < bj.Hash
	})

	shadow := newEphemeralLattice()
	remaining := append([]orderedBlock(nil), ordered...)
	for len(remaining) > 0 {
		bucketEnd := 1
		for bucketEnd < len(remaining) && remaining[bucketEnd].block.Timestamp == remaining[0].block.Timestamp {
			bucketEnd++
		}
		bucket := append([]orderedBlock(nil), remaining[:bucketEnd]...)
		remaining = remaining[bucketEnd:]

		for len(bucket) > 0 {
			nextBucket := make([]orderedBlock, 0, len(bucket))
			progress := false
			var lastErr error
			var lastHash string

			for _, entry := range bucket {
				cloned, err := cloneBlock(entry.block)
				if err != nil {
					return fmt.Errorf("audit failed: could not clone block %s: %v", entry.block.Hash[:8], err)
				}
				if err := shadow.ProcessBlock(cloned, true); err != nil {
					nextBucket = append(nextBucket, entry)
					lastErr = err
					lastHash = entry.block.Hash
					continue
				}
				progress = true
			}

			if !progress {
				return fmt.Errorf("audit failed during deterministic replay of block %s: %v", lastHash[:8], lastErr)
			}
			bucket = nextBucket
		}
	}

	l.Pending = shadow.Pending
	l.Proposals = shadow.Proposals
	l.Votes = shadow.Votes
	l.MarketBids = shadow.MarketBids
	l.Swaps = shadow.Swaps
	l.Nfts = shadow.Nfts
	l.Anchors = shadow.Anchors
	l.Multisigs = shadow.Multisigs
	l.Pools = shadow.Pools
	l.StateHash = shadow.StateHash
	l.MerkleRoot = shadow.MerkleRoot

	fmt.Printf("[Lattice] Audit Complete. Verified Integrity of %d chains. New Root: %s\n", len(l.Chains), l.MerkleRoot[:16])
	return nil
}
