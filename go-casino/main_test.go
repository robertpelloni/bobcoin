package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCasinoBotBootstrapAndPoll(t *testing.T) {
	// Mock Game Server for Mint
	gameServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/mint" {
			json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "hash": "mint-hash-123"})
			return
		}
		t.Fatalf("unexpected game server request: %s", r.URL.Path)
	}))
	defer gameServer.Close()

	// Mock Supernode for SPoRA
	supernode := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/spora/") {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"spora": map[string]interface{}{
					"infoHash":  "mock-info-hash",
					"challenge": 12345,
					"chunkHash": "mock-chunk-hash",
				},
			})
			return
		}
		t.Fatalf("unexpected supernode request: %s", r.URL.Path)
	}))
	defer supernode.Close()

	var processedBlocks []map[string]interface{}
	var pendingResponse map[string]interface{}

	// Mock Lattice
	lattice := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasPrefix(r.URL.Path, "/frontier/"):
			// Return uninitialized for bootstrap, then initialized for polling
			if len(processedBlocks) == 0 {
				json.NewEncoder(w).Encode(map[string]interface{}{})
			} else {
				json.NewEncoder(w).Encode(map[string]interface{}{
					"frontier": "some-frontier-hash",
					"balance":  500.0,
					"height":   1,
				})
			}
		case strings.HasPrefix(r.URL.Path, "/pending/"):
			json.NewEncoder(w).Encode(pendingResponse)
		case r.URL.Path == "/process":
			var payload map[string]interface{}
			json.NewDecoder(r.Body).Decode(&payload)
			block, _ := payload["block"].(map[string]interface{})
			processedBlocks = append(processedBlocks, block)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "hash": "new-hash"})
		default:
			t.Fatalf("unexpected lattice request: %s", r.URL.Path)
		}
	}))
	defer lattice.Close()

	tmp := t.TempDir()
	cfg := Config{
		LatticeURL:    lattice.URL,
		GameServerURL: gameServer.URL,
		SupernodeURL:  supernode.URL,
		WalletFile:    tmp + "/casino_wallet.json",
	}

	bot, err := NewCasinoBot(cfg)
	if err != nil {
		t.Fatalf("failed to init casino bot: %v", err)
	}

	// 1. Test Bootstrap (needs pending funds)
	pendingResponse = map[string]interface{}{
		"pending": []map[string]interface{}{
			{"hash": "mint-hash-123", "amount": 500.0, "sender": "system"},
		},
	}
	bot.bootstrap()

	if len(processedBlocks) != 1 || processedBlocks[0]["type"] != "open" {
		t.Fatalf("expected 1 open block from bootstrap, got %v", processedBlocks)
	}

	// 2. Test Polling - Winning Bet
	// Last hex char '0' makes it a winner (even)
	pendingResponse = map[string]interface{}{
		"pending": []map[string]interface{}{
			{"hash": "bet-hash-1230", "amount": 10.0, "sender": "player-1"},
		},
	}
	bot.pollAndProcess()

	// Should have processed 'receive' and then 'send' (payout)
	if len(processedBlocks) != 3 {
		t.Fatalf("expected 3 total blocks after win (open, receive, send), got %d", len(processedBlocks))
	}
	if processedBlocks[1]["type"] != "receive" || processedBlocks[2]["type"] != "send" {
		t.Fatalf("expected receive then send for win")
	}

	// 3. Test Polling - Losing Bet
	// Last hex char '1' makes it a loser (odd)
	pendingResponse = map[string]interface{}{
		"pending": []map[string]interface{}{
			{"hash": "bet-hash-1231", "amount": 20.0, "sender": "player-2"},
		},
	}
	bot.pollAndProcess()

	// Should have processed 'receive', but NO 'send'
	if len(processedBlocks) != 4 {
		t.Fatalf("expected 4 total blocks after loss (open, receive, send, receive), got %d", len(processedBlocks))
	}
	if processedBlocks[3]["type"] != "receive" {
		t.Fatalf("expected only receive for loss")
	}
}
