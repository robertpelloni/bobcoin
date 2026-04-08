# Session Handoff - 2026-04-08 (v8.95.0)

## Executive Summary
This automated summary captures the current state of the Bobcoin mirrored parity campaign and service migration.

## Mirrored Replay Coverage
The ecosystem currently maintains **8** mirrored parity scenarios across Node and Go implementations.

| Scenario | Features | Accounts | Node Test | Go Test |
| --- | --- | ---: | --- | --- |
| governance_driven_fee_change | governance, adjust-fees, dynamic-validation... | 1 | `testScenarioCatalogTracksMirroredReplayCoverage` | `TestFixtureDrivenMirroredScenarios` |
| same_timestamp_governance_swap | governance, vote, htlc... | 2 | `testSameTimestampMixedGovernanceAndSwapSemantics` | `TestRecoveryReplaysSameTimestampMixedGovernanceAndSwapLedgerFromSQLite` |
| same_timestamp_governance_swap_nft | governance, vote, htlc... | 2 | `testSameTimestampGovernanceSwapAndNftSemantics` | `TestRecoveryReplaysSameTimestampGovernanceSwapAndNftLedgerFromSQLite` |
| same_timestamp_governance_swap_nft_manifest | governance, vote, htlc... | 2 | `testSameTimestampGovernanceSwapNftAndManifestSemantics` | `TestRecoveryReplaysSameTimestampGovernanceSwapNftAndManifestLedgerFromSQLite` |
| multi_account_same_timestamp_mixed | governance, vote, market-bid... | 3 | `testMultiAccountSameTimestampMixedLedgerSemantics` | `TestRecoveryReplaysMultiAccountSameTimestampMixedLedgerFromSQLite` |
| demurrage_multi_account_same_timestamp_mixed | demurrage, governance, vote... | 3 | `testDemurrageSensitiveMultiAccountSameTimestampMixedLedgerSemantics` | `TestRecoveryRebuildsDemurrageSensitiveMultiAccountSameTimestampLedgerFromSQLite` |
| multi_account_same_timestamp_dual_collector_actions | governance, vote, multi-vote... | 3 | `testMultiAccountSameTimestampDualCollectorActionsSemantics` | `TestRecoveryReplaysMultiAccountSameTimestampDualCollectorActionsFromSQLite` |
| demurrage_multi_account_same_timestamp_dual_collector_actions | demurrage, governance, vote... | 3 | `testDemurrageSensitiveMultiAccountSameTimestampDualCollectorActionsSemantics` | `TestRecoveryRebuildsDemurrageSensitiveDualCollectorActionLedgerFromSQLite` |

## Reusable Fixture Fragments
**11** conceptual building blocks are shared across implementations:

- `proposer-genesis` (account-bootstrap)
- `proposer-sends-to-voter` (funding-leg)
- `proposer-sends-to-collector` (funding-leg)
- `same-timestamp-governance-core` (same-timestamp-core)
- `same-timestamp-htlc-core` (same-timestamp-core)
- `same-timestamp-nft-core` (same-timestamp-core)
- `collector-market-bid-core` (market-core)
- `collector-vote-extension` (governance-extension)
- `manifest-anchor-core` (anchor-core)
- `governance-fee-adjustment` (governance-extension)
- `demurrage-balance-pressure` (economic-pressure)

## Findings / Analysis
- **Consensus Integrity**: All automated mirrored scenarios pass bit-perfect Merkle Root validation.
- **Deterministic Replay**: Same-timestamp dependency resolution is now an project-wide invariant.
- **Go Migration**: Both Supernode and Game Server now have functional Go control-plane shells with signaling support.
