package main

import (
	"crypto/ed25519"
	"math"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/mr-tron/base58"
)

func signTestBlock(t *testing.T, block *Block, privateKeyBase58 string) {
	t.Helper()
	block.Hash = block.CalculateHash()
	priv, err := base58.Decode(privateKeyBase58)
	if err != nil {
		t.Fatalf("failed to decode private key: %v", err)
	}
	block.Signature = base58.Encode(ed25519.Sign(ed25519.PrivateKey(priv), []byte(block.Hash)))
}

func makeGenesisBlock(keys map[string]string, balance float64) *Block {
	return &Block{
		Type:          "open",
		Account:       keys["publicKey"],
		Previous:      nil,
		Balance:       balance,
		StakedBalance: 0,
		Height:        0,
		Link:          "SYSTEM_GENESIS",
		Timestamp:     1,
	}
}

func validSpora(previousHash string) *SporaProof {
	challenge64, _ := strconv.ParseInt(previousHash[:8], 16, 64)
	challenge := int(challenge64)
	infoHash := "anchor-seed"
	return &SporaProof{
		InfoHash:  infoHash,
		Challenge: challenge,
		ChunkHash: Hash(infoHash + strconv.Itoa(challenge)),
	}
}

func validSporaForOpenAccount(account string) *SporaProof {
	baseHash := Hash(account)
	challenge64, _ := strconv.ParseInt(baseHash[:8], 16, 64)
	challenge := int(challenge64)
	infoHash := "anchor-seed"
	return &SporaProof{
		InfoHash:  infoHash,
		Challenge: challenge,
		ChunkHash: Hash(infoHash + strconv.Itoa(challenge)),
	}
}

func deriveDescendingKeypairs(seed string, count int) []map[string]string {
	keys := make([]map[string]string, count)
	for i := 0; i < count; i++ {
		keys[i] = DeriveKeypair(seed, i)
	}
	sort.Slice(keys, func(i, j int) bool {
		return keys[i]["publicKey"] > keys[j]["publicKey"]
	})
	return keys
}

func TestMarketBidExpiry(t *testing.T) {
	l := NewLattice(NewDBManager(":memory:"))
	keys := DeriveKeypair("bid-expiry-test", 0)

	// 1. Genesis
	genesis := makeGenesisBlock(keys, 1000)
	signTestBlock(t, genesis, keys["privateKey"])
	l.ProcessBlock(genesis, true)

	// 2. Bid with short expiry
	base := time.Now().UnixMilli()
	bid := &Block{
		Type:     "market_bid",
		Account:  keys["publicKey"],
		Previous: &genesis.Hash,
		Balance:  l.GetBalance(keys["publicKey"], base) - 50, // Pay 50 BOB
		Height:   1,
		Link:     "STORAGE_MARKET",
		Spora:    validSpora(genesis.Hash),
		Payload: map[string]interface{}{
			"magnet": "m",
			"expiry": float64(base + 1000), // Expire in 1s
		},
		Timestamp: base,
	}
	signTestBlock(t, bid, keys["privateKey"])
	if err := l.ProcessBlock(bid, true); err != nil {
		t.Fatalf("failed to process bid: %v", err)
	}

	if l.MarketBids[bid.Hash] == nil {
		t.Fatalf("expected MarketBids[%s] to be set", bid.Hash)
	}
	if l.MarketBids[bid.Hash].(map[string]interface{})["status"] != "OPEN" {
		t.Fatalf("expected bid to be OPEN initially")
	}

	// 3. Process another block after expiry
	finalTs := base + 5000
	finalizer := &Block{
		Type:      "achievement_unlock",
		Account:   keys["publicKey"],
		Previous:  &bid.Hash,
		Balance:   l.GetBalance(keys["publicKey"], finalTs),
		Height:    2,
		Link:      "FINISH",
		Spora:     validSpora(bid.Hash),
		Timestamp: finalTs,
	}
	signTestBlock(t, finalizer, keys["privateKey"])
	l.ProcessBlock(finalizer, true)

	if l.MarketBids[bid.Hash].(map[string]interface{})["status"] != "EXPIRED" {
		t.Fatalf("expected bid to be EXPIRED, got %v", l.MarketBids[bid.Hash].(map[string]interface{})["status"])
	}
}

func TestSlashReputation(t *testing.T) {
	l := NewLattice(NewDBManager(":memory:"))
	target := "bad-node-pubkey"

	// 1. Initial trust
	if l.GetTrustScore(target) != 100.0 {
		t.Fatalf("expected initial trust 100")
	}

	// 2. Slash via governance
	l.Proposals["slash-1"] = map[string]interface{}{
		"id":           "slash-1",
		"status":       "Active",
		"action":       "SLASH_REPUTATION",
		"target":       target,
		"amount":       25.0,
		"endTime":      time.Now().Add(-time.Hour).Format(time.RFC3339),
		"votesFor":     10.0,
		"votesAgainst": 1.0,
	}
	l.refreshProposalStatusesAt(time.Now())

	if l.GetTrustScore(target) != 75.0 {
		t.Fatalf("expected trust 75 after slash, got %v", l.GetTrustScore(target))
	}
}

func TestVerifyIdentity(t *testing.T) {
	l := NewLattice(NewDBManager(":memory:"))
	keys := DeriveKeypair("identity-test", 0)

	open := &Block{
		Type:          "open",
		Account:       keys["publicKey"],
		Previous:      nil,
		Balance:       100,
		StakedBalance: 0,
		Height:        0,
		Link:          "SYSTEM_GENESIS",
		Timestamp:     500,
	}
	signTestBlock(t, open, keys["privateKey"])
	l.ProcessBlock(open, true)

	block := &Block{
		Type:     "verify_identity",
		Account:  keys["publicKey"],
		Previous: &open.Hash,
		Balance:  100,
		Height:   1,
		Spora:    validSpora(open.Hash),
		Payload: map[string]interface{}{
			"provider": "github",
			"username": "bob-builder",
		},
		Timestamp: 1000,
	}
	signTestBlock(t, block, keys["privateKey"])
	if err := l.ProcessBlock(block, true); err != nil {
		t.Fatalf("failed to process identity block: %v", err)
	}

	idMap := l.Identities[keys["publicKey"]]
	if idMap == nil || idMap["github"] != "bob-builder" {
		t.Fatalf("expected identity mapping, got %v", idMap)
	}
}

func TestTrustWeightedGovernance(t *testing.T) {
	l := NewLattice(NewDBManager(":memory:"))
	keys := DeriveKeypair("trust-vote-test", 0)

	// 1. Slash to 50% trust
	l.TrustScores[keys["publicKey"]] = 50.0

	// 2. Open
	open := &Block{
		Type:          "open",
		Account:       keys["publicKey"],
		Previous:      nil,
		Balance:       1000,
		StakedBalance: 0,
		Height:        0,
		Link:          "SYSTEM_GENESIS",
		Timestamp:     500,
	}
	signTestBlock(t, open, keys["privateKey"])
	l.ProcessBlock(open, true)

	// 3. Propose something
	prop := &Block{
		Type:     "proposal",
		Account:  keys["publicKey"],
		Previous: &open.Hash,
		Balance:  990, // Pay 10 fee
		Height:   1,
		Spora:    validSpora(open.Hash),
		Payload: map[string]interface{}{
			"title":   "Test",
			"action":  "UPDATE_DEMURRAGE",
			"rate":    0.0002,
			"endTime": time.Now().Add(time.Hour).Format(time.RFC3339),
		},
		Timestamp: 1000,
	}
	signTestBlock(t, prop, keys["privateKey"])
	if err := l.ProcessBlock(prop, true); err != nil {
		t.Fatalf("failed to process prop: %v", err)
	}

	// 4. Vote FOR
	vote := &Block{
		Type:     "vote",
		Account:  keys["publicKey"],
		Previous: &prop.Hash,
		Balance:  l.GetBalance(keys["publicKey"], 2000),
		Link:     prop.Hash,
		Height:   2,
		Spora:    validSpora(prop.Hash),
		Payload:  map[string]interface{}{"vote": "FOR"},
		Timestamp: 2000,
	}
	signTestBlock(t, vote, keys["privateKey"])
	if err := l.ProcessBlock(vote, true); err != nil {
		t.Fatalf("failed to process vote: %v", err)
	}

	// power = sqrt(990) * 0.5 = 31.464... * 0.5 = 15.732...
	p := l.Proposals[prop.Hash].(map[string]interface{})
	if math.Abs(p["votesFor"].(float64)-15.732) > 0.01 {
		t.Fatalf("expected trust-weighted vote power ~15.732, got %v", p["votesFor"])
	}
}

func TestAutomatedSlashing(t *testing.T) {
	l := NewLattice(NewDBManager(":memory:"))
	bidder := DeriveKeypair("bidder", 0)
	worker := DeriveKeypair("worker", 0)

	// 1. Setup bidder and worker
	genesis := makeGenesisBlock(bidder, 1000)
	signTestBlock(t, genesis, bidder["privateKey"])
	l.ProcessBlock(genesis, true)

	// 1. Setup bidder and worker
	send := &Block{
		Type:     "send",
		Account:  bidder["publicKey"],
		Previous: &genesis.Hash,
		Balance:  900,
		Height:   1,
		Link:     worker["publicKey"],
		Spora:    validSpora(genesis.Hash),
		Timestamp: 200,
	}
	signTestBlock(t, send, bidder["privateKey"])
	l.ProcessBlock(send, true)

	receive := &Block{
		Type:      "open",
		Account:   worker["publicKey"],
		Previous:  nil,
		Balance:   100,
		Height:    0,
		Link:      send.Hash,
		Spora:     validSporaForOpenAccount(worker["publicKey"]),
		Timestamp: 300,
	}
	signTestBlock(t, receive, worker["privateKey"])
	if err := l.ProcessBlock(receive, true); err != nil {
		t.Fatalf("failed to process receive: %v", err)
	}

	// 2. Bid
	base := int64(1000000)
	bid := &Block{
		Type:     "market_bid",
		Account:  bidder["publicKey"],
		Previous: &send.Hash,
		Balance:  l.GetBalance(bidder["publicKey"], base) - 50,
		Height:   2,
		Link:     "STORAGE_MARKET",
		Spora:    validSpora(send.Hash),
		Payload: map[string]interface{}{
			"magnet": "m1",
			"expiry": float64(base + 10000000),
		},
		Timestamp: base,
	}
	signTestBlock(t, bid, bidder["privateKey"])
	l.ProcessBlock(bid, true)

	// 3. Accept Bid
	accept := &Block{
		Type:     "accept_bid",
		Account:  worker["publicKey"],
		Previous: &receive.Hash,
		Balance:  l.GetBalance(worker["publicKey"], base+1000) + 50,
		Height:   1,
		Link:     bid.Hash,
		Spora:    validSpora(receive.Hash),
		Timestamp: base + 1000,
	}
	signTestBlock(t, accept, worker["privateKey"])
	if err := l.ProcessBlock(accept, true); err != nil {
		t.Fatalf("failed to process accept: %v", err)
	}

	if l.GetTrustScore(worker["publicKey"]) != 100.0 {
		t.Fatalf("expected initial trust 100")
	}

	// 4. Advance time 2 hours (audit failure)
	finalizer := &Block{
		Type:      "achievement_unlock",
		Account:   bidder["publicKey"],
		Previous:  &bid.Hash,
		Balance:   l.GetBalance(bidder["publicKey"], base+8000000),
		Height:    3,
		Link:      "FAIL",
		Spora:     validSpora(bid.Hash),
		Timestamp: base + 8000000,
	}
	signTestBlock(t, finalizer, bidder["privateKey"])
	l.ProcessBlock(finalizer, true)

	if l.GetTrustScore(worker["publicKey"]) != 90.0 {
		t.Fatalf("expected trust slashed to 90, got %v", l.GetTrustScore(worker["publicKey"]))
	}
}

func TestTrustRecovery(t *testing.T) {
	l := NewLattice(NewDBManager(":memory:"))
	keys := DeriveKeypair("recovery-test", 0)

	// 1. Setup account with slashed trust
	genesis := makeGenesisBlock(keys, 1000)
	signTestBlock(t, genesis, keys["privateKey"])
	if err := l.ProcessBlock(genesis, true); err != nil {
		t.Fatalf("failed to process genesis: %v", err)
	}
	l.TrustScores[keys["publicKey"]] = 50.0

	// 2. Restore trust by burning 100 BOB (10% recovery)
	restore := &Block{
		Type:      "restore_trust",
		Account:   keys["publicKey"],
		Previous:  &genesis.Hash,
		Balance:   l.GetBalance(keys["publicKey"], 1000) - 100,
		Height:    1,
		Link:      "SYSTEM_TREASURY",
		Spora:     validSpora(genesis.Hash),
		Timestamp: 1000,
	}
	signTestBlock(t, restore, keys["privateKey"])
	if err := l.ProcessBlock(restore, true); err != nil {
		t.Fatalf("failed to process restore: %v", err)
	}

	if l.GetTrustScore(keys["publicKey"]) != 60.0 {
		t.Fatalf("expected trust 60, got %v", l.GetTrustScore(keys["publicKey"]))
	}
}

func TestDeterministicMultisigAddressIsStable(t *testing.T) {
	participants := []string{"alice", "bob", "carol"}
	addr1 := deterministicMultisigAddress(participants)
	addr2 := deterministicMultisigAddress(participants)

	if addr1 != addr2 {
		t.Fatalf("expected deterministic multisig address, got %q and %q", addr1, addr2)
	}
	if len(addr1) != 44 {
		t.Fatalf("expected 44-char multisig address, got %d", len(addr1))
	}
}

func TestGetStateSnapshotIncludesParityMaps(t *testing.T) {
	l := NewLattice(NewDBManager(":memory:"))
	l.Swaps["secret-hash"] = &HTLCSwap{Sender: "alice", Recipient: "bob", Amount: 5, Expiry: 123456, Status: "LOCKED"}
	l.Anchors["anchor"] = map[string]interface{}{"id": "anchor", "owner": "alice", "type": "publish_manifest"}
	l.Nfts["nft"] = map[string]interface{}{"id": "nft", "owner": "alice"}

	snapshot := l.GetStateSnapshot()

	if snapshot["swaps"] == nil {
		t.Fatalf("expected swaps in snapshot")
	}
	if snapshot["anchors"] == nil {
		t.Fatalf("expected anchors in snapshot")
	}
	if snapshot["nfts"] == nil {
		t.Fatalf("expected nfts in snapshot")
	}
	if snapshot["merkleRoot"] == nil {
		t.Fatalf("expected merkleRoot in snapshot")
	}
}

func TestSecondSystemGenesisBootstrapIsRejected(t *testing.T) {
	keysA := DeriveKeypair("semantic parity genesis a", 0)
	keysB := DeriveKeypair("semantic parity genesis b", 0)
	l := NewLattice(NewDBManager(":memory:"))

	genesisA := &Block{
		Type:          "open",
		Account:       keysA["publicKey"],
		Previous:      nil,
		Balance:       1000,
		StakedBalance: 0,
		Height:        0,
		Link:          "SYSTEM_GENESIS",
		Timestamp:     1,
	}
	signTestBlock(t, genesisA, keysA["privateKey"])
	if err := l.ProcessBlock(genesisA, true); err != nil {
		t.Fatalf("expected first genesis block to succeed, got %v", err)
	}

	genesisB := &Block{
		Type:          "open",
		Account:       keysB["publicKey"],
		Previous:      nil,
		Balance:       1000,
		StakedBalance: 0,
		Height:        0,
		Link:          "SYSTEM_GENESIS",
		Timestamp:     2,
	}
	signTestBlock(t, genesisB, keysB["privateKey"])
	if err := l.ProcessBlock(genesisB, true); err == nil {
		t.Fatalf("expected second system genesis bootstrap to be rejected")
	}
}

func TestAcceptBidRequiresExactBalanceIncrementAndClosesBid(t *testing.T) {
	keys := DeriveKeypair("semantic parity accept bid", 0)
	l := NewLattice(NewDBManager(":memory:"))

	genesis := makeGenesisBlock(keys, 1000)
	signTestBlock(t, genesis, keys["privateKey"])
	if err := l.ProcessBlock(genesis, true); err != nil {
		t.Fatalf("expected genesis block to succeed, got %v", err)
	}

	previousBid := genesis.Hash
	bidBlock := &Block{
		Type:          "market_bid",
		Account:       keys["publicKey"],
		Previous:      &previousBid,
		Balance:       900,
		StakedBalance: 0,
		Height:        1,
		Link:          "STORAGE_MARKET",
		Spora:         validSpora(genesis.Hash),
		Payload:       map[string]interface{}{"magnet": "magnet:?xt=urn:btih:test"},
		Timestamp:     2,
	}
	signTestBlock(t, bidBlock, keys["privateKey"])
	if err := l.ProcessBlock(bidBlock, true); err != nil {
		t.Fatalf("expected market bid to succeed, got %v", err)
	}

	previousAccept := bidBlock.Hash
	acceptBlock := &Block{
		Type:          "accept_bid",
		Account:       keys["publicKey"],
		Previous:      &previousAccept,
		Balance:       1000,
		StakedBalance: 0,
		Height:        2,
		Link:          bidBlock.Hash,
		Spora:         validSpora(bidBlock.Hash),
		Timestamp:     3,
	}
	signTestBlock(t, acceptBlock, keys["privateKey"])
	if err := l.ProcessBlock(acceptBlock, true); err != nil {
		t.Fatalf("expected accept_bid to succeed, got %v", err)
	}

	bid := l.MarketBids[bidBlock.Hash].(map[string]interface{})
	if bid["status"] != "ACCEPTED" {
		t.Fatalf("expected bid status ACCEPTED, got %v", bid["status"])
	}
	if bid["acceptedBy"] != keys["publicKey"] {
		t.Fatalf("expected acceptedBy %q, got %v", keys["publicKey"], bid["acceptedBy"])
	}
}

func TestAcceptBidCannotBeClaimedTwice(t *testing.T) {
	keys := DeriveKeypair("semantic parity accept twice", 0)
	l := NewLattice(NewDBManager(":memory:"))

	genesis := makeGenesisBlock(keys, 1000)
	signTestBlock(t, genesis, keys["privateKey"])
	if err := l.ProcessBlock(genesis, true); err != nil {
		t.Fatalf("expected genesis block to succeed, got %v", err)
	}

	prev := genesis.Hash
	bidBlock := &Block{
		Type:          "market_bid",
		Account:       keys["publicKey"],
		Previous:      &prev,
		Balance:       950,
		StakedBalance: 0,
		Height:        1,
		Link:          "STORAGE_MARKET",
		Spora:         validSpora(genesis.Hash),
		Payload:       map[string]interface{}{"magnet": "magnet:?xt=urn:btih:double"},
		Timestamp:     2,
	}
	signTestBlock(t, bidBlock, keys["privateKey"])
	if err := l.ProcessBlock(bidBlock, true); err != nil {
		t.Fatalf("expected market bid to succeed, got %v", err)
	}

	acceptOnePrev := bidBlock.Hash
	acceptOne := &Block{
		Type:          "accept_bid",
		Account:       keys["publicKey"],
		Previous:      &acceptOnePrev,
		Balance:       1000,
		StakedBalance: 0,
		Height:        2,
		Link:          bidBlock.Hash,
		Spora:         validSpora(bidBlock.Hash),
		Timestamp:     3,
	}
	signTestBlock(t, acceptOne, keys["privateKey"])
	if err := l.ProcessBlock(acceptOne, true); err != nil {
		t.Fatalf("expected first accept_bid to succeed, got %v", err)
	}

	acceptTwoPrev := acceptOne.Hash
	acceptTwo := &Block{
		Type:          "accept_bid",
		Account:       keys["publicKey"],
		Previous:      &acceptTwoPrev,
		Balance:       1050,
		StakedBalance: 0,
		Height:        3,
		Link:          bidBlock.Hash,
		Spora:         validSpora(acceptOne.Hash),
		Timestamp:     4,
	}
	signTestBlock(t, acceptTwo, keys["privateKey"])
	if err := l.ProcessBlock(acceptTwo, true); err == nil || !strings.Contains(err.Error(), "already accepted or closed") {
		t.Fatalf("expected second accept_bid to fail as already accepted, got %v", err)
	}
}

func TestDataAnchorRequiresPositiveFeeAndIndexesAnchor(t *testing.T) {
	keys := DeriveKeypair("semantic parity data anchor", 0)
	l := NewLattice(NewDBManager(":memory:"))

	genesis := makeGenesisBlock(keys, 1000)
	signTestBlock(t, genesis, keys["privateKey"])
	if err := l.ProcessBlock(genesis, true); err != nil {
		t.Fatalf("expected genesis block to succeed, got %v", err)
	}

	prev := genesis.Hash
	invalidAnchor := &Block{
		Type:          "data_anchor",
		Account:       keys["publicKey"],
		Previous:      &prev,
		Balance:       1000,
		StakedBalance: 0,
		Height:        1,
		Link:          "DATA_ANCHOR",
		Spora:         validSpora(genesis.Hash),
		Payload:       map[string]interface{}{"name": "zero-fee.bin", "magnet": "magnet:?xt=urn:btih:anchor0", "size": 42},
		Timestamp:     2,
	}
	signTestBlock(t, invalidAnchor, keys["privateKey"])
	if err := l.ProcessBlock(invalidAnchor, true); err == nil || !strings.Contains(err.Error(), "data anchor must pay storage fee") {
		t.Fatalf("expected zero-fee data anchor to fail, got %v", err)
	}

	validAnchor := &Block{
		Type:          "data_anchor",
		Account:       keys["publicKey"],
		Previous:      &prev,
		Balance:       990,
		StakedBalance: 0,
		Height:        1,
		Link:          "DATA_ANCHOR",
		Spora:         validSpora(genesis.Hash),
		Payload:       map[string]interface{}{"name": "paid-anchor.bin", "magnet": "magnet:?xt=urn:btih:anchor1", "size": 42},
		Timestamp:     3,
	}
	signTestBlock(t, validAnchor, keys["privateKey"])
	if err := l.ProcessBlock(validAnchor, true); err != nil {
		t.Fatalf("expected paid data anchor to succeed, got %v", err)
	}

	anchor, ok := l.Anchors[validAnchor.Hash]
	if !ok {
		t.Fatalf("expected anchor to be indexed")
	}
	anchorMap := anchor.(map[string]interface{})
	if anchorMap["owner"] != keys["publicKey"] {
		t.Fatalf("expected anchor owner %q, got %v", keys["publicKey"], anchorMap["owner"])
	}
	if anchorMap["name"] != "paid-anchor.bin" {
		t.Fatalf("expected anchor name to be preserved, got %v", anchorMap["name"])
	}
}

