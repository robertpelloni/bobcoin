package main

import (
	"crypto/sha256"
	"encoding/hex"
	"sort"
	"strconv"
)

func calculateMerkleRootFromChains(chains map[string][]*Block) string {
	var stateEntries []string
	for account, chain := range chains {
		if len(chain) == 0 {
			continue
		}
		head := chain[len(chain)-1]
		// Use FormatJS to ensure 1:1 string parity with JavaScript's .toString()
		entry := Hash(account +
			FormatJS(head.Balance) +
			FormatJS(head.StakedBalance) +
			strconv.Itoa(head.Height))
		stateEntries = append(stateEntries, entry)
	}

	if len(stateEntries) == 0 {
		return "0000000000000000000000000000000000000000000000000000000000000000"
	}

	sort.Strings(stateEntries)
	return buildRoot(stateEntries)
}

/**
 * Calculate the State Merkle Root of the entire Lattice
 */
func (l *Lattice) CalculateMerkleRoot() string {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return calculateMerkleRootFromChains(l.Chains)
}

func buildRoot(hashes []string) string {
	if len(hashes) == 1 {
		return hashes[0]
	}

	var nextLevel []string
	for i := 0; i < len(hashes); i += 2 {
		if i+1 < len(hashes) {
			h := sha256.New()
			h.Write([]byte(hashes[i] + hashes[i+1]))
			nextLevel = append(nextLevel, hex.EncodeToString(h.Sum(nil)))
		} else {
			// Odd number of hashes, promote the last one
			nextLevel = append(nextLevel, hashes[i])
		}
	}
	return buildRoot(nextLevel)
}
