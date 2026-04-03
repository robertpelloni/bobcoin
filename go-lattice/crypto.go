package main

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/hex"
	"github.com/mr-tron/base58"
)

// Hash returns a SHA-256 hex string of the input data
func Hash(data string) string {
	h := sha256.New()
	h.Write([]byte(data))
	return hex.EncodeToString(h.Sum(nil))
}

// VerifySignature checks an Ed25519 signature against a pubkey and hash
func VerifySignature(hashHex, signatureBase58, publicKeyBase58 string) bool {
	pubBytes, err := base58.Decode(publicKeyBase58)
	if err != nil || len(pubBytes) != 32 {
		return false
	}

	sigBytes, err := base58.Decode(signatureBase58)
	if err != nil || len(sigBytes) != 64 {
		return false
	}

	// We sign the hex string of the hash (matching frontend logic)
	msg := []byte(hashHex)
	return ed25519.Verify(pubBytes, msg, sigBytes)
}