func TestProcessBlockRejectsInvalidTypeAfterGenesis(t *testing.T) {
	keys := DeriveKeypair("semantic parity invalid type", 0)
	l := NewLattice(NewDBManager(":memory:"))

	genesis := &Block{
		Type:          "open",
		Account:       keys["publicKey"],
		Previous:      nil,
		Balance:       1000,
		StakedBalance: 0,
		Height:        0,
		Link:          "SYSTEM_GENESIS",
		Timestamp:     1,
	}
	signTestBlock(t, genesis, keys["privateKey"])
	if err := l.ProcessBlock(genesis, true); err != nil {
		t.Fatalf("expected genesis block to succeed, got %v", err)
	}

	previous := genesis.Hash
	invalid := &Block{
		Type:          "totally_invalid",
		Account:       keys["publicKey"],
		Previous:      &previous,
		Balance:       1000,
		StakedBalance: 0,
		Height:        1,
		Link:          "X",
		Spora:         validSpora(genesis.Hash),
		Timestamp:     2,
	}
	signTestBlock(t, invalid, keys["privateKey"])

	err := l.ProcessBlock(invalid, true)
	if err == nil || !strings.Contains(err.Error(), "invalid block type") {
		t.Fatalf("expected invalid block type error, got %v", err)
	}
}

func TestProcessBlockNormalModeDoesNotDeadlockOnMerkleUpdate(t *testing.T) {
	keys := DeriveKeypair("semantic parity normal mode", 0)
	l := NewLattice(NewDBManager(":memory:"))

	genesis := &Block{
		Type:          "open",
		Account:       keys["publicKey"],
		Previous:      nil,
		Balance:       1000,
		StakedBalance: 0,
		Height:        0,
		Link:          "SYSTEM_GENESIS",
		Timestamp:     1,
	}
	signTestBlock(t, genesis, keys["privateKey"])

	done := make(chan error, 1)
	go func() {
		done <- l.ProcessBlock(genesis, false)
	}()

	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("expected normal-mode genesis processing to succeed, got %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatalf("ProcessBlock appears to have deadlocked during merkle update")
	}
}

func TestProcessBlockRollsBackStateWhenPersistenceFails(t *testing.T) {
	keys := DeriveKeypair("semantic parity rollback", 0)
	l := NewLattice(NewDBManager(":memory:"))
	if err := l.db.db.Close(); err != nil {
		t.Fatalf("failed to close test db: %v", err)
	}

	genesis := &Block{
		Type:          "open",
		Account:       keys["publicKey"],
		Previous:      nil,
		Balance:       1000,
		StakedBalance: 0,
		Height:        0,
		Link:          "SYSTEM_GENESIS",
		Timestamp:     1,
	}
	signTestBlock(t, genesis, keys["privateKey"])

	err := l.ProcessBlock(genesis, false)
	if err == nil || !strings.Contains(err.Error(), "failed to persist block") {
		t.Fatalf("expected persistence failure, got %v", err)
	}
	if len(l.Chains) != 0 {
		t.Fatalf("expected chains to roll back after persistence failure, got %d", len(l.Chains))
	}
	if len(l.Blocks) != 0 {
		t.Fatalf("expected blocks to roll back after persistence failure, got %d", len(l.Blocks))
	}
	if l.StateHash != strings.Repeat("0", 64) {
		t.Fatalf("expected zeroed state hash after rollback, got %s", l.StateHash)
	}
	if l.MerkleRoot != strings.Repeat("0", 64) {
		t.Fatalf("expected zeroed merkle root after rollback, got %s", l.MerkleRoot)
	}
}

func TestRefreshProposalStatusesFinalizesExpiredProposal(t *testing.T) {
	l := NewLattice(NewDBManager(":memory:"))
	l.Proposals["proposal-1"] = map[string]interface{}{
		"id":           "proposal-1",
		"status":       "Active",
		"votesFor":     4.0,
		"votesAgainst": 1.0,
		"endTime":      time.Now().Add(-time.Hour).Format(time.RFC3339),
	}
	l.refreshProposalStatusesAt(time.Now())
	proposal := l.Proposals["proposal-1"].(map[string]interface{})
	if proposal["status"] != "Passed" {
		t.Fatalf("expected expired proposal to finalize as Passed, got %v", proposal["status"])
	}
}

func TestSwapLockAndClaimLifecycle(t *testing.T) {
	keys := DeriveKeypair("semantic parity swap lifecycle", 0)
	l := NewLattice(NewDBManager(":memory:"))

	genesis := makeGenesisBlock(keys, 1000)
	signTestBlock(t, genesis, keys["privateKey"])
	if err := l.ProcessBlock(genesis, true); err != nil {
		t.Fatalf("expected genesis block to succeed, got %v", err)
	}

	secret := "ultra-secret"
	secretHash := Hash(secret)
	prev := genesis.Hash
	lockBlock := &Block{
		Type:          "swap_lock",
		Account:       keys["publicKey"],
		Previous:      &prev,
		Balance:       925,
		StakedBalance: 0,
		Height:        1,
		Link:          "HTLC_LOCK",
		Spora:         validSpora(genesis.Hash),
		Payload: map[string]interface{}{
			"secretHash": secretHash,
			"recipient":  "recipient-pubkey",
			"expiry":     float64(time.Now().Add(time.Hour).UnixMilli()),
		},
		Timestamp: 2,
	}
	signTestBlock(t, lockBlock, keys["privateKey"])
	if err := l.ProcessBlock(lockBlock, true); err != nil {
		t.Fatalf("expected swap_lock to succeed, got %v", err)
	}

	swap := l.Swaps[secretHash]
	if swap == nil || swap.Status != "LOCKED" {
		t.Fatalf("expected locked swap state, got %+v", swap)
	}
	if diff := math.Abs(swap.Amount - 75); diff > 0.001 {
		t.Fatalf("expected locked amount near 75, got %v", swap.Amount)
	}

	prevClaim := lockBlock.Hash
	claimBlock := &Block{
		Type:          "swap_claim",
		Account:       keys["publicKey"],
		Previous:      &prevClaim,
		Balance:       1000,
		StakedBalance: 0,
		Height:        2,
		Link:          "HTLC_CLAIM",
		Spora:         validSpora(lockBlock.Hash),
		Payload: map[string]interface{}{
			"secret":     secret,
			"secretHash": secretHash,
		},
		Timestamp: 3,
	}
	signTestBlock(t, claimBlock, keys["privateKey"])
	if err := l.ProcessBlock(claimBlock, true); err != nil {
		t.Fatalf("expected swap_claim to succeed, got %v", err)
	}

	if swap.Status != "CLAIMED" {
		t.Fatalf("expected claimed swap state, got %v", swap.Status)
	}
	if swap.Claimer != keys["publicKey"] {
		t.Fatalf("expected claimer %q, got %v", keys["publicKey"], swap.Claimer)
	}
}

func TestTransferNFTEnforcesOwnershipAndUpdatesOwner(t *testing.T) {
	ownerKeys := DeriveKeypair("semantic parity nft owner", 0)
	otherKeys := DeriveKeypair("semantic parity nft other", 0)
	recipientKeys := DeriveKeypair("semantic parity nft recipient", 0)

	ownerLattice := NewLattice(NewDBManager(":memory:"))
	ownerGenesis := makeGenesisBlock(ownerKeys, 1000)
	signTestBlock(t, ownerGenesis, ownerKeys["privateKey"])
	if err := ownerLattice.ProcessBlock(ownerGenesis, true); err != nil {
		t.Fatalf("expected owner genesis to succeed, got %v", err)
	}

	prevMint := ownerGenesis.Hash
	mintBlock := &Block{
		Type:          "mint_nft",
		Account:       ownerKeys["publicKey"],
		Previous:      &prevMint,
		Balance:       950,
		StakedBalance: 0,
		Height:        1,
		Link:          "NFT_MINT",
		Spora:         validSpora(ownerGenesis.Hash),
		Payload: map[string]interface{}{
			"name":        "Artifact",
			"magnet":      "magnet:?xt=urn:btih:nft1",
			"description": "Rare",
		},
		Timestamp: 2,
	}
	signTestBlock(t, mintBlock, ownerKeys["privateKey"])
	if err := ownerLattice.ProcessBlock(mintBlock, true); err != nil {
		t.Fatalf("expected mint_nft to succeed, got %v", err)
	}

	otherLattice := NewLattice(NewDBManager(":memory:"))
	otherGenesis := makeGenesisBlock(otherKeys, 1000)
	signTestBlock(t, otherGenesis, otherKeys["privateKey"])
	if err := otherLattice.ProcessBlock(otherGenesis, true); err != nil {
		t.Fatalf("expected other genesis to succeed, got %v", err)
	}
	otherLattice.Nfts[mintBlock.Hash] = map[string]interface{}{
		"id":    mintBlock.Hash,
		"owner": ownerKeys["publicKey"],
		"name":  "Artifact",
	}

	otherPrev := otherGenesis.Hash
	invalidTransfer := &Block{
		Type:          "transfer_nft",
		Account:       otherKeys["publicKey"],
		Previous:      &otherPrev,
		Balance:       999,
		StakedBalance: 0,
		Height:        1,
		Link:          mintBlock.Hash,
		Spora:         validSpora(otherGenesis.Hash),
		Payload: map[string]interface{}{
			"recipient": recipientKeys["publicKey"],
		},
		Timestamp: 2,
	}
	signTestBlock(t, invalidTransfer, otherKeys["privateKey"])
	if err := otherLattice.ProcessBlock(invalidTransfer, true); err == nil || !strings.Contains(err.Error(), "do not own this NFT") {
		t.Fatalf("expected non-owner transfer to fail, got %v", err)
	}

	ownerPrev := mintBlock.Hash
	validTransfer := &Block{
		Type:          "transfer_nft",
		Account:       ownerKeys["publicKey"],
		Previous:      &ownerPrev,
		Balance:       949,
		StakedBalance: 0,
		Height:        2,
		Link:          mintBlock.Hash,
		Spora:         validSpora(mintBlock.Hash),
		Payload: map[string]interface{}{
			"recipient": recipientKeys["publicKey"],
		},
		Timestamp: 3,
	}
	signTestBlock(t, validTransfer, ownerKeys["privateKey"])
	if err := ownerLattice.ProcessBlock(validTransfer, true); err != nil {
		t.Fatalf("expected owner transfer_nft to succeed, got %v", err)
	}

	nft := ownerLattice.Nfts[mintBlock.Hash].(map[string]interface{})
	if nft["owner"] != recipientKeys["publicKey"] {
		t.Fatalf("expected NFT owner %q, got %v", recipientKeys["publicKey"], nft["owner"])
	}
}

func TestAuditStateRebuildsPublishedManifestAnchorState(t *testing.T) {
	keys := DeriveKeypair("semantic parity manifest replay", 0)
	l := NewLattice(NewDBManager(":memory:"))

	genesis := makeGenesisBlock(keys, 1000)
	signTestBlock(t, genesis, keys["privateKey"])
	if err := l.ProcessBlock(genesis, true); err != nil {
		t.Fatalf("expected genesis block to succeed, got %v", err)
	}

	prev := genesis.Hash
	manifest := &Block{
		Type:          "publish_manifest",
		Account:       keys["publicKey"],
		Previous:      &prev,
		Balance:       1000,
		StakedBalance: 0,
		Height:        1,
		Link:          "manifest-2",
		Spora:         validSpora(genesis.Hash),
		Payload: map[string]interface{}{
			"manifestId":  "manifest-2",
			"locator":     "bobtorrent://manifest/manifest-2",
			"manifestUrl": "http://localhost:8000/manifests/manifest-2",
			"name":        "manifested.bin",
			"size":        128,
		},
		Timestamp: 2,
	}
	signTestBlock(t, manifest, keys["privateKey"])
	if err := l.ProcessBlock(manifest, true); err != nil {
		t.Fatalf("expected publish_manifest to succeed, got %v", err)
	}

	l.Anchors = map[string]interface{}{}
	if err := l.AuditState(); err != nil {
		t.Fatalf("expected audit to succeed, got %v", err)
	}

	anchor, ok := l.Anchors[manifest.Hash]
	if !ok {
		t.Fatalf("expected publish_manifest anchor to be rebuilt")
	}
	anchorMap := anchor.(map[string]interface{})
	if anchorMap["type"] != "publish_manifest" {
		t.Fatalf("expected rebuilt anchor type publish_manifest, got %v", anchorMap["type"])
	}
	if anchorMap["locator"] != "bobtorrent://manifest/manifest-2" {
		t.Fatalf("expected rebuilt locator to survive replay, got %v", anchorMap["locator"])
	}
}

func TestAuditStateRebuildsMixedHistoricalLedgerState(t *testing.T) {
	keysA := DeriveKeypair("semantic parity mixed history A", 0)
	keysB := DeriveKeypair("semantic parity mixed history B", 0)
	l := NewLattice(NewDBManager(":memory:"))

	genesisA := makeGenesisBlock(keysA, 1000)
	signTestBlock(t, genesisA, keysA["privateKey"])
	if err := l.ProcessBlock(genesisA, true); err != nil {
		t.Fatalf("expected genesisA to succeed, got %v", err)
	}

	prevSend := genesisA.Hash
	sendAB := &Block{
		Type:          "send",
		Account:       keysA["publicKey"],
		Previous:      &prevSend,
		Balance:       800,
		StakedBalance: 0,
		Height:        1,
		Link:          keysB["publicKey"],
		Spora:         validSpora(genesisA.Hash),
		Timestamp:     2,
	}
	signTestBlock(t, sendAB, keysA["privateKey"])
	if err := l.ProcessBlock(sendAB, true); err != nil {
		t.Fatalf("expected sendAB to succeed, got %v", err)
	}

	openB := &Block{
		Type:          "open",
		Account:       keysB["publicKey"],
		Previous:      nil,
		Balance:       200,
		StakedBalance: 0,
		Height:        0,
		Link:          sendAB.Hash,
		Spora:         validSporaForOpenAccount(keysB["publicKey"]),
		Timestamp:     3,
	}
	signTestBlock(t, openB, keysB["privateKey"])
	if err := l.ProcessBlock(openB, true); err != nil {
		t.Fatalf("expected openB to succeed, got %v", err)
	}

	prevAnchor := sendAB.Hash
	anchorA := &Block{
		Type:          "data_anchor",
		Account:       keysA["publicKey"],
		Previous:      &prevAnchor,
		Balance:       790,
		StakedBalance: 0,
		Height:        2,
		Link:          "DATA_ANCHOR",
		Spora:         validSpora(sendAB.Hash),
		Payload:       map[string]interface{}{"name": "mixed-anchor.bin", "magnet": "magnet:?xt=urn:btih:mixed-anchor", "size": 55},
		Timestamp:     4,
	}
	signTestBlock(t, anchorA, keysA["privateKey"])
	if err := l.ProcessBlock(anchorA, true); err != nil {
		t.Fatalf("expected anchorA to succeed, got %v", err)
	}

	prevBid := openB.Hash
	bidB := &Block{
		Type:          "market_bid",
		Account:       keysB["publicKey"],
		Previous:      &prevBid,
		Balance:       150,
		StakedBalance: 0,
		Height:        1,
		Link:          "STORAGE_MARKET",
		Spora:         validSpora(openB.Hash),
		Payload:       map[string]interface{}{"magnet": "magnet:?xt=urn:btih:mixed-bid"},
		Timestamp:     5,
	}
	signTestBlock(t, bidB, keysB["privateKey"])
	if err := l.ProcessBlock(bidB, true); err != nil {
		t.Fatalf("expected bidB to succeed, got %v", err)
	}

	prevAccept := bidB.Hash
	acceptB := &Block{
		Type:          "accept_bid",
		Account:       keysB["publicKey"],
		Previous:      &prevAccept,
		Balance:       200,
		StakedBalance: 0,
		Height:        2,
		Link:          bidB.Hash,
		Spora:         validSpora(bidB.Hash),
		Timestamp:     6,
	}
	signTestBlock(t, acceptB, keysB["privateKey"])
	if err := l.ProcessBlock(acceptB, true); err != nil {
		t.Fatalf("expected acceptB to succeed, got %v", err)
	}

	l.Anchors = map[string]interface{}{}
	l.MarketBids = map[string]interface{}{}
	l.StateHash = "corrupted"
	l.MerkleRoot = "corrupted"

	if err := l.AuditState(); err != nil {
		t.Fatalf("expected mixed-history audit to succeed, got %v", err)
	}

	if len(l.Chains[keysA["publicKey"]]) != 3 {
		t.Fatalf("expected account A chain length 3, got %d", len(l.Chains[keysA["publicKey"]]))
	}
	if len(l.Chains[keysB["publicKey"]]) != 3 {
		t.Fatalf("expected account B chain length 3, got %d", len(l.Chains[keysB["publicKey"]]))
	}
	anchor, ok := l.Anchors[anchorA.Hash]
	if !ok {
		t.Fatalf("expected mixed-history audit to rebuild anchorA")
	}
	anchorMap := anchor.(map[string]interface{})
	if anchorMap["owner"] != keysA["publicKey"] {
		t.Fatalf("expected rebuilt anchor owner %q, got %v", keysA["publicKey"], anchorMap["owner"])
	}
	bid, ok := l.MarketBids[bidB.Hash]
	if !ok {
		t.Fatalf("expected mixed-history audit to rebuild market bid")
	}
	bidMap := bid.(map[string]interface{})
	if bidMap["status"] != "ACCEPTED" {
		t.Fatalf("expected rebuilt bid status ACCEPTED, got %v", bidMap["status"])
	}
	if bidMap["acceptedBy"] != keysB["publicKey"] {
		t.Fatalf("expected rebuilt acceptedBy %q, got %v", keysB["publicKey"], bidMap["acceptedBy"])
	}
	if l.StateHash == "corrupted" || l.MerkleRoot == "corrupted" {
		t.Fatalf("expected audit to restore mixed-history state hashes")
	}
}

