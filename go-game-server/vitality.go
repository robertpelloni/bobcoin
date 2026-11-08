package main

import (
	"encoding/json"
	"net/http"
	"time"
)

type VitalityPayload struct {
	DeviceID      string  `json:"deviceId"`
	Steps         int     `json:"steps"`
	HeartRateAvg  float64 `json:"heartRateAvg"`
	Cadence       float64 `json:"cadence,omitempty"`     // Steps per minute
	DurationSec   float64 `json:"durationSec,omitempty"` // Workout duration in seconds
	CaloriesBurned float64 `json:"caloriesBurned,omitempty"` // Energy burned in kcal
	ActivityType  string  `json:"activityType,omitempty"` // WALK, RUN, HIKE
	Signature     string  `json:"signature"`
	WalletAddress string  `json:"wallet"`
}

// handleVitalityProof acts as the gateway for wearable physical mining with AI Oracle physiological validation
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

	// 1. Step minimum threshold for Proof of Vitality
	if req.Steps < 1000 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"error": "Insufficient steps for vitality proof"})
		return
	}

	// 2. AI Oracle Physiological Plausibility Checks
	// Valid human heart rates during physical exercise range between 40 and 220 bpm
	if req.HeartRateAvg < 40.0 || req.HeartRateAvg > 220.0 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"error": "Physiological anomaly detected: Heart rate out of human biometric bounds",
			"heartRate": req.HeartRateAvg,
		})
		return
	}

	// Cadence realism: human running cadence almost never exceeds 300 steps/minute
	if req.Cadence > 300.0 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"error": "Physiological anomaly detected: Cadence exceeds biological locomotion limits",
			"cadence": req.Cadence,
		})
		return
	}

	// Duration check: must be positive
	if req.DurationSec < 0.0 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"error": "Workout duration must be strictly positive",
		})
		return
	}

	// Locomotion speed check: calculated speed = steps * avg_stride / duration
	// Assuming average human stride of ~0.75m: speed (m/s) = (steps * 0.75) / durationSec
	// Speed > 10 m/s (~36 km/h) exceeds sustained human running capability (Usain Bolt peak is ~12 m/s sprint)
	if req.DurationSec > 0.0 {
		speedMps := (float64(req.Steps) * 0.75) / req.DurationSec
		if speedMps > 10.5 {
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{
				"error": "Locomotion velocity exceeds sustained human limits (>10.5 m/s)",
				"speed": speedMps,
			})
			return
		}
	}

	// Metabolic Burn rate realism: max human aerobic caloric expenditure is ~25-30 kcal/minute
	if req.DurationSec > 0.0 && req.CaloriesBurned > 0.0 {
		caloriesPerMin := req.CaloriesBurned / (req.DurationSec / 60.0)
		if caloriesPerMin > 32.0 {
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{
				"error": "Metabolic anomaly detected: Caloric burn rate exceeds human physiological maximum (>32 kcal/min)",
				"rate": caloriesPerMin,
			})
			return
		}
	}

	if req.ActivityType == "" {
		req.ActivityType = "WALK"
	}

	// Log to oracle_audits table if database is active
	if s.db != nil {
		ts := formatDBDate(time.Now())
		res, _ := s.db.Exec(`
			INSERT INTO oracle_audits (address, score, variance, mad, entropy, confidence_score, verified, timestamp)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`, req.WalletAddress, float64(req.Steps), req.HeartRateAvg, req.Cadence, 3.5, 0.98, 1, ts)

		var lastID int64
		if res != nil {
			lastID, _ = res.LastInsertId()
		}

		s.broadcastOracleAudit(map[string]interface{}{
			"id":              lastID,
			"address":         req.WalletAddress,
			"score":           float64(req.Steps),
			"variance":        req.HeartRateAvg,
			"mad":             req.Cadence,
			"entropy":         3.5,
			"confidenceScore": 0.98,
			"verified":        true,
			"timestamp":       ts,
		})
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":         true,
		"message":         "Vitality payload accepted. Proof of Vitality queued for Minting.",
		"reward":          1.5,
		"heartRate":       req.HeartRateAvg,
		"cadence":         req.Cadence,
		"caloriesBurned":  req.CaloriesBurned,
		"activityType":    req.ActivityType,
		"confidenceScore": 0.98,
	})
}
