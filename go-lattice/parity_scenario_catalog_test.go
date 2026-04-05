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

type parityFixtureFragmentCatalog struct {
	Version   int                     `json:"version"`
	Fragments []parityFixtureFragment `json:"fragments"`
}

type parityScenario struct {
	ID                  string   `json:"id"`
	Category            string   `json:"category"`
	Features            []string `json:"features"`
	Accounts            int      `json:"accounts"`
	DurableRecoveryInGo bool     `json:"durableRecoveryInGo"`
	NodeReplayCovered   bool     `json:"nodeReplayCovered"`
	Fragments           []string `json:"fragments"`
	Expectations        []string `json:"expectations"`
}

type parityFixtureFragment struct {
	ID       string   `json:"id"`
	Category string   `json:"category"`
	Features []string `json:"features"`
}

func TestParityScenarioCatalogTracksMirroredRecoveryCoverage(t *testing.T) {
	scenarioCatalogPath := filepath.Clean(filepath.Join("..", "testing", "parity-scenarios.json"))
	scenarioData, err := os.ReadFile(scenarioCatalogPath)
	if err != nil {
		t.Fatalf("failed to read parity scenario catalog %q: %v", scenarioCatalogPath, err)
	}

	var catalog parityScenarioCatalog
	if err := json.Unmarshal(scenarioData, &catalog); err != nil {
		t.Fatalf("failed to parse parity scenario catalog: %v", err)
	}
	if catalog.Version < 2 {
		t.Fatalf("expected scenario catalog version >= 2 for fixture fragment references, got %d", catalog.Version)
	}

	fragmentCatalogPath := filepath.Clean(filepath.Join("..", "testing", "parity-fixture-fragments.json"))
	fragmentData, err := os.ReadFile(fragmentCatalogPath)
	if err != nil {
		t.Fatalf("failed to read parity fixture fragment catalog %q: %v", fragmentCatalogPath, err)
	}

	var fragmentCatalog parityFixtureFragmentCatalog
	if err := json.Unmarshal(fragmentData, &fragmentCatalog); err != nil {
		t.Fatalf("failed to parse parity fixture fragment catalog: %v", err)
	}
	if fragmentCatalog.Version < 1 {
		t.Fatalf("expected positive fixture fragment catalog version, got %d", fragmentCatalog.Version)
	}

	scenariosByID := make(map[string]parityScenario, len(catalog.Scenarios))
	for _, scenario := range catalog.Scenarios {
		scenariosByID[scenario.ID] = scenario
	}
	fragmentsByID := make(map[string]parityFixtureFragment, len(fragmentCatalog.Fragments))
	for _, fragment := range fragmentCatalog.Fragments {
		fragmentsByID[fragment.ID] = fragment
	}

	requiredScenarioIDs := []string{
		"same_timestamp_governance_swap",
		"same_timestamp_governance_swap_nft",
		"same_timestamp_governance_swap_nft_manifest",
		"multi_account_same_timestamp_mixed",
		"demurrage_multi_account_same_timestamp_mixed",
	}

	requiredFragmentIDs := []string{
		"proposer-genesis",
		"proposer-sends-to-voter",
		"proposer-sends-to-collector",
		"same-timestamp-governance-core",
		"same-timestamp-htlc-core",
		"same-timestamp-nft-core",
		"collector-market-bid-core",
		"manifest-anchor-core",
		"demurrage-balance-pressure",
	}

	for _, fragmentID := range requiredFragmentIDs {
		if _, ok := fragmentsByID[fragmentID]; !ok {
			t.Fatalf("expected fixture fragment catalog to include %q", fragmentID)
		}
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
		if len(scenario.Fragments) == 0 {
			t.Fatalf("expected scenario %q to reference shared fixture fragments", scenarioID)
		}
		for _, fragmentID := range scenario.Fragments {
			if _, ok := fragmentsByID[fragmentID]; !ok {
				t.Fatalf("expected scenario %q to reference known fixture fragment %q", scenarioID, fragmentID)
			}
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