func TestRecoveryRebuildsComplexHistoricalStateFromSQLite(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "complex-recovery.sqlite")
	keysA := DeriveKeypair("semantic parity complex recovery A", 0)
	keysB := DeriveKeypair("semantic parity complex recovery B", 0)
	keysC := DeriveKeypair("semantic parity complex recovery C", 0)

	mgr := NewDBManager(dbPath)
	l := NewLattice(mgr)

	genesisA := makeGenesisBlock(keysA, 1000)
	signTestBlock(t, genesisA, keysA["privateKey"])
	if err := l.ProcessBlock(genesisA, false); err != nil {
		t.Fatalf("expected complex genesisA persistence to succeed, got %v", err)
	}

	prevSend := genesisA.Hash
	sendAB := &Block{
		Type:          "send",
		Account:       keysA["publicKey"],
		Previous:      &prevSend,
		Balance:       800,
		StakedBalance: 0,
		Height:        1,
		Link:          keysB["publicKey"],
		Spora:         validSpora(genesisA.Hash),
		Timestamp:     2,
	}
	signTestBlock(t, sendAB, keysA["privateKey"])
	if err := l.ProcessBlock(sendAB, false); err != nil {
		t.Fatalf("expected complex sendAB to succeed, got %v", err)
	}

	openB := &Block{
		Type:          "open",
		Account:       keysB["publicKey"],
		Previous:      nil,
		Balance:       200,
		StakedBalance: 0,
		Height:        0,
		Link:          sendAB.Hash,
		Spora:         validSporaForOpenAccount(keysB["publicKey"]),
		Timestamp:     3,
	}
	signTestBlock(t, openB, keysB["privateKey"])
	if err := l.ProcessBlock(openB, false); err != nil {
		t.Fatalf("expected complex openB to succeed, got %v", err)
	}

	prevMint := sendAB.Hash
	mintNFT := &Block{
		Type:          "mint_nft",
		Account:       keysA["publicKey"],
		Previous:      &prevMint,
		Balance:       750,
		StakedBalance: 0,
		Height:        2,
		Link:          "NFT_MINT",
		Spora:         validSpora(sendAB.Hash),
		Payload: map[string]interface{}{
			"name":        "Complex Artifact",
			"magnet":      "magnet:?xt=urn:btih:complex-nft",
			"description": "Recovered across restart",
		},
		Timestamp: 4,
	}
	signTestBlock(t, mintNFT, keysA["privateKey"])
	if err := l.ProcessBlock(mintNFT, false); err != nil {
		t.Fatalf("expected complex mint_nft to succeed, got %v", err)
	}

	proposalEnd := time.UnixMilli(5).Format(time.RFC3339)
	prevProposal := openB.Hash
	proposalB := &Block{
		Type:          "proposal",
		Account:       keysB["publicKey"],
		Previous:      &prevProposal,
		Balance:       190,
		StakedBalance: 0,
		Height:        1,
		Link:          "DAO_PROPOSAL",
		Spora:         validSpora(openB.Hash),
		Payload: map[string]interface{}{
			"title":   "Complex Recovery Proposal",
			"endTime": proposalEnd,
		},
		Timestamp: 5,
	}
	signTestBlock(t, proposalB, keysB["privateKey"])
	if err := l.ProcessBlock(proposalB, false); err != nil {
		t.Fatalf("expected complex proposal to succeed, got %v", err)
	}

	prevTransfer := mintNFT.Hash
	transferNFT := &Block{
		Type:          "transfer_nft",
		Account:       keysA["publicKey"],
		Previous:      &prevTransfer,
		Balance:       749,
		StakedBalance: 0,
		Height:        3,
		Link:          mintNFT.Hash,
		Spora:         validSpora(mintNFT.Hash),
		Payload: map[string]interface{}{
			"recipient": keysC["publicKey"],
		},
		Timestamp: 6,
	}
	signTestBlock(t, transferNFT, keysA["privateKey"])
	if err := l.ProcessBlock(transferNFT, false); err != nil {
		t.Fatalf("expected complex transfer_nft to succeed, got %v", err)
	}

	secret := "complex-recovery-secret"
	secretHash := Hash(secret)
	prevSwapLock := transferNFT.Hash
	swapLock := &Block{
		Type:          "swap_lock",
		Account:       keysA["publicKey"],
		Previous:      &prevSwapLock,
		Balance:       649,
		StakedBalance: 0,
		Height:        4,
		Link:          "HTLC_LOCK",
		Spora:         validSpora(transferNFT.Hash),
		Payload: map[string]interface{}{
			"secretHash": secretHash,
			"recipient":  keysB["publicKey"],
			"expiry":     float64(time.Now().Add(time.Hour).UnixMilli()),
		},
		Timestamp: 7,
	}
	signTestBlock(t, swapLock, keysA["privateKey"])
	if err := l.ProcessBlock(swapLock, false); err != nil {
		t.Fatalf("expected complex swap_lock to succeed, got %v", err)
	}

	prevClaim := proposalB.Hash
	swapClaim := &Block{
		Type:          "swap_claim",
		Account:       keysB["publicKey"],
		Previous:      &prevClaim,
		Balance:       290,
		StakedBalance: 0,
		Height:        2,
		Link:          "HTLC_CLAIM",
		Spora:         validSpora(proposalB.Hash),
		Payload: map[string]interface{}{
			"secret":     secret,
			"secretHash": secretHash,
		},
		Timestamp: 8,
	}
	signTestBlock(t, swapClaim, keysB["privateKey"])
	if err := l.ProcessBlock(swapClaim, false); err != nil {
		t.Fatalf("expected complex swap_claim to succeed, got %v", err)
	}

	if err := mgr.Close(); err != nil {
		t.Fatalf("failed to close db manager before complex recovery test: %v", err)
	}

	recovered := NewLattice(NewDBManager(dbPath))
	defer recovered.db.Close()

	if len(recovered.Chains[keysA["publicKey"]]) != 5 {
		t.Fatalf("expected recovered account A chain length 5, got %d", len(recovered.Chains[keysA["publicKey"]]))
	}
	if len(recovered.Chains[keysB["publicKey"]]) != 3 {
		t.Fatalf("expected recovered account B chain length 3, got %d", len(recovered.Chains[keysB["publicKey"]]))
	}
	nft, ok := recovered.Nfts[mintNFT.Hash]
	if !ok {
		t.Fatalf("expected recovered NFT to exist")
	}
	nftMap := nft.(map[string]interface{})
	if nftMap["owner"] != keysC["publicKey"] {
		t.Fatalf("expected recovered NFT owner %q, got %v", keysC["publicKey"], nftMap["owner"])
	}
	swap := recovered.Swaps[secretHash]
	if swap == nil || swap.Status != "CLAIMED" {
		t.Fatalf("expected recovered swap to be CLAIMED, got %+v", swap)
	}
	if swap.Claimer != keysB["publicKey"] {
		t.Fatalf("expected recovered swap claimer %q, got %v", keysB["publicKey"], swap.Claimer)
	}
	proposal, ok := recovered.Proposals[proposalB.Hash]
	if !ok {
		t.Fatalf("expected recovered proposal to exist")
	}
	proposalMap := proposal.(map[string]interface{})
	if proposalMap["status"] != "Rejected" {
		t.Fatalf("expected recovered proposal status Rejected, got %v", proposalMap["status"])
	}
}

func TestAuditStateHandlesSameTimestampCrossAccountDependencies(t *testing.T) {
	keys := deriveDescendingKeypairs("semantic parity same ts", 2)
	sender := keys[0]
	receiver := keys[1]
	if sender["publicKey"] <= receiver["publicKey"] {
		t.Fatalf("expected sender account ordering to sort after receiver")
	}
	l := NewLattice(NewDBManager(":memory:"))

	genesis := makeGenesisBlock(sender, 1000)
	signTestBlock(t, genesis, sender["privateKey"])
	if err := l.ProcessBlock(genesis, true); err != nil {
		t.Fatalf("expected genesis to succeed, got %v", err)
	}

	sendAB := &Block{
		Type:          "send",
		Account:       sender["publicKey"],
		Previous:      &genesis.Hash,
		Balance:       800,
		StakedBalance: 0,
		Height:        1,
		Link:          receiver["publicKey"],
		Spora:         validSpora(genesis.Hash),
		Timestamp:     10,
	}
	signTestBlock(t, sendAB, sender["privateKey"])
	if err := l.ProcessBlock(sendAB, true); err != nil {
		t.Fatalf("expected sendAB to succeed, got %v", err)
	}

	openB := &Block{
		Type:          "open",
		Account:       receiver["publicKey"],
		Previous:      nil,
		Balance:       200,
		StakedBalance: 0,
		Height:        0,
		Link:          sendAB.Hash,
		Spora:         validSporaForOpenAccount(receiver["publicKey"]),
		Timestamp:     10,
	}
	signTestBlock(t, openB, receiver["privateKey"])
	if err := l.ProcessBlock(openB, true); err != nil {
		t.Fatalf("expected openB to succeed, got %v", err)
	}

	l.Pending = map[string][]*PendingTx{}
	l.StateHash = "broken"
	l.MerkleRoot = "broken"
	if err := l.AuditState(); err != nil {
		t.Fatalf("expected same-timestamp audit replay to succeed, got %v", err)
	}
	if l.StateHash == "broken" || l.MerkleRoot == "broken" {
		t.Fatalf("expected audit to recover state hashes for same-timestamp replay")
	}
	if len(l.Chains[receiver["publicKey"]]) != 1 {
		t.Fatalf("expected receiving account chain length 1 after replay, got %d", len(l.Chains[receiver["publicKey"]]))
	}
}

func TestHistoricalVoteUsesBlockTimestampNotWallClock(t *testing.T) {
	keys := deriveDescendingKeypairs("semantic parity historical vote", 2)
	proposer := keys[0]
	voter := keys[1]
	l := NewLattice(NewDBManager(":memory:"))

	genesis := makeGenesisBlock(proposer, 1000)
	signTestBlock(t, genesis, proposer["privateKey"])
	if err := l.ProcessBlock(genesis, true); err != nil {
		t.Fatalf("expected proposer genesis to succeed, got %v", err)
	}

	sendToVoter := &Block{
		Type:          "send",
		Account:       proposer["publicKey"],
		Previous:      &genesis.Hash,
		Balance:       800,
		StakedBalance: 0,
		Height:        1,
		Link:          voter["publicKey"],
		Spora:         validSpora(genesis.Hash),
		Timestamp:     2,
	}
	signTestBlock(t, sendToVoter, proposer["privateKey"])
	if err := l.ProcessBlock(sendToVoter, true); err != nil {
		t.Fatalf("expected sendToVoter to succeed, got %v", err)
	}

	openVoter := &Block{
		Type:          "open",
		Account:       voter["publicKey"],
		Previous:      nil,
		Balance:       200,
		StakedBalance: 0,
		Height:        0,
		Link:          sendToVoter.Hash,
		Spora:         validSporaForOpenAccount(voter["publicKey"]),
		Timestamp:     3,
	}
	signTestBlock(t, openVoter, voter["privateKey"])
	if err := l.ProcessBlock(openVoter, true); err != nil {
		t.Fatalf("expected openVoter to succeed, got %v", err)
	}

	proposal := &Block{
		Type:          "proposal",
		Account:       proposer["publicKey"],
		Previous:      &sendToVoter.Hash,
		Balance:       790,
		StakedBalance: 0,
		Height:        2,
		Link:          "DAO_PROPOSAL",
		Spora:         validSpora(sendToVoter.Hash),
		Payload: map[string]interface{}{
			"title":   "Historical deterministic vote",
			"endTime": time.Unix(5, 0).Format(time.RFC3339),
		},
		Timestamp: 4,
	}
	signTestBlock(t, proposal, proposer["privateKey"])
	if err := l.ProcessBlock(proposal, true); err != nil {
		t.Fatalf("expected proposal to succeed, got %v", err)
	}

	vote := &Block{
		Type:          "vote",
		Account:       voter["publicKey"],
		Previous:      &openVoter.Hash,
		Balance:       200,
		StakedBalance: 0,
		Height:        1,
		Link:          proposal.Hash,
		Spora:         validSpora(openVoter.Hash),
		Payload:       map[string]interface{}{"vote": "FOR"},
		Timestamp:     5,
	}
	signTestBlock(t, vote, voter["privateKey"])
	if err := l.ProcessBlock(vote, true); err != nil {
		t.Fatalf("expected historical vote before proposal expiry to succeed, got %v", err)
	}

	votes := l.Votes[proposal.Hash]
	if _, ok := votes[voter["publicKey"]]; !ok {
		t.Fatalf("expected historical vote to be recorded")
	}
}

func TestAuditStateReplaysSameTimestampVoteBeforeLaterExpiry(t *testing.T) {
	keys := deriveDescendingKeypairs("semantic parity same ts proposal vote", 2)
	proposer := keys[0]
	voter := keys[1]
	if proposer["publicKey"] <= voter["publicKey"] {
		t.Fatalf("expected proposer account ordering to sort after voter")
	}
	l := NewLattice(NewDBManager(":memory:"))
	base := time.Now().Add(time.Hour).Truncate(time.Second).UnixMilli()

	genesis := &Block{
		Type:          "open",
		Account:       proposer["publicKey"],
		Previous:      nil,
		Balance:       1000,
		StakedBalance: 0,
		Height:        0,
		Link:          "SYSTEM_GENESIS",
		Timestamp:     base - 3000,
	}
	signTestBlock(t, genesis, proposer["privateKey"])
	if err := l.ProcessBlock(genesis, true); err != nil {
		t.Fatalf("expected proposer genesis to succeed, got %v", err)
	}

	sendBalance := l.GetBalance(proposer["publicKey"], base-2000) - 200
	sendToVoter := &Block{
		Type:          "send",
		Account:       proposer["publicKey"],
		Previous:      &genesis.Hash,
		Balance:       sendBalance,
		StakedBalance: 0,
		Height:        1,
		Link:          voter["publicKey"],
		Spora:         validSpora(genesis.Hash),
		Timestamp:     base - 2000,
	}
	signTestBlock(t, sendToVoter, proposer["privateKey"])
	if err := l.ProcessBlock(sendToVoter, true); err != nil {
		t.Fatalf("expected sendToVoter to succeed, got %v", err)
	}

	openVoter := &Block{
		Type:          "open",
		Account:       voter["publicKey"],
		Previous:      nil,
		Balance:       200,
		StakedBalance: 0,
		Height:        0,
		Link:          sendToVoter.Hash,
		Spora:         validSporaForOpenAccount(voter["publicKey"]),
		Timestamp:     base - 1000,
	}
	signTestBlock(t, openVoter, voter["privateKey"])
	if err := l.ProcessBlock(openVoter, true); err != nil {
		t.Fatalf("expected openVoter to succeed, got %v", err)
	}

	proposalBalance := l.GetBalance(proposer["publicKey"], base) - 10
	proposal := &Block{
		Type:          "proposal",
		Account:       proposer["publicKey"],
		Previous:      &sendToVoter.Hash,
		Balance:       proposalBalance,
		StakedBalance: 0,
		Height:        2,
		Link:          "DAO_PROPOSAL",
		Spora:         validSpora(sendToVoter.Hash),
		Payload: map[string]interface{}{
			"title":   "Same timestamp proposal vote",
			"endTime": time.UnixMilli(base + 1000).Format(time.RFC3339),
		},
		Timestamp: base,
	}
	signTestBlock(t, proposal, proposer["privateKey"])
	if err := l.ProcessBlock(proposal, true); err != nil {
		t.Fatalf("expected proposal to succeed, got %v", err)
	}

	voteBalance := l.GetBalance(voter["publicKey"], base)
	vote := &Block{
		Type:          "vote",
		Account:       voter["publicKey"],
		Previous:      &openVoter.Hash,
		Balance:       voteBalance,
		StakedBalance: 0,
		Height:        1,
		Link:          proposal.Hash,
		Spora:         validSpora(openVoter.Hash),
		Payload:       map[string]interface{}{"vote": "FOR"},
		Timestamp:     base,
	}
	signTestBlock(t, vote, voter["privateKey"])
	if err := l.ProcessBlock(vote, true); err != nil {
		t.Fatalf("expected same-timestamp vote to succeed, got %v", err)
	}

	manifestBalance := l.GetBalance(proposer["publicKey"], base+2000)
	manifest := &Block{
		Type:          "publish_manifest",
		Account:       proposer["publicKey"],
		Previous:      &proposal.Hash,
		Balance:       manifestBalance,
		StakedBalance: 0,
		Height:        3,
		Link:          "proposal-vote-manifest",
		Spora:         validSpora(proposal.Hash),
		Payload: map[string]interface{}{
			"manifestId":  "proposal-vote-manifest",
			"locator":     "bobtorrent://manifest/proposal-vote",
			"manifestUrl": "http://localhost:8000/manifests/proposal-vote",
		},
		Timestamp: base + 2000,
	}
	signTestBlock(t, manifest, proposer["privateKey"])
	if err := l.ProcessBlock(manifest, true); err != nil {
		t.Fatalf("expected post-expiry manifest to succeed, got %v", err)
	}

	l.StateHash = "broken"
	l.MerkleRoot = "broken"
	l.Pending = map[string][]*PendingTx{}
	if err := l.AuditState(); err != nil {
		t.Fatalf("expected audit replay of same-timestamp vote before later expiry to succeed, got %v", err)
	}
	proposalMap := l.Proposals[proposal.Hash].(map[string]interface{})
	if proposalMap["status"] != "Passed" {
		t.Fatalf("expected replayed proposal status Passed, got %v", proposalMap["status"])
	}
	if _, ok := l.Votes[proposal.Hash][voter["publicKey"]]; !ok {
		t.Fatalf("expected replayed vote to be preserved after audit")
	}
}

func TestSwapClaimUsesBlockTimestampNotWallClock(t *testing.T) {
	keys := DeriveKeypair("semantic parity historical swap claim", 0)
	l := NewLattice(NewDBManager(":memory:"))

	genesis := makeGenesisBlock(keys, 1000)
	signTestBlock(t, genesis, keys["privateKey"])
	if err := l.ProcessBlock(genesis, true); err != nil {
		t.Fatalf("expected genesis block to succeed, got %v", err)
	}

	secret := "historical-swap-secret"
	secretHash := Hash(secret)
	prevLock := genesis.Hash
	lockBlock := &Block{
		Type:          "swap_lock",
		Account:       keys["publicKey"],
		Previous:      &prevLock,
		Balance:       925,
		StakedBalance: 0,
		Height:        1,
		Link:          "HTLC_LOCK",
		Spora:         validSpora(genesis.Hash),
		Payload: map[string]interface{}{
			"secretHash": secretHash,
			"recipient":  keys["publicKey"],
			"expiry":     float64(5),
		},
		Timestamp: 2,
	}
	signTestBlock(t, lockBlock, keys["privateKey"])
	if err := l.ProcessBlock(lockBlock, true); err != nil {
		t.Fatalf("expected swap_lock to succeed, got %v", err)
	}

	prevClaim := lockBlock.Hash
	claimBlock := &Block{
		Type:          "swap_claim",
		Account:       keys["publicKey"],
		Previous:      &prevClaim,
		Balance:       1000,
		StakedBalance: 0,
		Height:        2,
		Link:          "HTLC_CLAIM",
		Spora:         validSpora(lockBlock.Hash),
		Payload: map[string]interface{}{
			"secret":     secret,
			"secretHash": secretHash,
		},
		Timestamp: 4,
	}
	signTestBlock(t, claimBlock, keys["privateKey"])
	if err := l.ProcessBlock(claimBlock, true); err != nil {
		t.Fatalf("expected historical swap_claim before expiry to succeed, got %v", err)
	}

	swap := l.Swaps[secretHash]
	if swap == nil || swap.Status != "CLAIMED" {
		t.Fatalf("expected claimed swap state after historical replay, got %+v", swap)
	}
}

func TestRecoveryRebuildsDefaultSwapExpiryWithoutPayload(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "default-swap-expiry.sqlite")
	keys := DeriveKeypair("semantic parity default swap expiry", 0)
	secret := "default-swap-expiry-secret"
	secretHash := Hash(secret)

	mgr := NewDBManager(dbPath)
	l := NewLattice(mgr)

	genesis := makeGenesisBlock(keys, 1000)
	signTestBlock(t, genesis, keys["privateKey"])
	if err := l.ProcessBlock(genesis, false); err != nil {
		t.Fatalf("expected persisted genesis block to succeed, got %v", err)
	}

	prevLock := genesis.Hash
	lockBlock := &Block{
		Type:          "swap_lock",
		Account:       keys["publicKey"],
		Previous:      &prevLock,
		Balance:       925,
		StakedBalance: 0,
		Height:        1,
		Link:          "HTLC_LOCK",
		Spora:         validSpora(genesis.Hash),
		Payload: map[string]interface{}{
			"secretHash": secretHash,
			"recipient":  keys["publicKey"],
		},
		Timestamp: 2000,
	}
	signTestBlock(t, lockBlock, keys["privateKey"])
	if err := l.ProcessBlock(lockBlock, false); err != nil {
		t.Fatalf("expected persisted swap_lock to succeed, got %v", err)
	}

	if err := mgr.Close(); err != nil {
		t.Fatalf("failed to close db manager before default expiry recovery test: %v", err)
	}

	recovered := NewLattice(NewDBManager(dbPath))
	defer recovered.db.Close()

	swap := recovered.Swaps[secretHash]
	if swap == nil {
		t.Fatalf("expected recovered swap to exist")
	}
	expectedExpiry := lockBlock.Timestamp + 3600000
	if swap.Expiry != expectedExpiry {
		t.Fatalf("expected deterministic recovered swap expiry %d, got %d", expectedExpiry, swap.Expiry)
	}

	claimTimestamp := lockBlock.Timestamp + 1000
	expectedClaimBalance := recovered.GetBalance(keys["publicKey"], claimTimestamp) + swap.Amount
	prevClaim := lockBlock.Hash
	claimBlock := &Block{
		Type:          "swap_claim",
		Account:       keys["publicKey"],
		Previous:      &prevClaim,
		Balance:       expectedClaimBalance,
		StakedBalance: 0,
		Height:        2,
		Link:          "HTLC_CLAIM",
		Spora:         validSpora(lockBlock.Hash),
		Payload: map[string]interface{}{
			"secret":     secret,
			"secretHash": secretHash,
		},
		Timestamp: claimTimestamp,
	}
	signTestBlock(t, claimBlock, keys["privateKey"])
	if err := recovered.ProcessBlock(claimBlock, true); err != nil {
		t.Fatalf("expected recovered swap_claim with default expiry to succeed, got %v", err)
	}
}

