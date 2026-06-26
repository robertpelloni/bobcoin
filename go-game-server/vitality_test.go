package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandleVitalityProof(t *testing.T) {
	service := &Service{}

	payload := VitalityPayload{
		DeviceID:      "apple-watch-s9-001",
		Steps:         5000,
		HeartRateAvg:  85.5,
		Signature:     "mock-zk-signature",
		WalletAddress: "mock-wallet-address",
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/sdk/v1/vitality", bytes.NewReader(body))
	w := httptest.NewRecorder()

	service.handleVitalityProof(w, req)

	res := w.Result()
	if res.StatusCode != http.StatusOK {
		t.Errorf("Expected 200 OK, got %d", res.StatusCode)
	}

	var data map[string]interface{}
	json.NewDecoder(res.Body).Decode(&data)
	if data["success"] != true {
		t.Errorf("Expected success true, got %v", data["success"])
	}
}

func TestHandleVitalityProof_InsufficientSteps(t *testing.T) {
	service := &Service{}

	payload := VitalityPayload{
		DeviceID:      "apple-watch-s9-001",
		Steps:         500, // Too few
		HeartRateAvg:  85.5,
		Signature:     "mock-zk-signature",
		WalletAddress: "mock-wallet-address",
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/sdk/v1/vitality", bytes.NewReader(body))
	w := httptest.NewRecorder()

	service.handleVitalityProof(w, req)

	res := w.Result()
	if res.StatusCode != http.StatusBadRequest {
		t.Errorf("Expected 400 Bad Request, got %d", res.StatusCode)
	}
}
