package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"
)

type fragmentGenerator func(ctx *scenarioContext) error

type scenarioContext struct {
	t             *testing.T
	l             *Lattice
	keys          map[string]map[string]string // alias -> keypair
	baseTime      int64
	proposalHash  string
	secret        string
	secretHash    string
	nftHash       string
	marketBidHash string
}

func newScenarioContext(t *testing.T, l *Lattice, seed string) *scenarioContext {
	// We use descending keypairs by default to keep the tests hostile for replay order
	keypairs := deriveDescendingKeypairs(seed, 3)
	return &scenarioContext{
		t: t,
		l: l,
		keys: map[string]map[string]string{
			"proposer":  keypairs[0],
			"voter":     keypairs[1],
			"collector": keypairs[2],
		},
		baseTime: 1000000,
	}
}

func (c *scenarioContext) getKeys(alias string) map[string]string {
	k, ok := c.keys[alias]
	if !ok {
		c.t.Fatalf("unknown account alias: %s", alias)
	}
	return k
}

// Fragment Generators

func genProposerGenesis(ctx *scenarioContext) error {
	k := ctx.getKeys("proposer")
	block := makeGenesisBlock(k, 1000)
	block.Timestamp = ctx.baseTime - 120000
	signTestBlock(ctx.t, block, k["privateKey"])
	return ctx.l.ProcessBlock(block, false)
}

func genProposerSendsToVoter(ctx *scenarioContext) error {
	pk := ctx.getKeys("proposer")
	vk := ctx.getKeys("voter")
	ts := ctx.baseTime - 90000

	// Send
	prevP := ctx.l.Chains[pk["publicKey"]][len(ctx.l.Chains[pk["publicKey"]])-1]
	send := &Block{
		Type:      "send",
		Account:   pk["publicKey"],
		Previous:  &prevP.Hash,
		Balance:   ctx.l.GetBalance(pk["publicKey"], ts) - 200,
		Height:    prevP.Height + 1,
		Link:      vk["publicKey"],
		Spora:     validSpora(prevP.Hash),
		Timestamp: ts,
	}
	signTestBlock(ctx.t, send, pk["privateKey"])
	if err := ctx.l.ProcessBlock(send, false); err != nil {
		return err
	}

	// Open Voter
	open := &Block{
		Type:      "open",
		Account:   vk["publicKey"],
		Balance:   200,
		Height:    0,
		Link:      send.Hash,
		Spora:     validSporaForOpenAccount(vk["publicKey"]),
		Timestamp: ts + 1000,
	}
	signTestBlock(ctx.t, open, vk["privateKey"])
	return ctx.l.ProcessBlock(open, false)
}

func genProposerSendsToCollector(ctx *scenarioContext) error {
	pk := ctx.getKeys("proposer")
	ck := ctx.getKeys("collector")
	ts := ctx.baseTime - 60000

	// Send
	prevP := ctx.l.Chains[pk["publicKey"]][len(ctx.l.Chains[pk["publicKey"]])-1]
	send := &Block{
		Type:      "send",
		Account:   pk["publicKey"],
		Previous:  &prevP.Hash,
		Balance:   ctx.l.GetBalance(pk["publicKey"], ts) - 150,
		Height:    prevP.Height + 1,
		Link:      ck["publicKey"],
		Spora:     validSpora(prevP.Hash),
		Timestamp: ts,
	}
	signTestBlock(ctx.t, send, pk["privateKey"])
	if err := ctx.l.ProcessBlock(send, false); err != nil {
		return err
	}

	// Open Collector
	open := &Block{
		Type:      "open",
		Account:   ck["publicKey"],
		Balance:   150,
		Height:    0,
		Link:      send.Hash,
		Spora:     validSporaForOpenAccount(ck["publicKey"]),
		Timestamp: ts + 1000,
	}
	signTestBlock(ctx.t, open, ck["privateKey"])
	return ctx.l.ProcessBlock(open, false)
}