func TestRecoveryRebuildsDemurrageSensitiveGovernanceAndSwapLedgerFromSQLite(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "demurrage-governance-swap.sqlite")
	keysA := DeriveKeypair("semantic parity demurrage proposer", 0)
	keysB := DeriveKeypair("semantic parity demurrage voter", 0)
	secret := "go-demurrage-mixed-secret"
	secretHash := Hash(secret)

	mgr := NewDBManager(dbPath)
	l := NewLattice(mgr)

	genesis := &Block{
		Type:          "open",
		Account:       keysA["publicKey"],
		Previous:      nil,
		Balance:       1000,
		StakedBalance: 0,
		Height:        0,
		Link:          "SYSTEM_GENESIS",
		Timestamp:     1000,
	}
	signTestBlock(t, genesis, keysA["privateKey"])
	if err := l.ProcessBlock(genesis, false); err != nil {
		t.Fatalf("expected proposer genesis persistence to succeed, got %v", err)
	}

	sendTs := int64(61000)
	sendToVoter := &Block{
		Type:          "send",
		Account:       keysA["publicKey"],
		Previous:      &genesis.Hash,
		Balance:       l.GetBalance(keysA["publicKey"], sendTs) - 200,
		StakedBalance: 0,
		Height:        1,
		Link:          keysB["publicKey"],
		Spora:         validSpora(genesis.Hash),
		Timestamp:     sendTs,
	}
	signTestBlock(t, sendToVoter, keysA["privateKey"])
	if err := l.ProcessBlock(sendToVoter, false); err != nil {
		t.Fatalf("expected sendToVoter persistence to succeed, got %v", err)
	}

	openTs := int64(61100)
	openVoter := &Block{
		Type:          "open",
		Account:       keysB["publicKey"],
		Previous:      nil,
		Balance:       200,
		StakedBalance: 0,
		Height:        0,
		Link:          sendToVoter.Hash,
		Spora:         validSporaForOpenAccount(keysB["publicKey"]),
		Timestamp:     openTs,
	}
	signTestBlock(t, openVoter, keysB["privateKey"])
	if err := l.ProcessBlock(openVoter, false); err != nil {
		t.Fatalf("expected openVoter persistence to succeed, got %v", err)
	}

	proposalTs := int64(121000)
	proposal := &Block{
		Type:          "proposal",
		Account:       keysA["publicKey"],
		Previous:      &sendToVoter.Hash,
		Balance:       l.GetBalance(keysA["publicKey"], proposalTs) - 10,
		StakedBalance: 0,
		Height:        2,
		Link:          "DAO_PROPOSAL",
		Spora:         validSpora(sendToVoter.Hash),
		Payload: map[string]interface{}{
			"title":   "Demurrage sensitive governance and swap ledger",
			"endTime": time.UnixMilli(proposalTs + 3000).Format(time.RFC3339),
		},
		Timestamp: proposalTs,
	}
	signTestBlock(t, proposal, keysA["privateKey"])
	if err := l.ProcessBlock(proposal, false); err != nil {
		t.Fatalf("expected proposal persistence to succeed, got %v", err)
	}

	voteTs := int64(121500)
	vote := &Block{
		Type:          "vote",
		Account:       keysB["publicKey"],
		Previous:      &openVoter.Hash,
		Balance:       l.GetBalance(keysB["publicKey"], voteTs),
		StakedBalance: 0,
		Height:        1,
		Link:          proposal.Hash,
		Spora:         validSpora(openVoter.Hash),
		Payload:       map[string]interface{}{"vote": "FOR"},
		Timestamp:     voteTs,
	}
	signTestBlock(t, vote, keysB["privateKey"])
	if err := l.ProcessBlock(vote, false); err != nil {
		t.Fatalf("expected vote persistence to succeed, got %v", err)
	}

	swapLockTs := int64(122000)
	swapLock := &Block{
		Type:          "swap_lock",
		Account:       keysA["publicKey"],
		Previous:      &proposal.Hash,
		Balance:       l.GetBalance(keysA["publicKey"], swapLockTs) - 75,
		StakedBalance: 0,
		Height:        3,
		Link:          "HTLC_LOCK",
		Spora:         validSpora(proposal.Hash),
		Payload: map[string]interface{}{
			"secretHash": secretHash,
			"recipient":  keysA["publicKey"],
		},
		Timestamp: swapLockTs,
	}
	signTestBlock(t, swapLock, keysA["privateKey"])
	if err := l.ProcessBlock(swapLock, false); err != nil {
		t.Fatalf("expected swapLock persistence to succeed, got %v", err)
	}

	swapClaimTs := int64(122500)
	swapClaim := &Block{
		Type:          "swap_claim",
		Account:       keysA["publicKey"],
		Previous:      &swapLock.Hash,
		Balance:       l.GetBalance(keysA["publicKey"], swapClaimTs) + l.Swaps[secretHash].Amount,
		StakedBalance: 0,
		Height:        4,
		Link:          "HTLC_CLAIM",
		Spora:         validSpora(swapLock.Hash),
		Payload: map[string]interface{}{
			"secret":     secret,
			"secretHash": secretHash,
		},
		Timestamp: swapClaimTs,
	}
	signTestBlock(t, swapClaim, keysA["privateKey"])
	if err := l.ProcessBlock(swapClaim, false); err != nil {
		t.Fatalf("expected swapClaim persistence to succeed, got %v", err)
	}

	finalizerTs := proposalTs + 5000
	manifestBalance := l.GetBalance(keysA["publicKey"], finalizerTs)
	manifest := &Block{
		Type:          "publish_manifest",
		Account:       keysA["publicKey"],
		Previous:      &swapClaim.Hash,
		Balance:       manifestBalance,
		StakedBalance: 0,
		Height:        5,
		Link:          "go-demurrage-mixed-manifest",
		Spora:         validSpora(swapClaim.Hash),
		Payload: map[string]interface{}{
			"manifestId":  "go-demurrage-mixed-manifest",
			"locator":     "bobtorrent://manifest/go-demurrage-mixed",
			"manifestUrl": "http://localhost:8000/manifests/go-demurrage-mixed",
		},
		Timestamp: finalizerTs,
	}
	signTestBlock(t, manifest, keysA["privateKey"])
	if err := l.ProcessBlock(manifest, false); err != nil {
		t.Fatalf("expected manifest persistence to succeed, got %v", err)
	}

	if err := mgr.Close(); err != nil {
		t.Fatalf("failed to close db manager before demurrage recovery test: %v", err)
	}

	recovered := NewLattice(NewDBManager(dbPath))
	defer recovered.db.Close()

	if len(recovered.Chains[keysA["publicKey"]]) != 6 {
		t.Fatalf("expected recovered proposer chain length 6, got %d", len(recovered.Chains[keysA["publicKey"]]))
	}
	if len(recovered.Chains[keysB["publicKey"]]) != 2 {
		t.Fatalf("expected recovered voter chain length 2, got %d", len(recovered.Chains[keysB["publicKey"]]))
	}
	proposalMap, ok := recovered.Proposals[proposal.Hash].(map[string]interface{})
	if !ok {
		t.Fatalf("expected recovered proposal to exist")
	}
	if proposalMap["status"] != "Passed" {
		t.Fatalf("expected recovered proposal status Passed, got %v", proposalMap["status"])
	}
	if _, ok := recovered.Votes[proposal.Hash][keysB["publicKey"]]; !ok {
		t.Fatalf("expected recovered vote to be preserved")
	}
	swap := recovered.Swaps[secretHash]
	if swap == nil || swap.Status != "CLAIMED" {
		t.Fatalf("expected recovered swap to be CLAIMED, got %+v", swap)
	}
	frontier := recovered.Chains[keysA["publicKey"]][len(recovered.Chains[keysA["publicKey"]])-1]
	if math.Abs(frontier.Balance-manifestBalance) > 0.001 {
		t.Fatalf("expected recovered proposer frontier balance near %v, got %v", manifestBalance, frontier.Balance)
	}
	anchor, ok := recovered.Anchors[manifest.Hash]
	if !ok {
		t.Fatalf("expected recovered manifest anchor to exist")
	}
	anchorMap := anchor.(map[string]interface{})
	if anchorMap["type"] != "publish_manifest" {
		t.Fatalf("expected recovered manifest anchor type publish_manifest, got %v", anchorMap["type"])
	}
}

func TestRecoveryReplaysSameTimestampMixedGovernanceAndSwapLedgerFromSQLite(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "same-timestamp-governance-swap.sqlite")
	keys := deriveDescendingKeypairs("semantic parity same timestamp governance swap", 2)
	proposer := keys[0]
	voter := keys[1]
	if proposer["publicKey"] <= voter["publicKey"] {
		t.Fatalf("expected proposer account ordering to sort after voter")
	}
	secret := "go-same-timestamp-mixed-secret"
	secretHash := Hash(secret)
	base := int64(100000)

	mgr := NewDBManager(dbPath)
	l := NewLattice(mgr)

	genesis := &Block{
		Type:          "open",
		Account:       proposer["publicKey"],
		Previous:      nil,
		Balance:       1000,
		StakedBalance: 0,
		Height:        0,
		Link:          "SYSTEM_GENESIS",
		Timestamp:     base - 3000,
	}
	signTestBlock(t, genesis, proposer["privateKey"])
	if err := l.ProcessBlock(genesis, false); err != nil {
		t.Fatalf("expected proposer genesis persistence to succeed, got %v", err)
	}

	sendToVoter := &Block{
		Type:          "send",
		Account:       proposer["publicKey"],
		Previous:      &genesis.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base-2000) - 200,
		StakedBalance: 0,
		Height:        1,
		Link:          voter["publicKey"],
		Spora:         validSpora(genesis.Hash),
		Timestamp:     base - 2000,
	}
	signTestBlock(t, sendToVoter, proposer["privateKey"])
	if err := l.ProcessBlock(sendToVoter, false); err != nil {
		t.Fatalf("expected sendToVoter persistence to succeed, got %v", err)
	}

	openVoter := &Block{
		Type:          "open",
		Account:       voter["publicKey"],
		Previous:      nil,
		Balance:       200,
		StakedBalance: 0,
		Height:        0,
		Link:          sendToVoter.Hash,
		Spora:         validSporaForOpenAccount(voter["publicKey"]),
		Timestamp:     base - 1000,
	}
	signTestBlock(t, openVoter, voter["privateKey"])
	if err := l.ProcessBlock(openVoter, false); err != nil {
		t.Fatalf("expected openVoter persistence to succeed, got %v", err)
	}

	proposal := &Block{
		Type:          "proposal",
		Account:       proposer["publicKey"],
		Previous:      &sendToVoter.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 10,
		StakedBalance: 0,
		Height:        2,
		Link:          "DAO_PROPOSAL",
		Spora:         validSpora(sendToVoter.Hash),
		Payload: map[string]interface{}{
			"title":   "Same timestamp mixed governance and swap ledger",
			"endTime": time.UnixMilli(base + 1000).Format(time.RFC3339),
		},
		Timestamp: base,
	}
	signTestBlock(t, proposal, proposer["privateKey"])
	if err := l.ProcessBlock(proposal, false); err != nil {
		t.Fatalf("expected proposal persistence to succeed, got %v", err)
	}

	vote := &Block{
		Type:          "vote",
		Account:       voter["publicKey"],
		Previous:      &openVoter.Hash,
		Balance:       l.GetBalance(voter["publicKey"], base),
		StakedBalance: 0,
		Height:        1,
		Link:          proposal.Hash,
		Spora:         validSpora(openVoter.Hash),
		Payload:       map[string]interface{}{"vote": "FOR"},
		Timestamp:     base,
	}
	signTestBlock(t, vote, voter["privateKey"])
	if err := l.ProcessBlock(vote, false); err != nil {
		t.Fatalf("expected vote persistence to succeed, got %v", err)
	}

	swapLock := &Block{
		Type:          "swap_lock",
		Account:       proposer["publicKey"],
		Previous:      &proposal.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 75,
		StakedBalance: 0,
		Height:        3,
		Link:          "HTLC_LOCK",
		Spora:         validSpora(proposal.Hash),
		Payload: map[string]interface{}{
			"secretHash": secretHash,
			"recipient":  proposer["publicKey"],
		},
		Timestamp: base,
	}
	signTestBlock(t, swapLock, proposer["privateKey"])
	if err := l.ProcessBlock(swapLock, false); err != nil {
		t.Fatalf("expected swapLock persistence to succeed, got %v", err)
	}

	swapClaim := &Block{
		Type:          "swap_claim",
		Account:       proposer["publicKey"],
		Previous:      &swapLock.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base+500) + l.Swaps[secretHash].Amount,
		StakedBalance: 0,
		Height:        4,
		Link:          "HTLC_CLAIM",
		Spora:         validSpora(swapLock.Hash),
		Payload: map[string]interface{}{
			"secret":     secret,
			"secretHash": secretHash,
		},
		Timestamp: base + 500,
	}
	signTestBlock(t, swapClaim, proposer["privateKey"])
	if err := l.ProcessBlock(swapClaim, false); err != nil {
		t.Fatalf("expected swapClaim persistence to succeed, got %v", err)
	}

	manifest := &Block{
		Type:          "publish_manifest",
		Account:       proposer["publicKey"],
		Previous:      &swapClaim.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base+2000),
		StakedBalance: 0,
		Height:        5,
		Link:          "go-same-timestamp-mixed-manifest",
		Spora:         validSpora(swapClaim.Hash),
		Payload: map[string]interface{}{
			"manifestId":  "go-same-timestamp-mixed-manifest",
			"locator":     "bobtorrent://manifest/go-same-timestamp-mixed",
			"manifestUrl": "http://localhost:8000/manifests/go-same-timestamp-mixed",
		},
		Timestamp: base + 2000,
	}
	signTestBlock(t, manifest, proposer["privateKey"])
	if err := l.ProcessBlock(manifest, false); err != nil {
		t.Fatalf("expected manifest persistence to succeed, got %v", err)
	}

	if err := mgr.Close(); err != nil {
		t.Fatalf("failed to close db manager before same-timestamp mixed recovery test: %v", err)
	}

	recovered := NewLattice(NewDBManager(dbPath))
	defer recovered.db.Close()

	if len(recovered.Chains[proposer["publicKey"]]) != 6 {
		t.Fatalf("expected recovered proposer chain length 6, got %d", len(recovered.Chains[proposer["publicKey"]]))
	}
	if len(recovered.Chains[voter["publicKey"]]) != 2 {
		t.Fatalf("expected recovered voter chain length 2, got %d", len(recovered.Chains[voter["publicKey"]]))
	}
	proposalMap, ok := recovered.Proposals[proposal.Hash].(map[string]interface{})
	if !ok {
		t.Fatalf("expected recovered proposal to exist")
	}
	if proposalMap["status"] != "Passed" {
		t.Fatalf("expected recovered proposal status Passed, got %v", proposalMap["status"])
	}
	if _, ok := recovered.Votes[proposal.Hash][voter["publicKey"]]; !ok {
		t.Fatalf("expected recovered vote to be preserved")
	}
	swap := recovered.Swaps[secretHash]
	if swap == nil || swap.Status != "CLAIMED" {
		t.Fatalf("expected recovered swap to be CLAIMED, got %+v", swap)
	}
	anchor, ok := recovered.Anchors[manifest.Hash]
	if !ok {
		t.Fatalf("expected recovered manifest anchor to exist")
	}
	anchorMap := anchor.(map[string]interface{})
	if anchorMap["type"] != "publish_manifest" {
		t.Fatalf("expected recovered manifest anchor type publish_manifest, got %v", anchorMap["type"])
	}
}

func TestRecoveryReplaysSameTimestampGovernanceSwapAndNftLedgerFromSQLite(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "same-timestamp-governance-swap-nft.sqlite")
	keys := deriveDescendingKeypairs("semantic parity same timestamp governance swap nft", 2)
	proposer := keys[0]
	voter := keys[1]
	if proposer["publicKey"] <= voter["publicKey"] {
		t.Fatalf("expected proposer account ordering to sort after voter")
	}
	secret := "go-same-timestamp-nft-swap-secret"
	secretHash := Hash(secret)
	base := int64(200000)

	mgr := NewDBManager(dbPath)
	l := NewLattice(mgr)

	genesis := &Block{
		Type:          "open",
		Account:       proposer["publicKey"],
		Previous:      nil,
		Balance:       1000,
		StakedBalance: 0,
		Height:        0,
		Link:          "SYSTEM_GENESIS",
		Timestamp:     base - 3000,
	}
	signTestBlock(t, genesis, proposer["privateKey"])
	if err := l.ProcessBlock(genesis, false); err != nil {
		t.Fatalf("expected proposer genesis persistence to succeed, got %v", err)
	}

	sendToVoter := &Block{
		Type:          "send",
		Account:       proposer["publicKey"],
		Previous:      &genesis.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base-2000) - 200,
		StakedBalance: 0,
		Height:        1,
		Link:          voter["publicKey"],
		Spora:         validSpora(genesis.Hash),
		Timestamp:     base - 2000,
	}
	signTestBlock(t, sendToVoter, proposer["privateKey"])
	if err := l.ProcessBlock(sendToVoter, false); err != nil {
		t.Fatalf("expected sendToVoter persistence to succeed, got %v", err)
	}

	openVoter := &Block{
		Type:          "open",
		Account:       voter["publicKey"],
		Previous:      nil,
		Balance:       200,
		StakedBalance: 0,
		Height:        0,
		Link:          sendToVoter.Hash,
		Spora:         validSporaForOpenAccount(voter["publicKey"]),
		Timestamp:     base - 1000,
	}
	signTestBlock(t, openVoter, voter["privateKey"])
	if err := l.ProcessBlock(openVoter, false); err != nil {
		t.Fatalf("expected openVoter persistence to succeed, got %v", err)
	}

	proposal := &Block{
		Type:          "proposal",
		Account:       proposer["publicKey"],
		Previous:      &sendToVoter.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 10,
		StakedBalance: 0,
		Height:        2,
		Link:          "DAO_PROPOSAL",
		Spora:         validSpora(sendToVoter.Hash),
		Payload: map[string]interface{}{
			"title":   "Same timestamp governance, swap, and NFT ledger",
			"endTime": time.UnixMilli(base + 1000).Format(time.RFC3339),
		},
		Timestamp: base,
	}
	signTestBlock(t, proposal, proposer["privateKey"])
	if err := l.ProcessBlock(proposal, false); err != nil {
		t.Fatalf("expected proposal persistence to succeed, got %v", err)
	}

	vote := &Block{
		Type:          "vote",
		Account:       voter["publicKey"],
		Previous:      &openVoter.Hash,
		Balance:       l.GetBalance(voter["publicKey"], base),
		StakedBalance: 0,
		Height:        1,
		Link:          proposal.Hash,
		Spora:         validSpora(openVoter.Hash),
		Payload:       map[string]interface{}{"vote": "FOR"},
		Timestamp:     base,
	}
	signTestBlock(t, vote, voter["privateKey"])
	if err := l.ProcessBlock(vote, false); err != nil {
		t.Fatalf("expected vote persistence to succeed, got %v", err)
	}

	mintNft := &Block{
		Type:          "mint_nft",
		Account:       proposer["publicKey"],
		Previous:      &proposal.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 50,
		StakedBalance: 0,
		Height:        3,
		Link:          "NFT_MINT",
		Spora:         validSpora(proposal.Hash),
		Payload: map[string]interface{}{
			"name":        "Go Same Timestamp Artifact",
			"magnet":      "magnet:?xt=urn:btih:go-same-timestamp-nft",
			"description": "same timestamp mixed-feature NFT",
		},
		Timestamp: base,
	}
	signTestBlock(t, mintNft, proposer["privateKey"])
	if err := l.ProcessBlock(mintNft, false); err != nil {
		t.Fatalf("expected mintNft persistence to succeed, got %v", err)
	}

	transferNft := &Block{
		Type:          "transfer_nft",
		Account:       proposer["publicKey"],
		Previous:      &mintNft.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 1,
		StakedBalance: 0,
		Height:        4,
		Link:          mintNft.Hash,
		Spora:         validSpora(mintNft.Hash),
		Payload: map[string]interface{}{
			"recipient": voter["publicKey"],
		},
		Timestamp: base,
	}
	signTestBlock(t, transferNft, proposer["privateKey"])
	if err := l.ProcessBlock(transferNft, false); err != nil {
		t.Fatalf("expected transferNft persistence to succeed, got %v", err)
	}

	swapLock := &Block{
		Type:          "swap_lock",
		Account:       proposer["publicKey"],
		Previous:      &transferNft.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 75,
		StakedBalance: 0,
		Height:        5,
		Link:          "HTLC_LOCK",
		Spora:         validSpora(transferNft.Hash),
		Payload: map[string]interface{}{
			"secretHash": secretHash,
			"recipient":  proposer["publicKey"],
		},
		Timestamp: base,
	}
	signTestBlock(t, swapLock, proposer["privateKey"])
	if err := l.ProcessBlock(swapLock, false); err != nil {
		t.Fatalf("expected swapLock persistence to succeed, got %v", err)
	}

	swapClaim := &Block{
		Type:          "swap_claim",
		Account:       proposer["publicKey"],
		Previous:      &swapLock.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base+500) + l.Swaps[secretHash].Amount,
		StakedBalance: 0,
		Height:        6,
		Link:          "HTLC_CLAIM",
		Spora:         validSpora(swapLock.Hash),
		Payload: map[string]interface{}{
			"secret":     secret,
			"secretHash": secretHash,
		},
		Timestamp: base + 500,
	}
	signTestBlock(t, swapClaim, proposer["privateKey"])
	if err := l.ProcessBlock(swapClaim, false); err != nil {
		t.Fatalf("expected swapClaim persistence to succeed, got %v", err)
	}

	anchorBlock := &Block{
		Type:          "data_anchor",
		Account:       proposer["publicKey"],
		Previous:      &swapClaim.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base+2000) - 1,
		StakedBalance: 0,
		Height:        7,
		Link:          "DATA_ANCHOR",
		Spora:         validSpora(swapClaim.Hash),
		Payload: map[string]interface{}{
			"magnet": "magnet:?xt=urn:btih:go-same-timestamp-nft-finalizer",
			"name":   "go-same-timestamp-nft-finalizer.bin",
			"size":   1,
		},
		Timestamp: base + 2000,
	}
	signTestBlock(t, anchorBlock, proposer["privateKey"])
	if err := l.ProcessBlock(anchorBlock, false); err != nil {
		t.Fatalf("expected anchorBlock persistence to succeed, got %v", err)
	}

	if err := mgr.Close(); err != nil {
		t.Fatalf("failed to close db manager before same-timestamp mixed nft recovery test: %v", err)
	}

	recovered := NewLattice(NewDBManager(dbPath))
	defer recovered.db.Close()

	if len(recovered.Chains[proposer["publicKey"]]) != 8 {
		t.Fatalf("expected recovered proposer chain length 8, got %d", len(recovered.Chains[proposer["publicKey"]]))
	}
	if len(recovered.Chains[voter["publicKey"]]) != 2 {
		t.Fatalf("expected recovered voter chain length 2, got %d", len(recovered.Chains[voter["publicKey"]]))
	}
	proposalMap, ok := recovered.Proposals[proposal.Hash].(map[string]interface{})
	if !ok {
		t.Fatalf("expected recovered proposal to exist")
	}
	if proposalMap["status"] != "Passed" {
		t.Fatalf("expected recovered proposal status Passed, got %v", proposalMap["status"])
	}
	if _, ok := recovered.Votes[proposal.Hash][voter["publicKey"]]; !ok {
		t.Fatalf("expected recovered vote to be preserved")
	}
	swap := recovered.Swaps[secretHash]
	if swap == nil || swap.Status != "CLAIMED" {
		t.Fatalf("expected recovered swap to be CLAIMED, got %+v", swap)
	}
	nft, ok := recovered.Nfts[mintNft.Hash]
	if !ok {
		t.Fatalf("expected recovered NFT to exist")
	}
	nftMap := nft.(map[string]interface{})
	if nftMap["owner"] != voter["publicKey"] {
		t.Fatalf("expected recovered NFT owner %q, got %v", voter["publicKey"], nftMap["owner"])
	}
	anchor, ok := recovered.Anchors[anchorBlock.Hash]
	if !ok {
		t.Fatalf("expected recovered data anchor to exist")
	}
	anchorMap := anchor.(map[string]interface{})
	if anchorMap["type"] != "data_anchor" {
		t.Fatalf("expected recovered anchor type data_anchor, got %v", anchorMap["type"])
	}
}

