package main

import (
	"crypto/ed25519"
	"crypto/rand"
	"testing"
	"time"

	"github.com/mr-tron/base58"
)

func BenchmarkSignatureValidation(b *testing.B) {
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	message := []byte("simulate_10000_tps_block_hash_payload")
	signature := ed25519.Sign(priv, message)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ed25519.Verify(pub, message, signature)
	}
}

func BenchmarkBlockProcessing(b *testing.B) {
	pub, _, _ := ed25519.GenerateKey(rand.Reader)
	accountStr := base58.Encode(pub)

	s := NewLattice(NewDBManager(":memory:"))
	defer s.db.Close()

	block := Block{
		Type:          "mint",
		Account:       accountStr,
		Previous:      nil,
		Balance:       100.0,
		StakedBalance: 0,
		Height:        1,
		Link:          "genesis",
		Timestamp:     time.Now().UnixMilli(),
		Signature:     "mock_signature",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Just test the internal memory limits, skip actual DB writes for raw TPS potential
		s.ProcessBlock(&block, true)
	}
}
