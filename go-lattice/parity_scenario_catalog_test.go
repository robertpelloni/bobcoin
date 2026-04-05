package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

type parityScenarioCatalog struct {
	Version   int              `json:"version"`
	Scenarios []parityScenario `json:"scenarios"`
}

type parityScenario struct {
	ID                  string   `json:"id"`
	Category            string   `json:"category"`
	Features            []string `json:"features"`
	Accounts            int      `json:"accounts"`
	DurableRecoveryInGo bool     `json:"durableRecoveryInGo"`
	NodeReplayCovered   bool     `json:"nodeReplayCovered"`
	Expectations        []string `json:"expectations"`
}

func TestParityScenarioCatalogTracksMirroredRecoveryCoverage(t *testing.T) {
	catalogPath := filepath.Clean(filepath.Join("..", "testing", "parity-scenarios.json"))
	data, err := os.ReadFile(catalogPath)
	if err != nil {
		t.Fatalf("failed to read parity scenario catalog %q: %v", catalogPath, err)
	}

	var catalog parityScenarioCatalog
	if err := json.Unmarshal(data, &catalog); err != nil {
		t.Fatalf("failed to parse parity scenario catalog: %v", err)
	}
	if catalog.Version < 1 {
		t.Fatalf("expected positive scenario catalog version, got %d", catalog.Version)
	}

	scenariosByID := make(map[string]parityScenario, len(catalog.Scenarios))
	for _, scenario := range catalog.Scenarios {
		scenariosByID[scenario.ID] = scenario
	}

	requiredScenarioIDs := []string{
		"same_timestamp_governance_swap",
		"same_timestamp_governance_swap_nft",
		"same_timestamp_governance_swap_nft_manifest",
		"multi_account_same_timestamp_mixed",
		"demurrage_multi_account_same_timestamp_mixed",
	}

	for _, scenarioID := range requiredScenarioIDs {
		scenario, ok := scenariosByID[scenarioID]
		if !ok {
			t.Fatalf("expected scenario catalog to include %q", scenarioID)
		}
		if scenario.Category != "mirrored-replay" {
			t.Fatalf("expected scenario %q to remain in mirrored-replay category, got %q", scenarioID, scenario.Category)
		}
		if !scenario.DurableRecoveryInGo {
			t.Fatalf("expected scenario %q to be marked as durable Go recovery coverage", scenarioID)
		}
		if !scenario.NodeReplayCovered {
			t.Fatalf("expected scenario %q to be marked as covered by Node replay tests", scenarioID)
		}
		if len(scenario.Expectations) == 0 {
			t.Fatalf("expected scenario %q to document expectations", scenarioID)
		}
	}

	demurrageScenario := scenariosByID["demurrage_multi_account_same_timestamp_mixed"]
	if demurrageScenario.Accounts < 3 {
		t.Fatalf("expected demurrage multi-account scenario to involve at least 3 accounts, got %d", demurrageScenario.Accounts)
	}
	foundDemurrage := false
	for _, feature := range demurrageScenario.Features {
		if feature == "demurrage" {
			foundDemurrage = true
			break
		}
	}
	if !foundDemurrage {
		t.Fatalf("expected demurrage scenario to declare demurrage feature")
	}
}