func TestRecoveryReplaysSameTimestampGovernanceSwapNftAndManifestLedgerFromSQLite(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "same-timestamp-governance-swap-nft-manifest.sqlite")
	keys := deriveDescendingKeypairs("semantic parity same timestamp governance swap nft manifest", 2)
	proposer := keys[0]
	voter := keys[1]
	if proposer["publicKey"] <= voter["publicKey"] {
		t.Fatalf("expected proposer account ordering to sort after voter")
	}
	secret := "go-same-timestamp-manifest-secret"
	secretHash := Hash(secret)
	base := int64(300000)

	mgr := NewDBManager(dbPath)
	l := NewLattice(mgr)

	genesis := &Block{
		Type:          "open",
		Account:       proposer["publicKey"],
		Previous:      nil,
		Balance:       1000,
		StakedBalance: 0,
		Height:        0,
		Link:          "SYSTEM_GENESIS",
		Timestamp:     base - 3000,
	}
	signTestBlock(t, genesis, proposer["privateKey"])
	if err := l.ProcessBlock(genesis, false); err != nil {
		t.Fatalf("expected proposer genesis persistence to succeed, got %v", err)
	}

	sendToVoter := &Block{
		Type:          "send",
		Account:       proposer["publicKey"],
		Previous:      &genesis.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base-2000) - 200,
		StakedBalance: 0,
		Height:        1,
		Link:          voter["publicKey"],
		Spora:         validSpora(genesis.Hash),
		Timestamp:     base - 2000,
	}
	signTestBlock(t, sendToVoter, proposer["privateKey"])
	if err := l.ProcessBlock(sendToVoter, false); err != nil {
		t.Fatalf("expected sendToVoter persistence to succeed, got %v", err)
	}

	openVoter := &Block{
		Type:          "open",
		Account:       voter["publicKey"],
		Previous:      nil,
		Balance:       200,
		StakedBalance: 0,
		Height:        0,
		Link:          sendToVoter.Hash,
		Spora:         validSporaForOpenAccount(voter["publicKey"]),
		Timestamp:     base - 1000,
	}
	signTestBlock(t, openVoter, voter["privateKey"])
	if err := l.ProcessBlock(openVoter, false); err != nil {
		t.Fatalf("expected openVoter persistence to succeed, got %v", err)
	}

	proposal := &Block{
		Type:          "proposal",
		Account:       proposer["publicKey"],
		Previous:      &sendToVoter.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 10,
		StakedBalance: 0,
		Height:        2,
		Link:          "DAO_PROPOSAL",
		Spora:         validSpora(sendToVoter.Hash),
		Payload: map[string]interface{}{
			"title":   "Same timestamp governance, swap, NFT, and manifest ledger",
			"endTime": time.UnixMilli(base + 1000).Format(time.RFC3339),
		},
		Timestamp: base,
	}
	signTestBlock(t, proposal, proposer["privateKey"])
	if err := l.ProcessBlock(proposal, false); err != nil {
		t.Fatalf("expected proposal persistence to succeed, got %v", err)
	}

	vote := &Block{
		Type:          "vote",
		Account:       voter["publicKey"],
		Previous:      &openVoter.Hash,
		Balance:       l.GetBalance(voter["publicKey"], base),
		StakedBalance: 0,
		Height:        1,
		Link:          proposal.Hash,
		Spora:         validSpora(openVoter.Hash),
		Payload:       map[string]interface{}{"vote": "FOR"},
		Timestamp:     base,
	}
	signTestBlock(t, vote, voter["privateKey"])
	if err := l.ProcessBlock(vote, false); err != nil {
		t.Fatalf("expected vote persistence to succeed, got %v", err)
	}

	mintNft := &Block{
		Type:          "mint_nft",
		Account:       proposer["publicKey"],
		Previous:      &proposal.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 50,
		StakedBalance: 0,
		Height:        3,
		Link:          "NFT_MINT",
		Spora:         validSpora(proposal.Hash),
		Payload: map[string]interface{}{
			"name":        "Go Same Timestamp Manifest Artifact",
			"magnet":      "magnet:?xt=urn:btih:go-same-timestamp-manifest-nft",
			"description": "same timestamp mixed-feature manifest NFT",
		},
		Timestamp: base,
	}
	signTestBlock(t, mintNft, proposer["privateKey"])
	if err := l.ProcessBlock(mintNft, false); err != nil {
		t.Fatalf("expected mintNft persistence to succeed, got %v", err)
	}

	transferNft := &Block{
		Type:          "transfer_nft",
		Account:       proposer["publicKey"],
		Previous:      &mintNft.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 1,
		StakedBalance: 0,
		Height:        4,
		Link:          mintNft.Hash,
		Spora:         validSpora(mintNft.Hash),
		Payload: map[string]interface{}{
			"recipient": voter["publicKey"],
		},
		Timestamp: base,
	}
	signTestBlock(t, transferNft, proposer["privateKey"])
	if err := l.ProcessBlock(transferNft, false); err != nil {
		t.Fatalf("expected transferNft persistence to succeed, got %v", err)
	}

	swapLock := &Block{
		Type:          "swap_lock",
		Account:       proposer["publicKey"],
		Previous:      &transferNft.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 75,
		StakedBalance: 0,
		Height:        5,
		Link:          "HTLC_LOCK",
		Spora:         validSpora(transferNft.Hash),
		Payload: map[string]interface{}{
			"secretHash": secretHash,
			"recipient":  proposer["publicKey"],
		},
		Timestamp: base,
	}
	signTestBlock(t, swapLock, proposer["privateKey"])
	if err := l.ProcessBlock(swapLock, false); err != nil {
		t.Fatalf("expected swapLock persistence to succeed, got %v", err)
	}

	swapClaim := &Block{
		Type:          "swap_claim",
		Account:       proposer["publicKey"],
		Previous:      &swapLock.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base+500) + l.Swaps[secretHash].Amount,
		StakedBalance: 0,
		Height:        6,
		Link:          "HTLC_CLAIM",
		Spora:         validSpora(swapLock.Hash),
		Payload: map[string]interface{}{
			"secret":     secret,
			"secretHash": secretHash,
		},
		Timestamp: base + 500,
	}
	signTestBlock(t, swapClaim, proposer["privateKey"])
	if err := l.ProcessBlock(swapClaim, false); err != nil {
		t.Fatalf("expected swapClaim persistence to succeed, got %v", err)
	}

	manifest := &Block{
		Type:          "publish_manifest",
		Account:       proposer["publicKey"],
		Previous:      &swapClaim.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base+1500),
		StakedBalance: 0,
		Height:        7,
		Link:          "go-same-timestamp-nft-manifest",
		Spora:         validSpora(swapClaim.Hash),
		Payload: map[string]interface{}{
			"manifestId":  "go-same-timestamp-nft-manifest",
			"locator":     "bobtorrent://manifest/go-same-timestamp-nft-manifest",
			"manifestUrl": "http://localhost:8000/manifests/go-same-timestamp-nft-manifest",
			"name":        "go-same-timestamp-nft-manifest.json",
		},
		Timestamp: base + 1500,
	}
	signTestBlock(t, manifest, proposer["privateKey"])
	if err := l.ProcessBlock(manifest, false); err != nil {
		t.Fatalf("expected manifest persistence to succeed, got %v", err)
	}

	anchorBlock := &Block{
		Type:          "data_anchor",
		Account:       proposer["publicKey"],
		Previous:      &manifest.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base+2000) - 1,
		StakedBalance: 0,
		Height:        8,
		Link:          "DATA_ANCHOR",
		Spora:         validSpora(manifest.Hash),
		Payload: map[string]interface{}{
			"magnet": "magnet:?xt=urn:btih:go-same-timestamp-manifest-finalizer",
			"name":   "go-same-timestamp-manifest-finalizer.bin",
			"size":   1,
		},
		Timestamp: base + 2000,
	}
	signTestBlock(t, anchorBlock, proposer["privateKey"])
	if err := l.ProcessBlock(anchorBlock, false); err != nil {
		t.Fatalf("expected anchorBlock persistence to succeed, got %v", err)
	}

	if err := mgr.Close(); err != nil {
		t.Fatalf("failed to close db manager before same-timestamp mixed manifest recovery test: %v", err)
	}

	recovered := NewLattice(NewDBManager(dbPath))
	defer recovered.db.Close()

	if len(recovered.Chains[proposer["publicKey"]]) != 9 {
		t.Fatalf("expected recovered proposer chain length 9, got %d", len(recovered.Chains[proposer["publicKey"]]))
	}
	if len(recovered.Chains[voter["publicKey"]]) != 2 {
		t.Fatalf("expected recovered voter chain length 2, got %d", len(recovered.Chains[voter["publicKey"]]))
	}
	proposalMap, ok := recovered.Proposals[proposal.Hash].(map[string]interface{})
	if !ok {
		t.Fatalf("expected recovered proposal to exist")
	}
	if proposalMap["status"] != "Passed" {
		t.Fatalf("expected recovered proposal status Passed, got %v", proposalMap["status"])
	}
	if _, ok := recovered.Votes[proposal.Hash][voter["publicKey"]]; !ok {
		t.Fatalf("expected recovered vote to be preserved")
	}
	swap := recovered.Swaps[secretHash]
	if swap == nil || swap.Status != "CLAIMED" {
		t.Fatalf("expected recovered swap to be CLAIMED, got %+v", swap)
	}
	nft, ok := recovered.Nfts[mintNft.Hash]
	if !ok {
		t.Fatalf("expected recovered NFT to exist")
	}
	nftMap := nft.(map[string]interface{})
	if nftMap["owner"] != voter["publicKey"] {
		t.Fatalf("expected recovered NFT owner %q, got %v", voter["publicKey"], nftMap["owner"])
	}
	manifestAnchor, ok := recovered.Anchors[manifest.Hash]
	if !ok {
		t.Fatalf("expected recovered manifest anchor to exist")
	}
	manifestAnchorMap := manifestAnchor.(map[string]interface{})
	if manifestAnchorMap["type"] != "publish_manifest" {
		t.Fatalf("expected recovered manifest anchor type publish_manifest, got %v", manifestAnchorMap["type"])
	}
	anchor, ok := recovered.Anchors[anchorBlock.Hash]
	if !ok {
		t.Fatalf("expected recovered data anchor to exist")
	}
	anchorMap := anchor.(map[string]interface{})
	if anchorMap["type"] != "data_anchor" {
		t.Fatalf("expected recovered anchor type data_anchor, got %v", anchorMap["type"])
	}
}

func TestRecoveryReplaysMultiAccountSameTimestampMixedLedgerFromSQLite(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "multi-account-same-timestamp.sqlite")
	keys := deriveDescendingKeypairs("semantic parity multi account same timestamp", 3)
	proposer := keys[0]
	voter := keys[1]
	collector := keys[2]
	if !(proposer["publicKey"] > voter["publicKey"] && voter["publicKey"] > collector["publicKey"]) {
		t.Fatalf("expected descending account ordering for hostile replay")
	}
	secret := "go-multi-account-same-timestamp-secret"
	secretHash := Hash(secret)
	base := int64(400000)

	mgr := NewDBManager(dbPath)
	l := NewLattice(mgr)

	genesis := &Block{
		Type:          "open",
		Account:       proposer["publicKey"],
		Previous:      nil,
		Balance:       1000,
		StakedBalance: 0,
		Height:        0,
		Link:          "SYSTEM_GENESIS",
		Timestamp:     base - 5000,
	}
	signTestBlock(t, genesis, proposer["privateKey"])
	if err := l.ProcessBlock(genesis, false); err != nil {
		t.Fatalf("expected proposer genesis persistence to succeed, got %v", err)
	}

	sendToVoter := &Block{
		Type:          "send",
		Account:       proposer["publicKey"],
		Previous:      &genesis.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base-4000) - 200,
		StakedBalance: 0,
		Height:        1,
		Link:          voter["publicKey"],
		Spora:         validSpora(genesis.Hash),
		Timestamp:     base - 4000,
	}
	signTestBlock(t, sendToVoter, proposer["privateKey"])
	if err := l.ProcessBlock(sendToVoter, false); err != nil {
		t.Fatalf("expected sendToVoter persistence to succeed, got %v", err)
	}

	openVoter := &Block{
		Type:          "open",
		Account:       voter["publicKey"],
		Previous:      nil,
		Balance:       200,
		StakedBalance: 0,
		Height:        0,
		Link:          sendToVoter.Hash,
		Spora:         validSporaForOpenAccount(voter["publicKey"]),
		Timestamp:     base - 3500,
	}
	signTestBlock(t, openVoter, voter["privateKey"])
	if err := l.ProcessBlock(openVoter, false); err != nil {
		t.Fatalf("expected openVoter persistence to succeed, got %v", err)
	}

	sendToCollector := &Block{
		Type:          "send",
		Account:       proposer["publicKey"],
		Previous:      &sendToVoter.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base-3000) - 150,
		StakedBalance: 0,
		Height:        2,
		Link:          collector["publicKey"],
		Spora:         validSpora(sendToVoter.Hash),
		Timestamp:     base - 3000,
	}
	signTestBlock(t, sendToCollector, proposer["privateKey"])
	if err := l.ProcessBlock(sendToCollector, false); err != nil {
		t.Fatalf("expected sendToCollector persistence to succeed, got %v", err)
	}

	openCollector := &Block{
		Type:          "open",
		Account:       collector["publicKey"],
		Previous:      nil,
		Balance:       150,
		StakedBalance: 0,
		Height:        0,
		Link:          sendToCollector.Hash,
		Spora:         validSporaForOpenAccount(collector["publicKey"]),
		Timestamp:     base - 2500,
	}
	signTestBlock(t, openCollector, collector["privateKey"])
	if err := l.ProcessBlock(openCollector, false); err != nil {
		t.Fatalf("expected openCollector persistence to succeed, got %v", err)
	}

	proposal := &Block{
		Type:          "proposal",
		Account:       proposer["publicKey"],
		Previous:      &sendToCollector.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 10,
		StakedBalance: 0,
		Height:        3,
		Link:          "DAO_PROPOSAL",
		Spora:         validSpora(sendToCollector.Hash),
		Payload: map[string]interface{}{
			"title":   "Multi-account same-timestamp mixed ledger",
			"endTime": time.UnixMilli(base + 1000).Format(time.RFC3339),
		},
		Timestamp: base,
	}
	signTestBlock(t, proposal, proposer["privateKey"])
	if err := l.ProcessBlock(proposal, false); err != nil {
		t.Fatalf("expected proposal persistence to succeed, got %v", err)
	}

	vote := &Block{
		Type:          "vote",
		Account:       voter["publicKey"],
		Previous:      &openVoter.Hash,
		Balance:       l.GetBalance(voter["publicKey"], base),
		StakedBalance: 0,
		Height:        1,
		Link:          proposal.Hash,
		Spora:         validSpora(openVoter.Hash),
		Payload:       map[string]interface{}{"vote": "FOR"},
		Timestamp:     base,
	}
	signTestBlock(t, vote, voter["privateKey"])
	if err := l.ProcessBlock(vote, false); err != nil {
		t.Fatalf("expected vote persistence to succeed, got %v", err)
	}

	marketBid := &Block{
		Type:          "market_bid",
		Account:       collector["publicKey"],
		Previous:      &openCollector.Hash,
		Balance:       l.GetBalance(collector["publicKey"], base) - 25,
		StakedBalance: 0,
		Height:        1,
		Link:          "STORAGE_MARKET",
		Spora:         validSpora(openCollector.Hash),
		Payload:       map[string]interface{}{"magnet": "magnet:?xt=urn:btih:go-multi-account-bid"},
		Timestamp:     base,
	}
	signTestBlock(t, marketBid, collector["privateKey"])
	if err := l.ProcessBlock(marketBid, false); err != nil {
		t.Fatalf("expected marketBid persistence to succeed, got %v", err)
	}

	mintNft := &Block{
		Type:          "mint_nft",
		Account:       proposer["publicKey"],
		Previous:      &proposal.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 50,
		StakedBalance: 0,
		Height:        4,
		Link:          "NFT_MINT",
		Spora:         validSpora(proposal.Hash),
		Payload: map[string]interface{}{
			"name":        "Go Multi Account Artifact",
			"magnet":      "magnet:?xt=urn:btih:go-multi-account-nft",
			"description": "multi-account same timestamp NFT",
		},
		Timestamp: base,
	}
	signTestBlock(t, mintNft, proposer["privateKey"])
	if err := l.ProcessBlock(mintNft, false); err != nil {
		t.Fatalf("expected mintNft persistence to succeed, got %v", err)
	}

	transferNft := &Block{
		Type:          "transfer_nft",
		Account:       proposer["publicKey"],
		Previous:      &mintNft.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 1,
		StakedBalance: 0,
		Height:        5,
		Link:          mintNft.Hash,
		Spora:         validSpora(mintNft.Hash),
		Payload: map[string]interface{}{
			"recipient": collector["publicKey"],
		},
		Timestamp: base,
	}
	signTestBlock(t, transferNft, proposer["privateKey"])
	if err := l.ProcessBlock(transferNft, false); err != nil {
		t.Fatalf("expected transferNft persistence to succeed, got %v", err)
	}

	swapLock := &Block{
		Type:          "swap_lock",
		Account:       proposer["publicKey"],
		Previous:      &transferNft.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 75,
		StakedBalance: 0,
		Height:        6,
		Link:          "HTLC_LOCK",
		Spora:         validSpora(transferNft.Hash),
		Payload: map[string]interface{}{
			"secretHash": secretHash,
			"recipient":  proposer["publicKey"],
		},
		Timestamp: base,
	}
	signTestBlock(t, swapLock, proposer["privateKey"])
	if err := l.ProcessBlock(swapLock, false); err != nil {
		t.Fatalf("expected swapLock persistence to succeed, got %v", err)
	}

	manifest := &Block{
		Type:          "publish_manifest",
		Account:       proposer["publicKey"],
		Previous:      &swapLock.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base),
		StakedBalance: 0,
		Height:        7,
		Link:          "go-multi-account-manifest",
		Spora:         validSpora(swapLock.Hash),
		Payload: map[string]interface{}{
			"manifestId":  "go-multi-account-manifest",
			"locator":     "bobtorrent://manifest/go-multi-account",
			"manifestUrl": "http://localhost:8000/manifests/go-multi-account",
			"name":        "go-multi-account-manifest.json",
		},
		Timestamp: base,
	}
	signTestBlock(t, manifest, proposer["privateKey"])
	if err := l.ProcessBlock(manifest, false); err != nil {
		t.Fatalf("expected manifest persistence to succeed, got %v", err)
	}

	swapClaim := &Block{
		Type:          "swap_claim",
		Account:       proposer["publicKey"],
		Previous:      &manifest.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base+500) + l.Swaps[secretHash].Amount,
		StakedBalance: 0,
		Height:        8,
		Link:          "HTLC_CLAIM",
		Spora:         validSpora(manifest.Hash),
		Payload: map[string]interface{}{
			"secret":     secret,
			"secretHash": secretHash,
		},
		Timestamp: base + 500,
	}
	signTestBlock(t, swapClaim, proposer["privateKey"])
	if err := l.ProcessBlock(swapClaim, false); err != nil {
		t.Fatalf("expected swapClaim persistence to succeed, got %v", err)
	}

	acceptBid := &Block{
		Type:          "accept_bid",
		Account:       proposer["publicKey"],
		Previous:      &swapClaim.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base+1500) + l.MarketBids[marketBid.Hash].(map[string]interface{})["amount"].(float64),
		StakedBalance: 0,
		Height:        9,
		Link:          marketBid.Hash,
		Spora:         validSpora(swapClaim.Hash),
		Timestamp:     base + 1500,
	}
	signTestBlock(t, acceptBid, proposer["privateKey"])
	if err := l.ProcessBlock(acceptBid, false); err != nil {
		t.Fatalf("expected acceptBid persistence to succeed, got %v", err)
	}

	anchorBlock := &Block{
		Type:          "data_anchor",
		Account:       proposer["publicKey"],
		Previous:      &acceptBid.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base+2000) - 1,
		StakedBalance: 0,
		Height:        10,
		Link:          "DATA_ANCHOR",
		Spora:         validSpora(acceptBid.Hash),
		Payload: map[string]interface{}{
			"magnet": "magnet:?xt=urn:btih:go-multi-account-finalizer",
			"name":   "go-multi-account-finalizer.bin",
			"size":   1,
		},
		Timestamp: base + 2000,
	}
	signTestBlock(t, anchorBlock, proposer["privateKey"])
	if err := l.ProcessBlock(anchorBlock, false); err != nil {
		t.Fatalf("expected anchorBlock persistence to succeed, got %v", err)
	}

	if err := mgr.Close(); err != nil {
		t.Fatalf("failed to close db manager before multi-account same-timestamp recovery test: %v", err)
	}

	recovered := NewLattice(NewDBManager(dbPath))
	defer recovered.db.Close()

	if len(recovered.Chains[proposer["publicKey"]]) != 11 {
		t.Fatalf("expected recovered proposer chain length 11, got %d", len(recovered.Chains[proposer["publicKey"]]))
	}
	if len(recovered.Chains[voter["publicKey"]]) != 2 {
		t.Fatalf("expected recovered voter chain length 2, got %d", len(recovered.Chains[voter["publicKey"]]))
	}
	if len(recovered.Chains[collector["publicKey"]]) != 2 {
		t.Fatalf("expected recovered collector chain length 2, got %d", len(recovered.Chains[collector["publicKey"]]))
	}
	proposalMap, ok := recovered.Proposals[proposal.Hash].(map[string]interface{})
	if !ok {
		t.Fatalf("expected recovered proposal to exist")
	}
	if proposalMap["status"] != "Passed" {
		t.Fatalf("expected recovered proposal status Passed, got %v", proposalMap["status"])
	}
	if _, ok := recovered.Votes[proposal.Hash][voter["publicKey"]]; !ok {
		t.Fatalf("expected recovered vote to be preserved")
	}
	swap := recovered.Swaps[secretHash]
	if swap == nil || swap.Status != "CLAIMED" {
		t.Fatalf("expected recovered swap to be CLAIMED, got %+v", swap)
	}
	nft, ok := recovered.Nfts[mintNft.Hash]
	if !ok {
		t.Fatalf("expected recovered NFT to exist")
	}
	nftMap := nft.(map[string]interface{})
	if nftMap["owner"] != collector["publicKey"] {
		t.Fatalf("expected recovered NFT owner %q, got %v", collector["publicKey"], nftMap["owner"])
	}
	bid, ok := recovered.MarketBids[marketBid.Hash].(map[string]interface{})
	if !ok {
		t.Fatalf("expected recovered market bid to exist")
	}
	if bid["status"] != "ACCEPTED" {
		t.Fatalf("expected recovered market bid status ACCEPTED, got %v", bid["status"])
	}
	if bid["acceptedBy"] != proposer["publicKey"] {
		t.Fatalf("expected recovered acceptedBy %q, got %v", proposer["publicKey"], bid["acceptedBy"])
	}
	manifestAnchor, ok := recovered.Anchors[manifest.Hash]
	if !ok {
		t.Fatalf("expected recovered manifest anchor to exist")
	}
	manifestAnchorMap := manifestAnchor.(map[string]interface{})
	if manifestAnchorMap["type"] != "publish_manifest" {
		t.Fatalf("expected recovered manifest anchor type publish_manifest, got %v", manifestAnchorMap["type"])
	}
	anchor, ok := recovered.Anchors[anchorBlock.Hash]
	if !ok {
		t.Fatalf("expected recovered data anchor to exist")
	}
	anchorMap := anchor.(map[string]interface{})
	if anchorMap["type"] != "data_anchor" {
		t.Fatalf("expected recovered anchor type data_anchor, got %v", anchorMap["type"])
	}
}

