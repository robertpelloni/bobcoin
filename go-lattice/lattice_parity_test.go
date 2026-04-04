package main

import (
	"crypto/ed25519"
	"math"
	"path/filepath"
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
	keysA := DeriveKeypair("semantic parity same ts A", 0)
	keysB := DeriveKeypair("semantic parity same ts B", 0)
	l := NewLattice(NewDBManager(":memory:"))

	genesisA := makeGenesisBlock(keysA, 1000)
	signTestBlock(t, genesisA, keysA["privateKey"])
	if err := l.ProcessBlock(genesisA, true); err != nil {
		t.Fatalf("expected genesisA to succeed, got %v", err)
	}

	sendAB := &Block{
		Type:          "send",
		Account:       keysA["publicKey"],
		Previous:      &genesisA.Hash,
		Balance:       800,
		StakedBalance: 0,
		Height:        1,
		Link:          keysB["publicKey"],
		Spora:         validSpora(genesisA.Hash),
		Timestamp:     10,
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
		Timestamp:     10,
	}
	signTestBlock(t, openB, keysB["privateKey"])
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
	if len(l.Chains[keysB["publicKey"]]) != 1 {
		t.Fatalf("expected receiving account chain length 1 after replay, got %d", len(l.Chains[keysB["publicKey"]]))
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
