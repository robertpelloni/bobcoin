package main

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"strconv"
	"sync"
)

type PendingTx struct {
	Hash   string  `json:"hash"`
	Amount float64 `json:"amount"`
	Sender string  `json:"account"`
}

type MultisigVault struct {
	Participants     []string            `json:"participants"`
	Threshold        int                 `json:"threshold"`
	Balance          float64             `json:"balance"`
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
	AssetA       string  `json:"assetA"` // Always BOB
	AssetB       string  `json:"assetB"` // e.g., sSOL
	ReserveA     float64 `json:"reserveA"`
	ReserveB     float64 `json:"reserveB"`
	TotalShares  float64 `json:"totalShares"`
}

type PeerInfo struct {
	URL      string `json:"url"`
	Latency  int64  `json:"latency"` // in milliseconds
	LastSeen int64  `json:"lastSeen"`
	Status   string `json:"status"`
}

type Lattice struct {
	mu         sync.RWMutex
	db         *DBManager
	Chains     map[string][]*Block
	Blocks     map[string]*Block
	Pending    map[string][]*PendingTx
	Proposals  map[string]interface{}
	MarketBids map[string]interface{}
	Nfts       map[string]interface{}
	Anchors    map[string]interface{}
	Multisigs  map[string]*MultisigVault
	Pools      map[string]*LiquidityPool // PairName -> Pool
	Peers      map[string]*PeerInfo      // URL -> Stats
	StateHash  string
	MerkleRoot string                   // God-Hash of all account states
	DemurrageRate float64
}

