# Parity Testing

This directory documents the mirrored replay parity campaign between:
- `bobcoin-consensus` Node reference lattice
- `go-lattice` durable SQLite-backed recovery suite

## Generated Matrix
- `parity-scenario-matrix.md` — generated summary of the active mirrored replay scenarios, shared fixture fragments, and concrete Node/Go test references.

## Source Catalogs
The generated matrix is derived from:
- `testing/parity-scenarios.json`
- `testing/parity-fixture-fragments.json`

## Regeneration
From the repository root:

```bash
npm run parity:matrix
```