func genSameTimestampGovernanceCore(ctx *scenarioContext) error {
	pk := ctx.getKeys("proposer")
	vk := ctx.getKeys("voter")
	ts := ctx.baseTime

	// Proposal
	prevP := ctx.l.Chains[pk["publicKey"]][len(ctx.l.Chains[pk["publicKey"]])-1]
	prop := &Block{
		Type:      "proposal",
		Account:   pk["publicKey"],
		Previous:  &prevP.Hash,
		Balance:   ctx.l.GetBalance(pk["publicKey"], ts) - 10,
		Height:    prevP.Height + 1,
		Link:      "DAO_PROPOSAL",
		Spora:     validSpora(prevP.Hash),
		Payload: map[string]interface{}{
			"title":   "Fixture Driven Proposal",
			"endTime": time.UnixMilli(ts + 2000).Format(time.RFC3339),
		},
		Timestamp: ts,
	}
	signTestBlock(ctx.t, prop, pk["privateKey"])
	if err := ctx.l.ProcessBlock(prop, false); err != nil {
		return err
	}
	ctx.proposalHash = prop.Hash

	// Vote
	prevV := ctx.l.Chains[vk["publicKey"]][len(ctx.l.Chains[vk["publicKey"]])-1]
	vote := &Block{
		Type:      "vote",
		Account:   vk["publicKey"],
		Previous:  &prevV.Hash,
		Balance:   ctx.l.GetBalance(vk["publicKey"], ts),
		Height:    prevV.Height + 1,
		Link:      prop.Hash,
		Spora:     validSpora(prevV.Hash),
		Payload:   map[string]interface{}{"vote": "FOR"},
		Timestamp: ts,
	}
	signTestBlock(ctx.t, vote, vk["privateKey"])
	return ctx.l.ProcessBlock(vote, false)
}

func genSameTimestampHtlcCore(ctx *scenarioContext) error {
	pk := ctx.getKeys("proposer")
	ts := ctx.baseTime
	ctx.secret = "fixture-secret"
	ctx.secretHash = Hash(ctx.secret)

	// Lock
	prevP := ctx.l.Chains[pk["publicKey"]][len(ctx.l.Chains[pk["publicKey"]])-1]
	lock := &Block{
		Type:      "swap_lock",
		Account:   pk["publicKey"],
		Previous:  &prevP.Hash,
		Balance:   ctx.l.GetBalance(pk["publicKey"], ts) - 50,
		Height:    prevP.Height + 1,
		Link:      "HTLC_LOCK",
		Spora:     validSpora(prevP.Hash),
		Payload: map[string]interface{}{
			"secretHash": ctx.secretHash,
			"recipient":  pk["publicKey"],
		},
		Timestamp: ts,
	}
	signTestBlock(ctx.t, lock, pk["privateKey"])
	if err := ctx.l.ProcessBlock(lock, false); err != nil {
		return err
	}

	// Claim (Same timestamp for core tests)
	claim := &Block{
		Type:      "swap_claim",
		Account:   pk["publicKey"],
		Previous:  &lock.Hash,
		Balance:   ctx.l.GetBalance(pk["publicKey"], ts) + 50,
		Height:    lock.Height + 1,
		Link:      "HTLC_CLAIM",
		Spora:     validSpora(lock.Hash),
		Payload: map[string]interface{}{
			"secret":     ctx.secret,
			"secretHash": ctx.secretHash,
		},
		Timestamp: ts,
	}
	signTestBlock(ctx.t, claim, pk["privateKey"])
	return ctx.l.ProcessBlock(claim, false)
}

func genSameTimestampNftCore(ctx *scenarioContext) error {
	pk := ctx.getKeys("proposer")
	ck := ctx.getKeys("collector")
	ts := ctx.baseTime

	// Mint
	prevP := ctx.l.Chains[pk["publicKey"]][len(ctx.l.Chains[pk["publicKey"]])-1]
	mint := &Block{
		Type:      "mint_nft",
		Account:   pk["publicKey"],
		Previous:  &prevP.Hash,
		Balance:   ctx.l.GetBalance(pk["publicKey"], ts) - 50,
		Height:    prevP.Height + 1,
		Link:      "NFT_MINT",
		Spora:     validSpora(prevP.Hash),
		Payload: map[string]interface{}{
			"name":   "Fixture NFT",
			"magnet": "magnet:?xt=urn:btih:fixture-nft",
		},
		Timestamp: ts,
	}
	signTestBlock(ctx.t, mint, pk["privateKey"])
	if err := ctx.l.ProcessBlock(mint, false); err != nil {
		return err
	}
	ctx.nftHash = mint.Hash

	// Transfer
	transfer := &Block{
		Type:      "transfer_nft",
		Account:   pk["publicKey"],
		Previous:  &mint.Hash,
		Balance:   ctx.l.GetBalance(pk["publicKey"], ts) - 1,
		Height:    mint.Height + 1,
		Link:      mint.Hash,
		Spora:     validSpora(mint.Hash),
		Payload: map[string]interface{}{
			"recipient": ck["publicKey"],
		},
		Timestamp: ts,
	}
	signTestBlock(ctx.t, transfer, pk["privateKey"])
	if err := ctx.l.ProcessBlock(transfer, false); err != nil {
		return err
	}
	return nil
}

