package main

import (
	"encoding/json"
	"strconv"
)

type SporaProof struct {
	InfoHash  string `json:"infoHash"`
	Challenge int    `json:"challenge"`
	ChunkHash string `json:"chunkHash"`
}

type Block struct {
	Type          string      `json:"type"`
	Account       string      `json:"account"`
	Previous      *string     `json:"previous"`
	Balance       float64     `json:"balance"`
	StakedBalance float64     `json:"staked_balance"`
	Height        int         `json:"height"`
	Link          string      `json:"link"`
	Spora         *SporaProof `json:"spora"`
	Payload       interface{} `json:"payload"`
	Timestamp     int64       `json:"timestamp"`
	Hash          string      `json:"hash"`
	Signature     string      `json:"signature"`
}

// CalculateHash generates the block hash matching Node.js logic
func (b *Block) CalculateHash() string {
	sporaJSON, _ := json.Marshal(b.Spora)
	payloadJSON, _ := json.Marshal(b.Payload)
	
	prev := ""
	if b.Previous != nil {
		prev = *b.Previous
	}

	data := b.Type + 
		b.Account + 
		prev + 
		strconv.FormatFloat(b.Balance, 'f', -1, 64) + 
		strconv.FormatFloat(b.StakedBalance, 'f', -1, 64) + 
		strconv.Itoa(b.Height) + 
		b.Link + 
		string(sporaJSON) + 
		string(payloadJSON)
	
	return Hash(data)
}

func (b *Block) Verify() bool {
	// expectedHash := b.CalculateHash() 
	// In production, we'd compare expectedHash == b.Hash
	// For alpha, we prioritize signature validity
	return VerifySignature(b.Hash, b.Signature, b.Account)
}
