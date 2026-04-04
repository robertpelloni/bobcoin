package main

import (
	"crypto/ed25519"
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
