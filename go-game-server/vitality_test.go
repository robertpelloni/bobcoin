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

func TestHandleVitalityProof_PhysiologicalChecks(t *testing.T) {
	service := &Service{}

	// Impossible heart rate (> 220 bpm)
	payloadHighHR := VitalityPayload{
		DeviceID:      "apple-watch-s9-001",
		Steps:         2500,
		HeartRateAvg:  280.0,
		Cadence:       120.0,
		Signature:     "mock-zk-signature",
		WalletAddress: "mock-wallet-address",
	}
	body, _ := json.Marshal(payloadHighHR)
	req := httptest.NewRequest(http.MethodPost, "/sdk/v1/vitality", bytes.NewReader(body))
	w := httptest.NewRecorder()
	service.handleVitalityProof(w, req)
	if w.Result().StatusCode != http.StatusBadRequest {
		t.Fatalf("Expected 400 for impossible heart rate, got %d", w.Result().StatusCode)
	}

	// Impossible cadence (> 300 steps/min)
	payloadHighCadence := VitalityPayload{
		DeviceID:      "apple-watch-s9-001",
		Steps:         2500,
		HeartRateAvg:  135.0,
		Cadence:       450.0,
		Signature:     "mock-zk-signature",
		WalletAddress: "mock-wallet-address",
	}
	body, _ = json.Marshal(payloadHighCadence)
	req = httptest.NewRequest(http.MethodPost, "/sdk/v1/vitality", bytes.NewReader(body))
	w = httptest.NewRecorder()
	service.handleVitalityProof(w, req)
	if w.Result().StatusCode != http.StatusBadRequest {
		t.Fatalf("Expected 400 for impossible cadence, got %d", w.Result().StatusCode)
	}

	// Impossible calorie burn rate (> 32 kcal/min)
	payloadHighCal := VitalityPayload{
		DeviceID:       "apple-watch-s9-001",
		Steps:          2000,
		HeartRateAvg:   140.0,
		Cadence:        140.0,
		DurationSec:    60.0, // 1 minute
		CaloriesBurned: 100.0, // 100 kcal/min > 32 kcal/min limit
		Signature:      "mock-zk-signature",
		WalletAddress:  "mock-wallet-address",
	}
	body, _ = json.Marshal(payloadHighCal)
	req = httptest.NewRequest(http.MethodPost, "/sdk/v1/vitality", bytes.NewReader(body))
	w = httptest.NewRecorder()
	service.handleVitalityProof(w, req)
	if w.Result().StatusCode != http.StatusBadRequest {
		t.Fatalf("Expected 400 for impossible caloric burn rate, got %d", w.Result().StatusCode)
	}

	// Impossible locomotion speed (> 10.5 m/s)
	payloadSuperSpeed := VitalityPayload{
		DeviceID:      "apple-watch-s9-001",
		Steps:         5000,
		HeartRateAvg:  140.0,
		Cadence:       140.0,
		DurationSec:   50.0, // 5000 steps in 50 seconds -> 75 m/s
		Signature:     "mock-zk-signature",
		WalletAddress: "mock-wallet-address",
	}
	body, _ = json.Marshal(payloadSuperSpeed)
	req = httptest.NewRequest(http.MethodPost, "/sdk/v1/vitality", bytes.NewReader(body))
	w = httptest.NewRecorder()
	service.handleVitalityProof(w, req)
	if w.Result().StatusCode != http.StatusBadRequest {
		t.Fatalf("Expected 400 for superhuman velocity, got %d", w.Result().StatusCode)
	}
}
