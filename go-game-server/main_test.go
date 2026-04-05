package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func newTestService(t *testing.T) *Service {
	t.Helper()
	tmp := t.TempDir()
	cfg := Config{
		Port:               "0",
		LatticeURL:         "http://localhost:4001",
		SupernodeURL:       "http://localhost:8081",
		DBPath:             tmp + "/test.sqlite",
		WalletFile:         tmp + "/wallet.json",
		ZKServiceURL:       "",
		FHEOracleBridgeURL: "",
	}
	service, err := NewService(cfg)
	if err != nil {
		t.Fatalf("failed to create test service: %v", err)
	}
	t.Cleanup(func() {
		_ = service.db.Close()
	})
	return service
}

func TestVerifyProofUsesBridgeWhenAvailable(t *testing.T) {
	bridge := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/verify" {
			t.Fatalf("expected /verify path, got %s", r.URL.Path)
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "verified": true})
	}))
	defer bridge.Close()

	service := newTestService(t)
	service.cfg.ZKServiceURL = bridge.URL

	proof := map[string]interface{}{"publicValues": map[string]interface{}{"score": float64(1)}}
	if !service.verifyProof(map[string]interface{}{"score": float64(1)}, proof) {
		t.Fatalf("expected bridge verification result to be used")
	}
}

func TestVerifyProofFallsBackToScoreThreshold(t *testing.T) {
	service := newTestService(t)

	if !service.verifyProof(map[string]interface{}{"score": float64(1000)}, map[string]interface{}{"publicValues": map[string]interface{}{"score": float64(1000)}}) {
		t.Fatalf("expected score threshold fallback to pass high score")
	}
	if service.verifyProof(map[string]interface{}{"score": float64(999)}, map[string]interface{}{"publicValues": map[string]interface{}{"score": float64(999)}}) {
		t.Fatalf("expected score threshold fallback to reject low score")
	}
}

func TestFHEOracleBridgeEndpoint(t *testing.T) {
	bridge := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var payload map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("failed to decode bridge payload: %v", err)
		}
		if payload["cipherText"] != "cipher-123" {
			t.Fatalf("expected cipherText to be forwarded")
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "resultCipher": "result-456"})
	}))
	defer bridge.Close()

	service := newTestService(t)
	service.cfg.FHEOracleBridgeURL = bridge.URL

	req := httptest.NewRequest(http.MethodPost, "/fhe-oracle", strings.NewReader(`{"cipherText":"cipher-123"}`))
	rec := httptest.NewRecorder()
	service.handleFHEOracle(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 from FHE oracle bridge, got %d", rec.Code)
	}
	var body map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to decode FHE bridge response: %v", err)
	}
	if body["resultCipher"] != "result-456" {
		t.Fatalf("expected bridged result cipher, got %v", body["resultCipher"])
	}
}

func TestMatchmakingSignalingFlow(t *testing.T) {
	service := newTestService(t)
	mux := http.NewServeMux()
	mux.HandleFunc("/", service.handleRoot)
	server := httptest.NewServer(withCORS(mux))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/"
	connOne, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect first websocket client: %v", err)
	}
	defer connOne.Close()
	connTwo, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect second websocket client: %v", err)
	}
	defer connTwo.Close()

	if err := connOne.WriteJSON(SignalMessage{Type: "FIND_MATCH"}); err != nil {
		t.Fatalf("failed to queue first player: %v", err)
	}
	if err := connTwo.WriteJSON(SignalMessage{Type: "FIND_MATCH"}); err != nil {
		t.Fatalf("failed to queue second player: %v", err)
	}

	_ = connOne.SetReadDeadline(time.Now().Add(2 * time.Second))
	_ = connTwo.SetReadDeadline(time.Now().Add(2 * time.Second))
	var msgOne, msgTwo SignalMessage
	if err := connOne.ReadJSON(&msgOne); err != nil {
		t.Fatalf("failed to read first matchmaking response: %v", err)
	}
	if err := connTwo.ReadJSON(&msgTwo); err != nil {
		t.Fatalf("failed to read second matchmaking response: %v", err)
	}
	if msgOne.Type != "MATCH_FOUND" || !msgOne.Initiator {
		t.Fatalf("expected first player to become initiator, got %+v", msgOne)
	}
	if msgTwo.Type != "MATCH_FOUND" || msgTwo.Initiator {
		t.Fatalf("expected second player to become receiver, got %+v", msgTwo)
	}

	signalPayload := map[string]interface{}{"offer": "demo-offer"}
	if err := connOne.WriteJSON(SignalMessage{Type: "SIGNAL", Signal: signalPayload}); err != nil {
		t.Fatalf("failed to send signal through matchmaking channel: %v", err)
	}
	_ = connTwo.SetReadDeadline(time.Now().Add(2 * time.Second))
	var relayed SignalMessage
	if err := connTwo.ReadJSON(&relayed); err != nil {
		t.Fatalf("failed to read relayed signal: %v", err)
	}
	if relayed.Type != "SIGNAL" {
		t.Fatalf("expected SIGNAL relay, got %+v", relayed)
	}

	if err := connOne.Close(); err != nil {
		t.Fatalf("failed to close initiator connection: %v", err)
	}
	_ = connTwo.SetReadDeadline(time.Now().Add(2 * time.Second))
	var disconnect SignalMessage
	if err := connTwo.ReadJSON(&disconnect); err != nil {
		t.Fatalf("failed to read disconnect notice: %v", err)
	}
	if disconnect.Type != "OPPONENT_DISCONNECTED" {
		t.Fatalf("expected opponent disconnect notice, got %+v", disconnect)
	}
}