func genCollectorMarketBidCore(ctx *scenarioContext) error {
	pk := ctx.getKeys("proposer")
	ck := ctx.getKeys("collector")
	ts := ctx.baseTime

	// Bid
	prevC := ctx.l.Chains[ck["publicKey"]][len(ctx.l.Chains[ck["publicKey"]])-1]
	bid := &Block{
		Type:      "market_bid",
		Account:   ck["publicKey"],
		Previous:  &prevC.Hash,
		Balance:   ctx.l.GetBalance(ck["publicKey"], ts) - 20,
		Height:    prevC.Height + 1,
		Link:      "STORAGE_MARKET",
		Spora:     validSpora(prevC.Hash),
		Payload:   map[string]interface{}{"magnet": "magnet:?xt=urn:btih:fixture-bid"},
		Timestamp: ts,
	}
	signTestBlock(ctx.t, bid, ck["privateKey"])
	if err := ctx.l.ProcessBlock(bid, false); err != nil {
		return err
	}
	ctx.marketBidHash = bid.Hash

	// Accept (Same timestamp for core tests)
	prevP := ctx.l.Chains[pk["publicKey"]][len(ctx.l.Chains[pk["publicKey"]])-1]
	accept := &Block{
		Type:      "accept_bid",
		Account:   pk["publicKey"],
		Previous:  &prevP.Hash,
		Balance:   ctx.l.GetBalance(pk["publicKey"], ts) + 20,
		Height:    prevP.Height + 1,
		Link:      bid.Hash,
		Spora:     validSpora(prevP.Hash),
		Timestamp: ts,
	}
	signTestBlock(ctx.t, accept, pk["privateKey"])
	return ctx.l.ProcessBlock(accept, false)
}

func genCollectorVoteExtension(ctx *scenarioContext) error {
	ck := ctx.getKeys("collector")
	ts := ctx.baseTime
	if ctx.proposalHash == "" {
		return fmt.Errorf("collector-vote-extension requires an active proposalHash in context")
	}

	prevC := ctx.l.Chains[ck["publicKey"]][len(ctx.l.Chains[ck["publicKey"]])-1]
	vote := &Block{
		Type:      "vote",
		Account:   ck["publicKey"],
		Previous:  &prevC.Hash,
		Balance:   ctx.l.GetBalance(ck["publicKey"], ts),
		Height:    prevC.Height + 1,
		Link:      ctx.proposalHash,
		Spora:     validSpora(prevC.Hash),
		Payload:   map[string]interface{}{"vote": "FOR"},
		Timestamp: ts,
	}
	signTestBlock(ctx.t, vote, ck["privateKey"])
	return ctx.l.ProcessBlock(vote, false)
}

