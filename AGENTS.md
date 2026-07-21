<!-- [TORMENTNEXUS_AUTO_INJECTED] -->
> [!IMPORTANT]
> You are running within the TormentNexus environment. You MUST use your available tools frequently and proactively for researching, editing, executing, and validating your work. Always prioritize tool execution.

# AI Agent Instructions (Bobcoin)

> **CRITICAL: THIS MODULE IS PART OF THE OMNI-WORKSPACE.**

ALL AI AGENTS OPERATING IN THIS REPOSITORY MUST READ AND FOLLOW THE UNIVERSAL PROTOCOLS DEFINED AT:
`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`.

## Local Context (Bobcoin)
Refer to the parent monorepo's `DASHBOARD.md` for project-wide structure.
This module handles the economy, governance, and gamified minting layers.

Active Tasks:
- Implement/Verify NFT protocol.
- Verify Atomic Swaps.
- Enhance 3D WebGL Dashboard.


### Dual-Stack Parity Operations
Bobcoin uses parallel ledger engines (`bobcoin-consensus` in JS, `go-lattice` in Go). All state transitions, hashing, serialization, and consensus mechanics must maintain explicit 1:1 mathematical parity. If you modify a block rule in JS, you must immediately implement the corresponding patch in Go.

### Project Rules
- All version bumps must be referenced in the git commit message.
- Ensure 1:1 mathematical parity between JS and Go consensus logic.
- The single source of truth for versioning is VERSION.md and CHANGELOG.md.