func TestRecoveryReplaysMultiAccountSameTimestampDualCollectorActionsFromSQLite(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "multi-account-dual-collector-actions.sqlite")
	keys := deriveDescendingKeypairs("semantic parity dual collector same timestamp", 3)
	proposer := keys[0]
	voter := keys[1]
	collector := keys[2]
	if !(proposer["publicKey"] > voter["publicKey"] && voter["publicKey"] > collector["publicKey"]) {
		t.Fatalf("expected descending account ordering for hostile replay")
	}
	secret := "go-dual-collector-same-timestamp-secret"
	secretHash := Hash(secret)
	base := int64(450000)

	mgr := NewDBManager(dbPath)
	l := NewLattice(mgr)

	genesis := &Block{
		Type:          "open",
		Account:       proposer["publicKey"],
		Previous:      nil,
		Balance:       1000,
		StakedBalance: 0,
		Height:        0,
		Link:          "SYSTEM_GENESIS",
		Timestamp:     base - 5000,
	}
	signTestBlock(t, genesis, proposer["privateKey"])
	if err := l.ProcessBlock(genesis, false); err != nil {
		t.Fatalf("expected proposer genesis persistence to succeed, got %v", err)
	}

	sendToVoter := &Block{
		Type:          "send",
		Account:       proposer["publicKey"],
		Previous:      &genesis.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base-4000) - 200,
		StakedBalance: 0,
		Height:        1,
		Link:          voter["publicKey"],
		Spora:         validSpora(genesis.Hash),
		Timestamp:     base - 4000,
	}
	signTestBlock(t, sendToVoter, proposer["privateKey"])
	if err := l.ProcessBlock(sendToVoter, false); err != nil {
		t.Fatalf("expected sendToVoter persistence to succeed, got %v", err)
	}

	openVoter := &Block{
		Type:          "open",
		Account:       voter["publicKey"],
		Previous:      nil,
		Balance:       200,
		StakedBalance: 0,
		Height:        0,
		Link:          sendToVoter.Hash,
		Spora:         validSporaForOpenAccount(voter["publicKey"]),
		Timestamp:     base - 3500,
	}
	signTestBlock(t, openVoter, voter["privateKey"])
	if err := l.ProcessBlock(openVoter, false); err != nil {
		t.Fatalf("expected openVoter persistence to succeed, got %v", err)
	}

	sendToCollector := &Block{
		Type:          "send",
		Account:       proposer["publicKey"],
		Previous:      &sendToVoter.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base-3000) - 150,
		StakedBalance: 0,
		Height:        2,
		Link:          collector["publicKey"],
		Spora:         validSpora(sendToVoter.Hash),
		Timestamp:     base - 3000,
	}
	signTestBlock(t, sendToCollector, proposer["privateKey"])
	if err := l.ProcessBlock(sendToCollector, false); err != nil {
		t.Fatalf("expected sendToCollector persistence to succeed, got %v", err)
	}

	openCollector := &Block{
		Type:          "open",
		Account:       collector["publicKey"],
		Previous:      nil,
		Balance:       150,
		StakedBalance: 0,
		Height:        0,
		Link:          sendToCollector.Hash,
		Spora:         validSporaForOpenAccount(collector["publicKey"]),
		Timestamp:     base - 2500,
	}
	signTestBlock(t, openCollector, collector["privateKey"])
	if err := l.ProcessBlock(openCollector, false); err != nil {
		t.Fatalf("expected openCollector persistence to succeed, got %v", err)
	}

	proposal := &Block{
		Type:          "proposal",
		Account:       proposer["publicKey"],
		Previous:      &sendToCollector.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 10,
		StakedBalance: 0,
		Height:        3,
		Link:          "DAO_PROPOSAL",
		Spora:         validSpora(sendToCollector.Hash),
		Payload: map[string]interface{}{
			"title":   "Multi-account same-timestamp dual collector actions ledger",
			"endTime": time.UnixMilli(base + 1000).Format(time.RFC3339),
		},
		Timestamp: base,
	}
	signTestBlock(t, proposal, proposer["privateKey"])
	if err := l.ProcessBlock(proposal, false); err != nil {
		t.Fatalf("expected proposal persistence to succeed, got %v", err)
	}

	voterVote := &Block{
		Type:          "vote",
		Account:       voter["publicKey"],
		Previous:      &openVoter.Hash,
		Balance:       l.GetBalance(voter["publicKey"], base),
		StakedBalance: 0,
		Height:        1,
		Link:          proposal.Hash,
		Spora:         validSpora(openVoter.Hash),
		Payload:       map[string]interface{}{"vote": "FOR"},
		Timestamp:     base,
	}
	signTestBlock(t, voterVote, voter["privateKey"])
	if err := l.ProcessBlock(voterVote, false); err != nil {
		t.Fatalf("expected voterVote persistence to succeed, got %v", err)
	}

	collectorVote := &Block{
		Type:          "vote",
		Account:       collector["publicKey"],
		Previous:      &openCollector.Hash,
		Balance:       l.GetBalance(collector["publicKey"], base),
		StakedBalance: 0,
		Height:        1,
		Link:          proposal.Hash,
		Spora:         validSpora(openCollector.Hash),
		Payload:       map[string]interface{}{"vote": "FOR"},
		Timestamp:     base,
	}
	signTestBlock(t, collectorVote, collector["privateKey"])
	if err := l.ProcessBlock(collectorVote, false); err != nil {
		t.Fatalf("expected collectorVote persistence to succeed, got %v", err)
	}

	marketBid := &Block{
		Type:          "market_bid",
		Account:       collector["publicKey"],
		Previous:      &collectorVote.Hash,
		Balance:       l.GetBalance(collector["publicKey"], base) - 25,
		StakedBalance: 0,
		Height:        2,
		Link:          "STORAGE_MARKET",
		Spora:         validSpora(collectorVote.Hash),
		Payload:       map[string]interface{}{"magnet": "magnet:?xt=urn:btih:go-dual-collector-bid"},
		Timestamp:     base,
	}
	signTestBlock(t, marketBid, collector["privateKey"])
	if err := l.ProcessBlock(marketBid, false); err != nil {
		t.Fatalf("expected marketBid persistence to succeed, got %v", err)
	}

	mintNft := &Block{
		Type:          "mint_nft",
		Account:       proposer["publicKey"],
		Previous:      &proposal.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 50,
		StakedBalance: 0,
		Height:        4,
		Link:          "NFT_MINT",
		Spora:         validSpora(proposal.Hash),
		Payload: map[string]interface{}{
			"name":        "Go Dual Collector Artifact",
			"magnet":      "magnet:?xt=urn:btih:go-dual-collector-nft",
			"description": "dual collector same timestamp NFT",
		},
		Timestamp: base,
	}
	signTestBlock(t, mintNft, proposer["privateKey"])
	if err := l.ProcessBlock(mintNft, false); err != nil {
		t.Fatalf("expected mintNft persistence to succeed, got %v", err)
	}

	transferNft := &Block{
		Type:          "transfer_nft",
		Account:       proposer["publicKey"],
		Previous:      &mintNft.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 1,
		StakedBalance: 0,
		Height:        5,
		Link:          mintNft.Hash,
		Spora:         validSpora(mintNft.Hash),
		Payload: map[string]interface{}{
			"recipient": collector["publicKey"],
		},
		Timestamp: base,
	}
	signTestBlock(t, transferNft, proposer["privateKey"])
	if err := l.ProcessBlock(transferNft, false); err != nil {
		t.Fatalf("expected transferNft persistence to succeed, got %v", err)
	}

	swapLock := &Block{
		Type:          "swap_lock",
		Account:       proposer["publicKey"],
		Previous:      &transferNft.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 75,
		StakedBalance: 0,
		Height:        6,
		Link:          "HTLC_LOCK",
		Spora:         validSpora(transferNft.Hash),
		Payload: map[string]interface{}{
			"secretHash": secretHash,
			"recipient":  proposer["publicKey"],
		},
		Timestamp: base,
	}
	signTestBlock(t, swapLock, proposer["privateKey"])
	if err := l.ProcessBlock(swapLock, false); err != nil {
		t.Fatalf("expected swapLock persistence to succeed, got %v", err)
	}

	manifest := &Block{
		Type:          "publish_manifest",
		Account:       proposer["publicKey"],
		Previous:      &swapLock.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base),
		StakedBalance: 0,
		Height:        7,
		Link:          "go-dual-collector-manifest",
		Spora:         validSpora(swapLock.Hash),
		Payload: map[string]interface{}{
			"manifestId":  "go-dual-collector-manifest",
			"locator":     "bobtorrent://manifest/go-dual-collector",
			"manifestUrl": "http://localhost:8000/manifests/go-dual-collector",
			"name":        "go-dual-collector-manifest.json",
		},
		Timestamp: base,
	}
	signTestBlock(t, manifest, proposer["privateKey"])
	if err := l.ProcessBlock(manifest, false); err != nil {
		t.Fatalf("expected manifest persistence to succeed, got %v", err)
	}

	swapClaim := &Block{
		Type:          "swap_claim",
		Account:       proposer["publicKey"],
		Previous:      &manifest.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base+500) + l.Swaps[secretHash].Amount,
		StakedBalance: 0,
		Height:        8,
		Link:          "HTLC_CLAIM",
		Spora:         validSpora(manifest.Hash),
		Payload: map[string]interface{}{
			"secret":     secret,
			"secretHash": secretHash,
		},
		Timestamp: base + 500,
	}
	signTestBlock(t, swapClaim, proposer["privateKey"])
	if err := l.ProcessBlock(swapClaim, false); err != nil {
		t.Fatalf("expected swapClaim persistence to succeed, got %v", err)
	}

	acceptBid := &Block{
		Type:          "accept_bid",
		Account:       proposer["publicKey"],
		Previous:      &swapClaim.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base+1500) + l.MarketBids[marketBid.Hash].(map[string]interface{})["amount"].(float64),
		StakedBalance: 0,
		Height:        9,
		Link:          marketBid.Hash,
		Spora:         validSpora(swapClaim.Hash),
		Timestamp:     base + 1500,
	}
	signTestBlock(t, acceptBid, proposer["privateKey"])
	if err := l.ProcessBlock(acceptBid, false); err != nil {
		t.Fatalf("expected acceptBid persistence to succeed, got %v", err)
	}

	anchorBlock := &Block{
		Type:          "data_anchor",
		Account:       proposer["publicKey"],
		Previous:      &acceptBid.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base+2000) - 1,
		StakedBalance: 0,
		Height:        10,
		Link:          "DATA_ANCHOR",
		Spora:         validSpora(acceptBid.Hash),
		Payload: map[string]interface{}{
			"magnet": "magnet:?xt=urn:btih:go-dual-collector-finalizer",
			"name":   "go-dual-collector-finalizer.bin",
			"size":   1,
		},
		Timestamp: base + 2000,
	}
	signTestBlock(t, anchorBlock, proposer["privateKey"])
	if err := l.ProcessBlock(anchorBlock, false); err != nil {
		t.Fatalf("expected anchorBlock persistence to succeed, got %v", err)
	}

	if err := mgr.Close(); err != nil {
		t.Fatalf("failed to close db manager before dual collector recovery test: %v", err)
	}

	recovered := NewLattice(NewDBManager(dbPath))
	defer recovered.db.Close()

	if len(recovered.Chains[proposer["publicKey"]]) != 11 {
		t.Fatalf("expected recovered proposer chain length 11, got %d", len(recovered.Chains[proposer["publicKey"]]))
	}
	if len(recovered.Chains[voter["publicKey"]]) != 2 {
		t.Fatalf("expected recovered voter chain length 2, got %d", len(recovered.Chains[voter["publicKey"]]))
	}
	if len(recovered.Chains[collector["publicKey"]]) != 3 {
		t.Fatalf("expected recovered collector chain length 3, got %d", len(recovered.Chains[collector["publicKey"]]))
	}
	proposalMap, ok := recovered.Proposals[proposal.Hash].(map[string]interface{})
	if !ok {
		t.Fatalf("expected recovered proposal to exist")
	}
	if proposalMap["status"] != "Passed" {
		t.Fatalf("expected recovered proposal status Passed, got %v", proposalMap["status"])
	}
	if _, ok := recovered.Votes[proposal.Hash][voter["publicKey"]]; !ok {
		t.Fatalf("expected recovered voter vote to be preserved")
	}
	if _, ok := recovered.Votes[proposal.Hash][collector["publicKey"]]; !ok {
		t.Fatalf("expected recovered collector vote to be preserved")
	}
	swap := recovered.Swaps[secretHash]
	if swap == nil || swap.Status != "CLAIMED" {
		t.Fatalf("expected recovered swap to be CLAIMED, got %+v", swap)
	}
	nft, ok := recovered.Nfts[mintNft.Hash]
	if !ok {
		t.Fatalf("expected recovered NFT to exist")
	}
	nftMap := nft.(map[string]interface{})
	if nftMap["owner"] != collector["publicKey"] {
		t.Fatalf("expected recovered NFT owner %q, got %v", collector["publicKey"], nftMap["owner"])
	}
	bid, ok := recovered.MarketBids[marketBid.Hash].(map[string]interface{})
	if !ok {
		t.Fatalf("expected recovered market bid to exist")
	}
	if bid["status"] != "ACCEPTED" {
		t.Fatalf("expected recovered market bid status ACCEPTED, got %v", bid["status"])
	}
	if bid["acceptedBy"] != proposer["publicKey"] {
		t.Fatalf("expected recovered acceptedBy %q, got %v", proposer["publicKey"], bid["acceptedBy"])
	}
	manifestAnchor, ok := recovered.Anchors[manifest.Hash]
	if !ok {
		t.Fatalf("expected recovered manifest anchor to exist")
	}
	manifestAnchorMap := manifestAnchor.(map[string]interface{})
	if manifestAnchorMap["type"] != "publish_manifest" {
		t.Fatalf("expected recovered manifest anchor type publish_manifest, got %v", manifestAnchorMap["type"])
	}
	anchor, ok := recovered.Anchors[anchorBlock.Hash]
	if !ok {
		t.Fatalf("expected recovered data anchor to exist")
	}
	anchorMap := anchor.(map[string]interface{})
	if anchorMap["type"] != "data_anchor" {
		t.Fatalf("expected recovered anchor type data_anchor, got %v", anchorMap["type"])
	}
}

