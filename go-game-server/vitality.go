package main

import (
	"encoding/json"
	"net/http"
)

type VitalityPayload struct {
	DeviceID      string  `json:"deviceId"`
	Steps         int     `json:"steps"`
	HeartRateAvg  float64 `json:"heartRateAvg"`
	Signature     string  `json:"signature"`
	WalletAddress string  `json:"wallet"`
}

// handleVitalityProof acts as the gateway for wearable physical mining
func (s *Service) handleVitalityProof(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{"error": "Method not allowed"})
		return
	}

	var req VitalityPayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"error": "Invalid payload structure"})
		return
	}

	// Basic placeholder validation before ZK circuit verification
	if req.Steps < 1000 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"error": "Insufficient steps for vitality proof"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Vitality payload accepted. Proof of Vitality queued for Minting.",
		"reward":  1.5,
	})
}