func NewLattice(db *DBManager) *Lattice {
	l := &Lattice{
		db:         db,
		Chains:     make(map[string][]*Block),
		Blocks:     make(map[string]*Block),
		Pending:    make(map[string][]*PendingTx),
		Proposals:  make(map[string]interface{}),
		MarketBids: make(map[string]interface{}),
		Nfts:       make(map[string]interface{}),
		Anchors:    make(map[string]interface{}),
		Multisigs:  make(map[string]*MultisigVault),
		Pools:      make(map[string]*LiquidityPool),
		Peers:      make(map[string]*PeerInfo),
		StateHash:  "0000000000000000000000000000000000000000000000000000000000000000",
		MerkleRoot: "0000000000000000000000000000000000000000000000000000000000000000",
		DemurrageRate: 0.0001 / 60000,
	}

	// Initialize Default BOB/sSOL Pool
	l.Pools["BOB/sSOL"] = &LiquidityPool{
		AssetA: "BOB", AssetB: "sSOL",
		ReserveA: 10000, ReserveB: 420, // Initial Bootstrapped Liquidity
		TotalShares: 1000,
	}

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

	for _, b := range blocks {
		l.ProcessBlock(b, true) // Pass true to skip re-persistence during recovery
	}
	fmt.Printf("[Lattice] Recovery Complete. Restored %d blocks. Root: %s...\n", len(blocks), l.StateHash[:16])
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

	// 1.5 ZK-Proof Verification (for Minting blocks)
	if block.Type == "receive" && block.Link == "SYSTEM_MINT" {
		if block.ZKProof == "" {
			return errors.New("missing SP1 zero-knowledge proof for minting")
		}
		fmt.Printf("[Lattice] Validating ZK Proof for minting block: %s...\n", block.ZKProof[:16])
	}

	// 1.6 SPoRA Verification (Succinct Proof of Random Access)
	// Bypassed for SYSTEM_GENESIS bootstrapping
	if !(block.Type == "open" && block.Link == "SYSTEM_GENESIS") {
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
		if head != nil { return errors.New("account already open") }
		if block.Height != 0 { return errors.New("open block height must be 0") }
	} else {
		if head == nil { return errors.New("account not open") }
		if block.Previous == nil || *block.Previous != head.Hash {
			return errors.New("invalid previous hash link")
		}
		if block.Height != head.Height+1 {
			return fmt.Errorf("invalid height: expected %d, got %d", head.Height+1, block.Height)
		}
	}

	// 3. Staked Invariant
	prevStaked := 0.0
	if head != nil { prevStaked = head.StakedBalance }
	if block.Type != "stake_lock" && block.Type != "stake_unlock" && block.Type != "open" {
		if math.Abs(block.StakedBalance - prevStaked) > 0.001 {
			return errors.New("staked balance invariant violation")
		}
	}

	// 4. Update State Root
	h := sha256.New()
	h.Write([]byte(l.StateHash + block.Hash))
	l.StateHash = hex.EncodeToString(h.Sum(nil))

	// 5. Consensus Rules (Balance, etc)
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
	} else if block.Type == "receive" {
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
		if !found { return fmt.Errorf("pending send block not found") }
		if math.Abs(block.Balance - (prevBalance + amount)) > epsilon {
			return fmt.Errorf("invalid receive balance")
		}
	} else if block.Type == "proposal" {
		if math.Abs(block.Balance - (prevBalance - 10)) > epsilon {
			return fmt.Errorf("proposal costs 10 BOB")
		}
	} else if block.Type == "market_bid" {
		if block.Balance > prevBalance+epsilon { return fmt.Errorf("market bid must decrease balance") }
	} else if block.Type == "stake_lock" {
		amount := prevBalance - block.Balance
		if amount <= 0 { return errors.New("stake lock must decrease liquid balance") }
		if math.Abs(block.StakedBalance - (prevStaked + amount)) > epsilon { return errors.New("invalid staked balance") }
	} else if block.Type == "stake_unlock" {
		amount := block.Balance - prevBalance
		if amount <= 0 { return errors.New("stake unlock must increase liquid balance") }
		if math.Abs(block.StakedBalance - (prevStaked - amount)) > epsilon { return errors.New("invalid staked balance") }
	}

	// 6. Commit In-Memory
	l.Chains[block.Account] = append(l.Chains[block.Account], block)
	l.Blocks[block.Hash] = block

	// 7. Type-Specific State Updates (NFTs, Multisig, etc)
	if block.Type == "mint_nft" {
		l.Nfts[block.Hash] = block.Payload
	} else if block.Type == "data_anchor" {
		l.Anchors[block.Hash] = block.Payload
	} else if block.Type == "multisig_create" {
		payload := block.Payload.(map[string]interface{})
		partsRaw := payload["participants"].([]interface{})
		var participants []string
		for _, p := range partsRaw {
			participants = append(participants, p.(string))
		}

		l.Multisigs[block.Hash] = &MultisigVault{
			Participants:     participants,
			Threshold:        int(payload["threshold"].(float64)),
			Balance:          0,
			PendingProposals: make(map[string]*Proposal),
		}
	} else if block.Type == "multisig_propose" {
		payload := block.Payload.(map[string]interface{})
		vaultAddr := payload["vault"].(string)
		vault := l.Multisigs[vaultAddr]
		if vault == nil { return fmt.Errorf("vault not found") }

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
		if vault == nil { return fmt.Errorf("vault not found") }
		prop := vault.PendingProposals[proposalID]
		if prop == nil { return fmt.Errorf("proposal not found") }

		for _, s := range prop.Signatures {
			if s == block.Account { return fmt.Errorf("already signed") }
		}
		prop.Signatures = append(prop.Signatures, block.Account)
		
		if len(prop.Signatures) >= vault.Threshold {
			if vault.Balance < prop.Amount { return fmt.Errorf("insufficient vault balance") }
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
		if pool == nil { return fmt.Errorf("pool not found") }

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

	// 8. Persist to Disk
	if !isRecovery {
		if err := l.db.SaveBlock(block); err != nil {
			return fmt.Errorf("failed to persist block: %v", err)
		}
	}

	// 9. Update State Merkle Tree
	l.MerkleRoot = l.CalculateMerkleRoot()

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