func TestRecoveryRebuildsDemurrageSensitiveDualCollectorActionLedgerFromSQLite(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "demurrage-dual-collector-actions.sqlite")
	keys := deriveDescendingKeypairs("semantic parity demurrage dual collector same timestamp", 3)
	proposer := keys[0]
	voter := keys[1]
	collector := keys[2]
	if !(proposer["publicKey"] > voter["publicKey"] && voter["publicKey"] > collector["publicKey"]) {
		t.Fatalf("expected descending account ordering for hostile replay")
	}
	secret := "go-demurrage-dual-collector-secret"
	secretHash := Hash(secret)
	base := int64(550000)

	mgr := NewDBManager(dbPath)
	l := NewLattice(mgr)

	genesis := &Block{Type: "open", Account: proposer["publicKey"], Previous: nil, Balance: 1000, StakedBalance: 0, Height: 0, Link: "SYSTEM_GENESIS", Timestamp: base - 120000}
	signTestBlock(t, genesis, proposer["privateKey"])
	if err := l.ProcessBlock(genesis, false); err != nil {
		t.Fatalf("expected proposer genesis persistence to succeed, got %v", err)
	}

	sendToVoter := &Block{Type: "send", Account: proposer["publicKey"], Previous: &genesis.Hash, Balance: l.GetBalance(proposer["publicKey"], base-90000) - 200, StakedBalance: 0, Height: 1, Link: voter["publicKey"], Spora: validSpora(genesis.Hash), Timestamp: base - 90000}
	signTestBlock(t, sendToVoter, proposer["privateKey"])
	if err := l.ProcessBlock(sendToVoter, false); err != nil {
		t.Fatalf("expected sendToVoter persistence to succeed, got %v", err)
	}

	openVoter := &Block{Type: "open", Account: voter["publicKey"], Previous: nil, Balance: 200, StakedBalance: 0, Height: 0, Link: sendToVoter.Hash, Spora: validSporaForOpenAccount(voter["publicKey"]), Timestamp: base - 89000}
	signTestBlock(t, openVoter, voter["privateKey"])
	if err := l.ProcessBlock(openVoter, false); err != nil {
		t.Fatalf("expected openVoter persistence to succeed, got %v", err)
	}

	sendToCollector := &Block{Type: "send", Account: proposer["publicKey"], Previous: &sendToVoter.Hash, Balance: l.GetBalance(proposer["publicKey"], base-60000) - 150, StakedBalance: 0, Height: 2, Link: collector["publicKey"], Spora: validSpora(sendToVoter.Hash), Timestamp: base - 60000}
	signTestBlock(t, sendToCollector, proposer["privateKey"])
	if err := l.ProcessBlock(sendToCollector, false); err != nil {
		t.Fatalf("expected sendToCollector persistence to succeed, got %v", err)
	}

	openCollector := &Block{Type: "open", Account: collector["publicKey"], Previous: nil, Balance: 150, StakedBalance: 0, Height: 0, Link: sendToCollector.Hash, Spora: validSporaForOpenAccount(collector["publicKey"]), Timestamp: base - 59000}
	signTestBlock(t, openCollector, collector["privateKey"])
	if err := l.ProcessBlock(openCollector, false); err != nil {
		t.Fatalf("expected openCollector persistence to succeed, got %v", err)
	}

	proposal := &Block{Type: "proposal", Account: proposer["publicKey"], Previous: &sendToCollector.Hash, Balance: l.GetBalance(proposer["publicKey"], base) - 10, StakedBalance: 0, Height: 3, Link: "DAO_PROPOSAL", Spora: validSpora(sendToCollector.Hash), Payload: map[string]interface{}{"title": "Demurrage-sensitive dual collector same-timestamp ledger", "endTime": time.UnixMilli(base + 1000).Format(time.RFC3339)}, Timestamp: base}
	signTestBlock(t, proposal, proposer["privateKey"])
	if err := l.ProcessBlock(proposal, false); err != nil {
		t.Fatalf("expected proposal persistence to succeed, got %v", err)
	}

	voterVote := &Block{Type: "vote", Account: voter["publicKey"], Previous: &openVoter.Hash, Balance: l.GetBalance(voter["publicKey"], base), StakedBalance: 0, Height: 1, Link: proposal.Hash, Spora: validSpora(openVoter.Hash), Payload: map[string]interface{}{"vote": "FOR"}, Timestamp: base}
	signTestBlock(t, voterVote, voter["privateKey"])
	if err := l.ProcessBlock(voterVote, false); err != nil {
		t.Fatalf("expected voterVote persistence to succeed, got %v", err)
	}

	collectorVote := &Block{Type: "vote", Account: collector["publicKey"], Previous: &openCollector.Hash, Balance: l.GetBalance(collector["publicKey"], base), StakedBalance: 0, Height: 1, Link: proposal.Hash, Spora: validSpora(openCollector.Hash), Payload: map[string]interface{}{"vote": "FOR"}, Timestamp: base}
	signTestBlock(t, collectorVote, collector["privateKey"])
	if err := l.ProcessBlock(collectorVote, false); err != nil {
		t.Fatalf("expected collectorVote persistence to succeed, got %v", err)
	}

	marketBid := &Block{Type: "market_bid", Account: collector["publicKey"], Previous: &collectorVote.Hash, Balance: l.GetBalance(collector["publicKey"], base) - 25, StakedBalance: 0, Height: 2, Link: "STORAGE_MARKET", Spora: validSpora(collectorVote.Hash), Payload: map[string]interface{}{"magnet": "magnet:?xt=urn:btih:go-demurrage-dual-collector-bid"}, Timestamp: base}
	signTestBlock(t, marketBid, collector["privateKey"])
	if err := l.ProcessBlock(marketBid, false); err != nil {
		t.Fatalf("expected marketBid persistence to succeed, got %v", err)
	}

	mintNft := &Block{Type: "mint_nft", Account: proposer["publicKey"], Previous: &proposal.Hash, Balance: l.GetBalance(proposer["publicKey"], base) - 50, StakedBalance: 0, Height: 4, Link: "NFT_MINT", Spora: validSpora(proposal.Hash), Payload: map[string]interface{}{"name": "Go Demurrage Dual Collector Artifact", "magnet": "magnet:?xt=urn:btih:go-demurrage-dual-collector-nft", "description": "demurrage-sensitive dual collector NFT"}, Timestamp: base}
	signTestBlock(t, mintNft, proposer["privateKey"])
	if err := l.ProcessBlock(mintNft, false); err != nil {
		t.Fatalf("expected mintNft persistence to succeed, got %v", err)
	}

	transferNft := &Block{Type: "transfer_nft", Account: proposer["publicKey"], Previous: &mintNft.Hash, Balance: l.GetBalance(proposer["publicKey"], base) - 1, StakedBalance: 0, Height: 5, Link: mintNft.Hash, Spora: validSpora(mintNft.Hash), Payload: map[string]interface{}{"recipient": collector["publicKey"]}, Timestamp: base}
	signTestBlock(t, transferNft, proposer["privateKey"])
	if err := l.ProcessBlock(transferNft, false); err != nil {
		t.Fatalf("expected transferNft persistence to succeed, got %v", err)
	}

	swapLock := &Block{Type: "swap_lock", Account: proposer["publicKey"], Previous: &transferNft.Hash, Balance: l.GetBalance(proposer["publicKey"], base) - 75, StakedBalance: 0, Height: 6, Link: "HTLC_LOCK", Spora: validSpora(transferNft.Hash), Payload: map[string]interface{}{"secretHash": secretHash, "recipient": proposer["publicKey"]}, Timestamp: base}
	signTestBlock(t, swapLock, proposer["privateKey"])
	if err := l.ProcessBlock(swapLock, false); err != nil {
		t.Fatalf("expected swapLock persistence to succeed, got %v", err)
	}

	manifest := &Block{Type: "publish_manifest", Account: proposer["publicKey"], Previous: &swapLock.Hash, Balance: l.GetBalance(proposer["publicKey"], base), StakedBalance: 0, Height: 7, Link: "go-demurrage-dual-collector-manifest", Spora: validSpora(swapLock.Hash), Payload: map[string]interface{}{"manifestId": "go-demurrage-dual-collector-manifest", "locator": "bobtorrent://manifest/go-demurrage-dual-collector", "manifestUrl": "http://localhost:8000/manifests/go-demurrage-dual-collector", "name": "go-demurrage-dual-collector-manifest.json"}, Timestamp: base}
	signTestBlock(t, manifest, proposer["privateKey"])
	if err := l.ProcessBlock(manifest, false); err != nil {
		t.Fatalf("expected manifest persistence to succeed, got %v", err)
	}

	swapClaim := &Block{Type: "swap_claim", Account: proposer["publicKey"], Previous: &manifest.Hash, Balance: l.GetBalance(proposer["publicKey"], base+500) + l.Swaps[secretHash].Amount, StakedBalance: 0, Height: 8, Link: "HTLC_CLAIM", Spora: validSpora(manifest.Hash), Payload: map[string]interface{}{"secret": secret, "secretHash": secretHash}, Timestamp: base + 500}
	signTestBlock(t, swapClaim, proposer["privateKey"])
	if err := l.ProcessBlock(swapClaim, false); err != nil {
		t.Fatalf("expected swapClaim persistence to succeed, got %v", err)
	}

	acceptBid := &Block{Type: "accept_bid", Account: proposer["publicKey"], Previous: &swapClaim.Hash, Balance: l.GetBalance(proposer["publicKey"], base+1500) + l.MarketBids[marketBid.Hash].(map[string]interface{})["amount"].(float64), StakedBalance: 0, Height: 9, Link: marketBid.Hash, Spora: validSpora(swapClaim.Hash), Timestamp: base + 1500}
	signTestBlock(t, acceptBid, proposer["privateKey"])
	if err := l.ProcessBlock(acceptBid, false); err != nil {
		t.Fatalf("expected acceptBid persistence to succeed, got %v", err)
	}

	anchorBlock := &Block{Type: "data_anchor", Account: proposer["publicKey"], Previous: &acceptBid.Hash, Balance: l.GetBalance(proposer["publicKey"], base+3000) - 1, StakedBalance: 0, Height: 10, Link: "DATA_ANCHOR", Spora: validSpora(acceptBid.Hash), Payload: map[string]interface{}{"magnet": "magnet:?xt=urn:btih:go-demurrage-dual-collector-finalizer", "name": "go-demurrage-dual-collector-finalizer.bin", "size": 1}, Timestamp: base + 3000}
	signTestBlock(t, anchorBlock, proposer["privateKey"])
	if err := l.ProcessBlock(anchorBlock, false); err != nil {
		t.Fatalf("expected anchorBlock persistence to succeed, got %v", err)
	}

	if err := mgr.Close(); err != nil {
		t.Fatalf("failed to close db manager before demurrage dual collector recovery test: %v", err)
	}

	recovered := NewLattice(NewDBManager(dbPath))
	defer recovered.db.Close()

	if len(recovered.Chains[proposer["publicKey"]]) != 11 {
		t.Fatalf("expected recovered proposer chain length 11, got %d", len(recovered.Chains[proposer["publicKey"]]))
	}
	if len(recovered.Chains[voter["publicKey"]]) != 2 {
		t.Fatalf("expected recovered voter chain length 2, got %d", len(recovered.Chains[voter["publicKey"]]))
	}
	if len(recovered.Chains[collector["publicKey"]]) != 3 {
		t.Fatalf("expected recovered collector chain length 3, got %d", len(recovered.Chains[collector["publicKey"]]))
	}
	proposalMap, ok := recovered.Proposals[proposal.Hash].(map[string]interface{})
	if !ok {
		t.Fatalf("expected recovered proposal to exist")
	}
	if proposalMap["status"] != "Passed" {
		t.Fatalf("expected recovered proposal status Passed, got %v", proposalMap["status"])
	}
	if _, ok := recovered.Votes[proposal.Hash][voter["publicKey"]]; !ok {
		t.Fatalf("expected recovered voter vote to be preserved")
	}
	if _, ok := recovered.Votes[proposal.Hash][collector["publicKey"]]; !ok {
		t.Fatalf("expected recovered collector vote to be preserved")
	}
	swap := recovered.Swaps[secretHash]
	if swap == nil || swap.Status != "CLAIMED" {
		t.Fatalf("expected recovered swap to be CLAIMED, got %+v", swap)
	}
	nft, ok := recovered.Nfts[mintNft.Hash]
	if !ok {
		t.Fatalf("expected recovered NFT to exist")
	}
	nftMap := nft.(map[string]interface{})
	if nftMap["owner"] != collector["publicKey"] {
		t.Fatalf("expected recovered NFT owner %q, got %v", collector["publicKey"], nftMap["owner"])
	}
	bid, ok := recovered.MarketBids[marketBid.Hash].(map[string]interface{})
	if !ok {
		t.Fatalf("expected recovered market bid to exist")
	}
	if bid["status"] != "ACCEPTED" {
		t.Fatalf("expected recovered market bid status ACCEPTED, got %v", bid["status"])
	}
	if bid["acceptedBy"] != proposer["publicKey"] {
		t.Fatalf("expected recovered acceptedBy %q, got %v", proposer["publicKey"], bid["acceptedBy"])
	}
	manifestAnchor, ok := recovered.Anchors[manifest.Hash]
	if !ok {
		t.Fatalf("expected recovered manifest anchor to exist")
	}
	manifestAnchorMap := manifestAnchor.(map[string]interface{})
	if manifestAnchorMap["type"] != "publish_manifest" {
		t.Fatalf("expected recovered manifest anchor type publish_manifest, got %v", manifestAnchorMap["type"])
	}
	anchor, ok := recovered.Anchors[anchorBlock.Hash]
	if !ok {
		t.Fatalf("expected recovered data anchor to exist")
	}
	anchorMap := anchor.(map[string]interface{})
	if anchorMap["type"] != "data_anchor" {
		t.Fatalf("expected recovered anchor type data_anchor, got %v", anchorMap["type"])
	}
	frontier := recovered.Chains[proposer["publicKey"]][len(recovered.Chains[proposer["publicKey"]])-1]
	if math.Abs(frontier.Balance-anchorBlock.Balance) > 0.001 {
		t.Fatalf("expected recovered proposer frontier balance near %v, got %v", anchorBlock.Balance, frontier.Balance)
	}
}

func TestGovernanceActionExecution(t *testing.T) {
	l := NewLattice(NewDBManager(":memory:"))
	target := "target-pubkey"
	l.Proposals["prop-mint"] = map[string]interface{}{
		"id":           "prop-mint",
		"status":       "Active",
		"action":       "MINT_TREASURY",
		"target":       target,
		"amount":       123.45,
		"endTime":      time.Now().Add(-time.Hour).Format(time.RFC3339),
		"votesFor":     10.0,
		"votesAgainst": 1.0,
	}
	l.Proposals["prop-rate"] = map[string]interface{}{
		"id":           "prop-rate",
		"status":       "Active",
		"action":       "UPDATE_DEMURRAGE",
		"rate":         0.005,
		"endTime":      time.Now().Add(-time.Hour).Format(time.RFC3339),
		"votesFor":     20.0,
		"votesAgainst": 2.0,
	}

	l.refreshProposalStatusesAt(time.Now())

	if l.Pending[target] == nil || len(l.Pending[target]) != 1 {
		t.Fatalf("expected pending treasury mint, got %v", l.Pending[target])
	}
	if l.Pending[target][0].Amount != 123.45 {
		t.Fatalf("expected amount 123.45, got %v", l.Pending[target][0].Amount)
	}
	if l.DemurrageRate != 0.005 {
		t.Fatalf("expected demurrage rate 0.005, got %v", l.DemurrageRate)
	}
}

func TestRecoveryRebuildsDemurrageSensitiveMultiAccountSameTimestampLedgerFromSQLite(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "demurrage-multi-account-same-timestamp.sqlite")
	keys := deriveDescendingKeypairs("semantic parity demurrage multi account same timestamp", 3)
	proposer := keys[0]
	voter := keys[1]
	collector := keys[2]
	if !(proposer["publicKey"] > voter["publicKey"] && voter["publicKey"] > collector["publicKey"]) {
		t.Fatalf("expected descending account ordering for hostile replay")
	}
	secret := "go-demurrage-multi-account-secret"
	secretHash := Hash(secret)
	base := int64(500000)

	mgr := NewDBManager(dbPath)
	l := NewLattice(mgr)

	genesis := &Block{
		Type:          "open",
		Account:       proposer["publicKey"],
		Previous:      nil,
		Balance:       1000,
		StakedBalance: 0,
		Height:        0,
		Link:          "SYSTEM_GENESIS",
		Timestamp:     base - 120000,
	}
	signTestBlock(t, genesis, proposer["privateKey"])
	if err := l.ProcessBlock(genesis, false); err != nil {
		t.Fatalf("expected proposer genesis persistence to succeed, got %v", err)
	}

	sendToVoter := &Block{
		Type:          "send",
		Account:       proposer["publicKey"],
		Previous:      &genesis.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base-90000) - 200,
		StakedBalance: 0,
		Height:        1,
		Link:          voter["publicKey"],
		Spora:         validSpora(genesis.Hash),
		Timestamp:     base - 90000,
	}
	signTestBlock(t, sendToVoter, proposer["privateKey"])
	if err := l.ProcessBlock(sendToVoter, false); err != nil {
		t.Fatalf("expected sendToVoter persistence to succeed, got %v", err)
	}

	openVoter := &Block{
		Type:          "open",
		Account:       voter["publicKey"],
		Previous:      nil,
		Balance:       200,
		StakedBalance: 0,
		Height:        0,
		Link:          sendToVoter.Hash,
		Spora:         validSporaForOpenAccount(voter["publicKey"]),
		Timestamp:     base - 89000,
	}
	signTestBlock(t, openVoter, voter["privateKey"])
	if err := l.ProcessBlock(openVoter, false); err != nil {
		t.Fatalf("expected openVoter persistence to succeed, got %v", err)
	}

	sendToCollector := &Block{
		Type:          "send",
		Account:       proposer["publicKey"],
		Previous:      &sendToVoter.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base-60000) - 150,
		StakedBalance: 0,
		Height:        2,
		Link:          collector["publicKey"],
		Spora:         validSpora(sendToVoter.Hash),
		Timestamp:     base - 60000,
	}
	signTestBlock(t, sendToCollector, proposer["privateKey"])
	if err := l.ProcessBlock(sendToCollector, false); err != nil {
		t.Fatalf("expected sendToCollector persistence to succeed, got %v", err)
	}

	openCollector := &Block{
		Type:          "open",
		Account:       collector["publicKey"],
		Previous:      nil,
		Balance:       150,
		StakedBalance: 0,
		Height:        0,
		Link:          sendToCollector.Hash,
		Spora:         validSporaForOpenAccount(collector["publicKey"]),
		Timestamp:     base - 59000,
	}
	signTestBlock(t, openCollector, collector["privateKey"])
	if err := l.ProcessBlock(openCollector, false); err != nil {
		t.Fatalf("expected openCollector persistence to succeed, got %v", err)
	}

	proposal := &Block{
		Type:          "proposal",
		Account:       proposer["publicKey"],
		Previous:      &sendToCollector.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 10,
		StakedBalance: 0,
		Height:        3,
		Link:          "DAO_PROPOSAL",
		Spora:         validSpora(sendToCollector.Hash),
		Payload: map[string]interface{}{
			"title":   "Demurrage-sensitive multi-account same-timestamp ledger",
			"endTime": time.UnixMilli(base + 1000).Format(time.RFC3339),
		},
		Timestamp: base,
	}
	signTestBlock(t, proposal, proposer["privateKey"])
	if err := l.ProcessBlock(proposal, false); err != nil {
		t.Fatalf("expected proposal persistence to succeed, got %v", err)
	}

	vote := &Block{
		Type:          "vote",
		Account:       voter["publicKey"],
		Previous:      &openVoter.Hash,
		Balance:       l.GetBalance(voter["publicKey"], base),
		StakedBalance: 0,
		Height:        1,
		Link:          proposal.Hash,
		Spora:         validSpora(openVoter.Hash),
		Payload:       map[string]interface{}{"vote": "FOR"},
		Timestamp:     base,
	}
	signTestBlock(t, vote, voter["privateKey"])
	if err := l.ProcessBlock(vote, false); err != nil {
		t.Fatalf("expected vote persistence to succeed, got %v", err)
	}

	marketBid := &Block{
		Type:          "market_bid",
		Account:       collector["publicKey"],
		Previous:      &openCollector.Hash,
		Balance:       l.GetBalance(collector["publicKey"], base) - 25,
		StakedBalance: 0,
		Height:        1,
		Link:          "STORAGE_MARKET",
		Spora:         validSpora(openCollector.Hash),
		Payload:       map[string]interface{}{"magnet": "magnet:?xt=urn:btih:go-demurrage-multi-bid"},
		Timestamp:     base,
	}
	signTestBlock(t, marketBid, collector["privateKey"])
	if err := l.ProcessBlock(marketBid, false); err != nil {
		t.Fatalf("expected marketBid persistence to succeed, got %v", err)
	}

	mintNft := &Block{
		Type:          "mint_nft",
		Account:       proposer["publicKey"],
		Previous:      &proposal.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 50,
		StakedBalance: 0,
		Height:        4,
		Link:          "NFT_MINT",
		Spora:         validSpora(proposal.Hash),
		Payload: map[string]interface{}{
			"name":        "Go Demurrage Multi Artifact",
			"magnet":      "magnet:?xt=urn:btih:go-demurrage-multi-nft",
			"description": "demurrage-sensitive multi-account NFT",
		},
		Timestamp: base,
	}
	signTestBlock(t, mintNft, proposer["privateKey"])
	if err := l.ProcessBlock(mintNft, false); err != nil {
		t.Fatalf("expected mintNft persistence to succeed, got %v", err)
	}

	transferNft := &Block{
		Type:          "transfer_nft",
		Account:       proposer["publicKey"],
		Previous:      &mintNft.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 1,
		StakedBalance: 0,
		Height:        5,
		Link:          mintNft.Hash,
		Spora:         validSpora(mintNft.Hash),
		Payload: map[string]interface{}{
			"recipient": collector["publicKey"],
		},
		Timestamp: base,
	}
	signTestBlock(t, transferNft, proposer["privateKey"])
	if err := l.ProcessBlock(transferNft, false); err != nil {
		t.Fatalf("expected transferNft persistence to succeed, got %v", err)
	}

	swapLock := &Block{
		Type:          "swap_lock",
		Account:       proposer["publicKey"],
		Previous:      &transferNft.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base) - 75,
		StakedBalance: 0,
		Height:        6,
		Link:          "HTLC_LOCK",
		Spora:         validSpora(transferNft.Hash),
		Payload: map[string]interface{}{
			"secretHash": secretHash,
			"recipient":  proposer["publicKey"],
		},
		Timestamp: base,
	}
	signTestBlock(t, swapLock, proposer["privateKey"])
	if err := l.ProcessBlock(swapLock, false); err != nil {
		t.Fatalf("expected swapLock persistence to succeed, got %v", err)
	}

	manifest := &Block{
		Type:          "publish_manifest",
		Account:       proposer["publicKey"],
		Previous:      &swapLock.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base),
		StakedBalance: 0,
		Height:        7,
		Link:          "go-demurrage-multi-manifest",
		Spora:         validSpora(swapLock.Hash),
		Payload: map[string]interface{}{
			"manifestId":  "go-demurrage-multi-manifest",
			"locator":     "bobtorrent://manifest/go-demurrage-multi",
			"manifestUrl": "http://localhost:8000/manifests/go-demurrage-multi",
			"name":        "go-demurrage-multi-manifest.json",
		},
		Timestamp: base,
	}
	signTestBlock(t, manifest, proposer["privateKey"])
	if err := l.ProcessBlock(manifest, false); err != nil {
		t.Fatalf("expected manifest persistence to succeed, got %v", err)
	}

	swapClaim := &Block{
		Type:          "swap_claim",
		Account:       proposer["publicKey"],
		Previous:      &manifest.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base+500) + l.Swaps[secretHash].Amount,
		StakedBalance: 0,
		Height:        8,
		Link:          "HTLC_CLAIM",
		Spora:         validSpora(manifest.Hash),
		Payload: map[string]interface{}{
			"secret":     secret,
			"secretHash": secretHash,
		},
		Timestamp: base + 500,
	}
	signTestBlock(t, swapClaim, proposer["privateKey"])
	if err := l.ProcessBlock(swapClaim, false); err != nil {
		t.Fatalf("expected swapClaim persistence to succeed, got %v", err)
	}

	acceptBid := &Block{
		Type:          "accept_bid",
		Account:       proposer["publicKey"],
		Previous:      &swapClaim.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base+1500) + l.MarketBids[marketBid.Hash].(map[string]interface{})["amount"].(float64),
		StakedBalance: 0,
		Height:        9,
		Link:          marketBid.Hash,
		Spora:         validSpora(swapClaim.Hash),
		Timestamp:     base + 1500,
	}
	signTestBlock(t, acceptBid, proposer["privateKey"])
	if err := l.ProcessBlock(acceptBid, false); err != nil {
		t.Fatalf("expected acceptBid persistence to succeed, got %v", err)
	}

	anchorBlock := &Block{
		Type:          "data_anchor",
		Account:       proposer["publicKey"],
		Previous:      &acceptBid.Hash,
		Balance:       l.GetBalance(proposer["publicKey"], base+3000) - 1,
		StakedBalance: 0,
		Height:        10,
		Link:          "DATA_ANCHOR",
		Spora:         validSpora(acceptBid.Hash),
		Payload: map[string]interface{}{
			"magnet": "magnet:?xt=urn:btih:go-demurrage-multi-finalizer",
			"name":   "go-demurrage-multi-finalizer.bin",
			"size":   1,
		},
		Timestamp: base + 3000,
	}
	signTestBlock(t, anchorBlock, proposer["privateKey"])
	if err := l.ProcessBlock(anchorBlock, false); err != nil {
		t.Fatalf("expected anchorBlock persistence to succeed, got %v", err)
	}

	if err := mgr.Close(); err != nil {
		t.Fatalf("failed to close db manager before demurrage multi-account recovery test: %v", err)
	}

	recovered := NewLattice(NewDBManager(dbPath))
	defer recovered.db.Close()

	if len(recovered.Chains[proposer["publicKey"]]) != 11 {
		t.Fatalf("expected recovered proposer chain length 11, got %d", len(recovered.Chains[proposer["publicKey"]]))
	}
	if len(recovered.Chains[voter["publicKey"]]) != 2 {
		t.Fatalf("expected recovered voter chain length 2, got %d", len(recovered.Chains[voter["publicKey"]]))
	}
	if len(recovered.Chains[collector["publicKey"]]) != 2 {
		t.Fatalf("expected recovered collector chain length 2, got %d", len(recovered.Chains[collector["publicKey"]]))
	}
	proposalMap, ok := recovered.Proposals[proposal.Hash].(map[string]interface{})
	if !ok {
		t.Fatalf("expected recovered proposal to exist")
	}
	if proposalMap["status"] != "Passed" {
		t.Fatalf("expected recovered proposal status Passed, got %v", proposalMap["status"])
	}
	if _, ok := recovered.Votes[proposal.Hash][voter["publicKey"]]; !ok {
		t.Fatalf("expected recovered vote to be preserved")
	}
	swap := recovered.Swaps[secretHash]
	if swap == nil || swap.Status != "CLAIMED" {
		t.Fatalf("expected recovered swap to be CLAIMED, got %+v", swap)
	}
	nft, ok := recovered.Nfts[mintNft.Hash]
	if !ok {
		t.Fatalf("expected recovered NFT to exist")
	}
	nftMap := nft.(map[string]interface{})
	if nftMap["owner"] != collector["publicKey"] {
		t.Fatalf("expected recovered NFT owner %q, got %v", collector["publicKey"], nftMap["owner"])
	}
	bid, ok := recovered.MarketBids[marketBid.Hash].(map[string]interface{})
	if !ok {
		t.Fatalf("expected recovered market bid to exist")
	}
	if bid["status"] != "ACCEPTED" {
		t.Fatalf("expected recovered market bid status ACCEPTED, got %v", bid["status"])
	}
	if bid["acceptedBy"] != proposer["publicKey"] {
		t.Fatalf("expected recovered acceptedBy %q, got %v", proposer["publicKey"], bid["acceptedBy"])
	}
	manifestAnchor, ok := recovered.Anchors[manifest.Hash]
	if !ok {
		t.Fatalf("expected recovered manifest anchor to exist")
	}
	manifestAnchorMap := manifestAnchor.(map[string]interface{})
	if manifestAnchorMap["type"] != "publish_manifest" {
		t.Fatalf("expected recovered manifest anchor type publish_manifest, got %v", manifestAnchorMap["type"])
	}
	anchor, ok := recovered.Anchors[anchorBlock.Hash]
	if !ok {
		t.Fatalf("expected recovered data anchor to exist")
	}
	anchorMap := anchor.(map[string]interface{})
	if anchorMap["type"] != "data_anchor" {
		t.Fatalf("expected recovered anchor type data_anchor, got %v", anchorMap["type"])
	}
	frontier := recovered.Chains[proposer["publicKey"]][len(recovered.Chains[proposer["publicKey"]])-1]
	if math.Abs(frontier.Balance-anchorBlock.Balance) > 0.001 {
		t.Fatalf("expected recovered proposer frontier balance near %v, got %v", anchorBlock.Balance, frontier.Balance)
	}
}

