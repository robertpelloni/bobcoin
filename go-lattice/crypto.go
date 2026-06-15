package main

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/mr-tron/base58"
)

/**
 * Derive deterministic keypair from a seed string (mnemonic)
 */
func DeriveKeypair(mnemonic string, index int) map[string]string {
	derivationPath := fmt.Sprintf("m/44'/1337'/%d'", index)
	seed := sha256.Sum256([]byte(mnemonic + derivationPath))

	kp := ed25519.NewKeyFromSeed(seed[:32])
	pub := base58.Encode(kp.Public().(ed25519.PublicKey))
	priv := base58.Encode(kp)

	return map[string]string{
		"publicKey":      pub,
		"privateKey":     priv,
		"mnemonic":       mnemonic,
		"derivationPath": derivationPath,
	}
}

// FormatJS provides a string representation of a float64 that matches JavaScript's .toString()
// including scientific notation thresholds (abs < 1e-6 or abs >= 1e21).
func FormatJS(f float64) string {
	if f == 0 {
		return "0"
	}
	abs := math.Abs(f)
	if abs >= 1e21 || abs < 1e-6 {
		s := strconv.FormatFloat(f, 'e', -1, 64)
		parts := strings.Split(s, "e")
		exp, _ := strconv.Atoi(parts[1])
		if exp > 0 {
			return parts[0] + "e+" + strconv.Itoa(exp)
		}
		return parts[0] + "e" + strconv.Itoa(exp)
	}
	return strconv.FormatFloat(f, 'f', -1, 64)
}

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
