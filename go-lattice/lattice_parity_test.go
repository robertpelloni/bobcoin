package main

import "testing"

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