func genManifestAnchorCore(ctx *scenarioContext) error {
	pk := ctx.getKeys("proposer")
	ts := ctx.baseTime

	// Manifest
	prevP := ctx.l.Chains[pk["publicKey"]][len(ctx.l.Chains[pk["publicKey"]])-1]
	manifest := &Block{
		Type:      "publish_manifest",
		Account:   pk["publicKey"],
		Previous:  &prevP.Hash,
		Balance:   ctx.l.GetBalance(pk["publicKey"], ts),
		Height:    prevP.Height + 1,
		Link:      "FIXTURE_MANIFEST",
		Spora:     validSpora(prevP.Hash),
		Payload: map[string]interface{}{
			"manifestId":  "fixture-manifest",
			"locator":     "bobtorrent://manifest/fixture",
			"manifestUrl": "/manifests/fixture",
		},
		Timestamp: ts,
	}
	signTestBlock(ctx.t, manifest, pk["privateKey"])
	if err := ctx.l.ProcessBlock(manifest, false); err != nil {
		return err
	}

	// Data Anchor (Same timestamp for core tests)
	prevP2 := ctx.l.Chains[pk["publicKey"]][len(ctx.l.Chains[pk["publicKey"]])-1]
	anchor := &Block{
		Type:      "data_anchor",
		Account:   pk["publicKey"],
		Previous:  &prevP2.Hash,
		Balance:   ctx.l.GetBalance(pk["publicKey"], ts) - 1,
		Height:    prevP2.Height + 1,
		Link:      "DATA_ANCHOR",
		Spora:     validSpora(prevP2.Hash),
		Payload: map[string]interface{}{
			"magnet": "magnet:?xt=urn:btih:fixture-finalizer",
			"name":   "finalizer.bin",
		},
		Timestamp: ts,
	}
	signTestBlock(ctx.t, anchor, pk["privateKey"])
	return ctx.l.ProcessBlock(anchor, false)
}

func genDemurrageBalancePressure(ctx *scenarioContext) error {
	return nil
}

// Scenario Runner

func TestFixtureDrivenMirroredScenarios(t *testing.T) {
	scenarioCatalogPath := filepath.Clean(filepath.Join("..", "testing", "parity-scenarios.json"))
	scenarioData, err := os.ReadFile(scenarioCatalogPath)
	if err != nil {
		t.Fatalf("failed to read parity scenario catalog: %v", err)
	}

	var catalog struct {
		Scenarios []struct {
			ID        string   `json:"id"`
			Fragments []string `json:"fragments"`
		} `json:"scenarios"`
	}
	if err := json.Unmarshal(scenarioData, &catalog); err != nil {
		t.Fatalf("failed to parse parity scenario catalog: %v", err)
	}

	fragmentMap := map[string]fragmentGenerator{
		"proposer-genesis":               genProposerGenesis,
		"proposer-sends-to-voter":        genProposerSendsToVoter,
		"proposer-sends-to-collector":    genProposerSendsToCollector,
		"same-timestamp-governance-core": genSameTimestampGovernanceCore,
		"same-timestamp-htlc-core":       genSameTimestampHtlcCore,
		"same-timestamp-nft-core":        genSameTimestampNftCore,
		"collector-market-bid-core":      genCollectorMarketBidCore,
		"collector-vote-extension":       genCollectorVoteExtension,
		"manifest-anchor-core":           genManifestAnchorCore,
		"demurrage-balance-pressure":     genDemurrageBalancePressure,
	}

	for _, sc := range catalog.Scenarios {
		t.Run(sc.ID, func(t *testing.T) {
			dbPath := filepath.Join(t.TempDir(), fmt.Sprintf("fixture-%s.sqlite", sc.ID))
			l := NewLattice(NewDBManager(dbPath))
			ctx := newScenarioContext(t, l, fmt.Sprintf("fixture seed %s", sc.ID))

			for _, fragID := range sc.Fragments {
				gen, ok := fragmentMap[fragID]
				if !ok {
					t.Fatalf("unknown fragment: %s", fragID)
				}
				if err := gen(ctx); err != nil {
					t.Fatalf("fragment %s failed: %v", fragID, err)
				}
			}

			// Validate Replay Correctness via Cold Boot Recovery
			if err := l.db.Close(); err != nil {
				t.Fatalf("failed to close db: %v", err)
			}

			recovered := NewLattice(NewDBManager(dbPath))
			defer recovered.db.Close()

			// Check Chain Length alignment
			for acc, chain := range l.Chains {
				if len(recovered.Chains[acc]) != len(chain) {
					t.Errorf("recovered chain length mismatch for %s: expected %d, got %d", acc[:8], len(chain), len(recovered.Chains[acc]))
				}
			}

			// Check Merkle Root alignment
			if recovered.MerkleRoot != l.MerkleRoot {
				t.Errorf("recovered Merkle root mismatch: expected %s, got %s", l.MerkleRoot, recovered.MerkleRoot)
			}
		})
	}
}