func TestRecoveryHandlesCascadingSameTimestampDependenciesFromSQLite(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "same-timestamp-recovery.sqlite")
	keys := deriveDescendingKeypairs("semantic parity recovery cascade", 3)
	sender := keys[0]
	relay := keys[1]
	receiver := keys[2]
	if !(sender["publicKey"] > relay["publicKey"] && relay["publicKey"] > receiver["publicKey"]) {
		t.Fatalf("expected descending account ordering for deterministic hostile replay")
	}

	mgr := NewDBManager(dbPath)
	genesis := makeGenesisBlock(sender, 1000)
	signTestBlock(t, genesis, sender["privateKey"])
	if err := mgr.SaveBlock(genesis); err != nil {
		t.Fatalf("failed to persist genesis block: %v", err)
	}

	sendToRelay := &Block{
		Type:          "send",
		Account:       sender["publicKey"],
		Previous:      &genesis.Hash,
		Balance:       800,
		StakedBalance: 0,
		Height:        1,
		Link:          relay["publicKey"],
		Spora:         validSpora(genesis.Hash),
		Timestamp:     10,
	}
	signTestBlock(t, sendToRelay, sender["privateKey"])
	if err := mgr.SaveBlock(sendToRelay); err != nil {
		t.Fatalf("failed to persist sendToRelay block: %v", err)
	}

	openRelay := &Block{
		Type:          "open",
		Account:       relay["publicKey"],
		Previous:      nil,
		Balance:       200,
		StakedBalance: 0,
		Height:        0,
		Link:          sendToRelay.Hash,
		Spora:         validSporaForOpenAccount(relay["publicKey"]),
		Timestamp:     10,
	}
	signTestBlock(t, openRelay, relay["privateKey"])
	if err := mgr.SaveBlock(openRelay); err != nil {
		t.Fatalf("failed to persist openRelay block: %v", err)
	}

	sendToReceiver := &Block{
		Type:          "send",
		Account:       relay["publicKey"],
		Previous:      &openRelay.Hash,
		Balance:       150,
		StakedBalance: 0,
		Height:        1,
		Link:          receiver["publicKey"],
		Spora:         validSpora(openRelay.Hash),
		Timestamp:     10,
	}
	signTestBlock(t, sendToReceiver, relay["privateKey"])
	if err := mgr.SaveBlock(sendToReceiver); err != nil {
		t.Fatalf("failed to persist sendToReceiver block: %v", err)
	}

	openReceiver := &Block{
		Type:          "open",
		Account:       receiver["publicKey"],
		Previous:      nil,
		Balance:       50,
		StakedBalance: 0,
		Height:        0,
		Link:          sendToReceiver.Hash,
		Spora:         validSporaForOpenAccount(receiver["publicKey"]),
		Timestamp:     10,
	}
	signTestBlock(t, openReceiver, receiver["privateKey"])
	if err := mgr.SaveBlock(openReceiver); err != nil {
		t.Fatalf("failed to persist openReceiver block: %v", err)
	}

	if err := mgr.Close(); err != nil {
		t.Fatalf("failed to close db manager before same-timestamp recovery test: %v", err)
	}

	recovered := NewLattice(NewDBManager(dbPath))
	defer recovered.db.Close()

	if len(recovered.Chains[sender["publicKey"]]) != 2 {
		t.Fatalf("expected recovered sender chain length 2, got %d", len(recovered.Chains[sender["publicKey"]]))
	}
	if len(recovered.Chains[relay["publicKey"]]) != 2 {
		t.Fatalf("expected recovered relay chain length 2, got %d", len(recovered.Chains[relay["publicKey"]]))
	}
	if len(recovered.Chains[receiver["publicKey"]]) != 1 {
		t.Fatalf("expected recovered receiver chain length 1, got %d", len(recovered.Chains[receiver["publicKey"]]))
	}
	frontier := recovered.Chains[receiver["publicKey"]][len(recovered.Chains[receiver["publicKey"]])-1]
	if math.Abs(frontier.Balance-50) > 0.001 {
		t.Fatalf("expected recovered receiver balance 50, got %+v", frontier)
	}
	if len(recovered.Pending[relay["publicKey"]]) != 0 || len(recovered.Pending[receiver["publicKey"]]) != 0 {
		t.Fatalf("expected no recovered pending transactions for fully received same-timestamp cascade")
	}
}

func TestRecoveryReplaysSameTimestampVoteBeforeLaterExpiryFromSQLite(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "proposal-vote-recovery.sqlite")
	keys := deriveDescendingKeypairs("semantic parity recovery proposal vote", 2)
	proposer := keys[0]
	voter := keys[1]
	if proposer["publicKey"] <= voter["publicKey"] {
		t.Fatalf("expected proposer account ordering to sort after voter")
	}

	mgr := NewDBManager(dbPath)
	l := NewLattice(mgr)
	base := time.Now().Add(time.Hour).Truncate(time.Second).UnixMilli()

	genesis := &Block{
		Type:          "open",
		Account:       proposer["publicKey"],
		Previous:      nil,
		Balance:       1000,
		StakedBalance: 0,
		Height:        0,
		Link:          "SYSTEM_GENESIS",
		Timestamp:     base - 3000,
	}
	signTestBlock(t, genesis, proposer["privateKey"])
	if err := l.ProcessBlock(genesis, false); err != nil {
		t.Fatalf("expected proposer genesis persistence to succeed, got %v", err)
	}

	sendBalance := l.GetBalance(proposer["publicKey"], base-2000) - 200
	sendToVoter := &Block{
		Type:          "send",
		Account:       proposer["publicKey"],
		Previous:      &genesis.Hash,
		Balance:       sendBalance,
		StakedBalance: 0,
		Height:        1,
		Link:          voter["publicKey"],
		Spora:         validSpora(genesis.Hash),
		Timestamp:     base - 2000,
	}
	signTestBlock(t, sendToVoter, proposer["privateKey"])
	if err := l.ProcessBlock(sendToVoter, false); err != nil {
		t.Fatalf("expected sendToVoter persistence to succeed, got %v", err)
	}

	openVoter := &Block{
		Type:          "open",
		Account:       voter["publicKey"],
		Previous:      nil,
		Balance:       200,
		StakedBalance: 0,
		Height:        0,
		Link:          sendToVoter.Hash,
		Spora:         validSporaForOpenAccount(voter["publicKey"]),
		Timestamp:     base - 1000,
	}
	signTestBlock(t, openVoter, voter["privateKey"])
	if err := l.ProcessBlock(openVoter, false); err != nil {
		t.Fatalf("expected openVoter persistence to succeed, got %v", err)
	}

	proposalBalance := l.GetBalance(proposer["publicKey"], base) - 10
	proposal := &Block{
		Type:          "proposal",
		Account:       proposer["publicKey"],
		Previous:      &sendToVoter.Hash,
		Balance:       proposalBalance,
		StakedBalance: 0,
		Height:        2,
		Link:          "DAO_PROPOSAL",
		Spora:         validSpora(sendToVoter.Hash),
		Payload: map[string]interface{}{
			"title":   "Durable same timestamp proposal vote",
			"endTime": time.UnixMilli(base + 1000).Format(time.RFC3339),
		},
		Timestamp: base,
	}
	signTestBlock(t, proposal, proposer["privateKey"])
	if err := l.ProcessBlock(proposal, false); err != nil {
		t.Fatalf("expected proposal persistence to succeed, got %v", err)
	}

	voteBalance := l.GetBalance(voter["publicKey"], base)
	vote := &Block{
		Type:          "vote",
		Account:       voter["publicKey"],
		Previous:      &openVoter.Hash,
		Balance:       voteBalance,
		StakedBalance: 0,
		Height:        1,
		Link:          proposal.Hash,
		Spora:         validSpora(openVoter.Hash),
		Payload:       map[string]interface{}{"vote": "FOR"},
		Timestamp:     base,
	}
	signTestBlock(t, vote, voter["privateKey"])
	if err := l.ProcessBlock(vote, false); err != nil {
		t.Fatalf("expected vote persistence to succeed, got %v", err)
	}

	manifestBalance := l.GetBalance(proposer["publicKey"], base+2000)
	manifest := &Block{
		Type:          "publish_manifest",
		Account:       proposer["publicKey"],
		Previous:      &proposal.Hash,
		Balance:       manifestBalance,
		StakedBalance: 0,
		Height:        3,
		Link:          "durable-proposal-vote-manifest",
		Spora:         validSpora(proposal.Hash),
		Payload: map[string]interface{}{
			"manifestId":  "durable-proposal-vote-manifest",
			"locator":     "bobtorrent://manifest/durable-proposal-vote",
			"manifestUrl": "http://localhost:8000/manifests/durable-proposal-vote",
		},
		Timestamp: base + 2000,
	}
	signTestBlock(t, manifest, proposer["privateKey"])
	if err := l.ProcessBlock(manifest, false); err != nil {
		t.Fatalf("expected manifest persistence to succeed, got %v", err)
	}

	if err := mgr.Close(); err != nil {
		t.Fatalf("failed to close db manager before proposal vote recovery test: %v", err)
	}

	recovered := NewLattice(NewDBManager(dbPath))
	defer recovered.db.Close()

	proposalMap, ok := recovered.Proposals[proposal.Hash].(map[string]interface{})
	if !ok {
		t.Fatalf("expected recovered proposal to exist")
	}
	if proposalMap["status"] != "Passed" {
		t.Fatalf("expected recovered proposal status Passed, got %v", proposalMap["status"])
	}
	if _, ok := recovered.Votes[proposal.Hash][voter["publicKey"]]; !ok {
		t.Fatalf("expected recovered vote to be preserved after restart")
	}
}

func TestRecoveryRebuildsMixedHistoricalStateFromSQLite(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "recovery.sqlite")
	keysA := DeriveKeypair("semantic parity recovery A", 0)
	keysB := DeriveKeypair("semantic parity recovery B", 0)

	mgr := NewDBManager(dbPath)
	l := NewLattice(mgr)

	genesisA := makeGenesisBlock(keysA, 1000)
	signTestBlock(t, genesisA, keysA["privateKey"])
	if err := l.ProcessBlock(genesisA, false); err != nil {
		t.Fatalf("expected genesisA persistence to succeed, got %v", err)
	}

	prevSend := genesisA.Hash
	sendAB := &Block{
		Type:          "send",
		Account:       keysA["publicKey"],
		Previous:      &prevSend,
		Balance:       800,
		StakedBalance: 0,
		Height:        1,
		Link:          keysB["publicKey"],
		Spora:         validSpora(genesisA.Hash),
		Timestamp:     2,
	}
	signTestBlock(t, sendAB, keysA["privateKey"])
	if err := l.ProcessBlock(sendAB, false); err != nil {
		t.Fatalf("expected persisted sendAB to succeed, got %v", err)
	}

	openB := &Block{
		Type:          "open",
		Account:       keysB["publicKey"],
		Previous:      nil,
		Balance:       200,
		StakedBalance: 0,
		Height:        0,
		Link:          sendAB.Hash,
		Spora:         validSporaForOpenAccount(keysB["publicKey"]),
		Timestamp:     3,
	}
	signTestBlock(t, openB, keysB["privateKey"])
	if err := l.ProcessBlock(openB, false); err != nil {
		t.Fatalf("expected persisted openB to succeed, got %v", err)
	}

	prevManifest := sendAB.Hash
	manifestA := &Block{
		Type:          "publish_manifest",
		Account:       keysA["publicKey"],
		Previous:      &prevManifest,
		Balance:       800,
		StakedBalance: 0,
		Height:        2,
		Link:          "manifest-recovery",
		Spora:         validSpora(sendAB.Hash),
		Payload: map[string]interface{}{
			"manifestId":  "manifest-recovery",
			"locator":     "bobtorrent://manifest/recovery",
			"manifestUrl": "http://localhost:8000/manifests/recovery",
			"name":        "recovery.bin",
			"size":        256,
		},
		Timestamp: 4,
	}
	signTestBlock(t, manifestA, keysA["privateKey"])
	if err := l.ProcessBlock(manifestA, false); err != nil {
		t.Fatalf("expected persisted publish_manifest to succeed, got %v", err)
	}

	prevBid := openB.Hash
	bidB := &Block{
		Type:          "market_bid",
		Account:       keysB["publicKey"],
		Previous:      &prevBid,
		Balance:       150,
		StakedBalance: 0,
		Height:        1,
		Link:          "STORAGE_MARKET",
		Spora:         validSpora(openB.Hash),
		Payload:       map[string]interface{}{"magnet": "magnet:?xt=urn:btih:recovery-bid"},
		Timestamp:     5,
	}
	signTestBlock(t, bidB, keysB["privateKey"])
	if err := l.ProcessBlock(bidB, false); err != nil {
		t.Fatalf("expected persisted bidB to succeed, got %v", err)
	}

	prevAccept := bidB.Hash
	acceptB := &Block{
		Type:          "accept_bid",
		Account:       keysB["publicKey"],
		Previous:      &prevAccept,
		Balance:       200,
		StakedBalance: 0,
		Height:        2,
		Link:          bidB.Hash,
		Spora:         validSpora(bidB.Hash),
		Timestamp:     6,
	}
	signTestBlock(t, acceptB, keysB["privateKey"])
	if err := l.ProcessBlock(acceptB, false); err != nil {
		t.Fatalf("expected persisted acceptB to succeed, got %v", err)
	}

	if err := mgr.Close(); err != nil {
		t.Fatalf("failed to close db manager before recovery test: %v", err)
	}

	recovered := NewLattice(NewDBManager(dbPath))
	defer recovered.db.Close()

	if len(recovered.Chains[keysA["publicKey"]]) != 3 {
		t.Fatalf("expected recovered account A chain length 3, got %d", len(recovered.Chains[keysA["publicKey"]]))
	}
	if len(recovered.Chains[keysB["publicKey"]]) != 3 {
		t.Fatalf("expected recovered account B chain length 3, got %d", len(recovered.Chains[keysB["publicKey"]]))
	}
	anchor, ok := recovered.Anchors[manifestA.Hash]
	if !ok {
		t.Fatalf("expected recovered manifest anchor to exist")
	}
	anchorMap := anchor.(map[string]interface{})
	if anchorMap["type"] != "publish_manifest" {
		t.Fatalf("expected recovered anchor type publish_manifest, got %v", anchorMap["type"])
	}
	bid, ok := recovered.MarketBids[bidB.Hash]
	if !ok {
		t.Fatalf("expected recovered market bid to exist")
	}
	bidMap := bid.(map[string]interface{})
	if bidMap["status"] != "ACCEPTED" {
		t.Fatalf("expected recovered bid status ACCEPTED, got %v", bidMap["status"])
	}
	if bidMap["acceptedBy"] != keysB["publicKey"] {
		t.Fatalf("expected recovered acceptedBy %q, got %v", keysB["publicKey"], bidMap["acceptedBy"])
	}
}

func TestAuditStateRebuildsDerivedAnchorState(t *testing.T) {
	keys := DeriveKeypair("semantic parity audit", 0)
	l := NewLattice(NewDBManager(":memory:"))

	genesis := &Block{
		Type:          "open",
		Account:       keys["publicKey"],
		Previous:      nil,
		Balance:       1000,
		StakedBalance: 0,
		Height:        0,
		Link:          "SYSTEM_GENESIS",
		Timestamp:     1,
	}
	signTestBlock(t, genesis, keys["privateKey"])
	if err := l.ProcessBlock(genesis, true); err != nil {
		t.Fatalf("expected genesis block to succeed, got %v", err)
	}

	previous := genesis.Hash
	manifest := &Block{
		Type:          "publish_manifest",
		Account:       keys["publicKey"],
		Previous:      &previous,
		Balance:       1000,
		StakedBalance: 0,
		Height:        1,
		Link:          "manifest-1",
		Spora:         validSpora(genesis.Hash),
		Payload: map[string]interface{}{
			"manifestId":  "manifest-1",
			"locator":     "bobtorrent://manifest/manifest-1",
			"manifestUrl": "http://localhost:8000/manifests/manifest-1",
			"name":        "artifact.bin",
			"size":        64,
		},
		Timestamp: 2,
	}
	signTestBlock(t, manifest, keys["privateKey"])
	if err := l.ProcessBlock(manifest, true); err != nil {
		t.Fatalf("expected publish_manifest to succeed, got %v", err)
	}

	l.Anchors = map[string]interface{}{}
	l.StateHash = "corrupted"
	l.MerkleRoot = "corrupted"

	if err := l.AuditState(); err != nil {
		t.Fatalf("expected audit to succeed, got %v", err)
	}

	anchor, ok := l.Anchors[manifest.Hash]
	if !ok {
		t.Fatalf("expected audit to rebuild anchor state")
	}
	anchorMap := anchor.(map[string]interface{})
	if anchorMap["owner"] != keys["publicKey"] {
		t.Fatalf("expected rebuilt anchor owner %q, got %v", keys["publicKey"], anchorMap["owner"])
	}
	if l.StateHash == "corrupted" || l.MerkleRoot == "corrupted" {
		t.Fatalf("expected audit to restore state hashes")
	}
}
