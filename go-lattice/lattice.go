package main

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"sync"
)

type PendingTx struct {
	Hash   string  `json:"hash"`
	Amount float64 `json:"amount"`
	Sender string  `json:"account"`
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
	Multisigs  map[string]interface{}
	StateHash  string
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
		Multisigs:  make(map[string]interface{}),
		StateHash:  "0000000000000000000000000000000000000000000000000000000000000000",
		DemurrageRate: 0.0001 / 60000,
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

	// 5. Commit In-Memory
	l.Chains[block.Account] = append(l.Chains[block.Account], block)
	l.Blocks[block.Hash] = block

	// 6. Type-Specific State Updates (Proposals, NFTs, etc)
	if block.Type == "mint_nft" {
		l.Nfts[block.Hash] = block.Payload
	} else if block.Type == "data_anchor" {
		l.Anchors[block.Hash] = block.Payload
	} else if block.Type == "multisig_create" {
		l.Multisigs[block.Hash] = block.Payload
	}

	// 7. Persist to Disk
	if !isRecovery {
		if err := l.db.SaveBlock(block); err != nil {
			return fmt.Errorf("failed to persist block: %v", err)
		}
	}

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
