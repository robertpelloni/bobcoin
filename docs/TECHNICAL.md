# Bobcoin Technical Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Privacy Implementation](#privacy-implementation)
4. [Social Value Mining](#social-value-mining)
5. [Economy Integrations](#economy-integrations)
6. [Anti-Hoarding System](#anti-hoarding-system)
7. [API Reference](#api-reference)

## Architecture Overview

Bobcoin is a privacy-focused blockchain that combines:

- **Solana's Performance**: 50,000+ TPS with 400ms block times
- **Monero's Privacy**: Ring signatures, stealth addresses, confidential transactions
- **Unique Mining**: Proof of Social Value instead of Proof of Work
- **Social Economics**: Anti-hoarding mechanisms and game integrations

### System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Applications                       │
│  (Music Games, Exercise Games, Dating Apps, MMORPGs)│
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────┐
│              Economy Integration Layer               │
│  (Game APIs, Anti-Hoarding, Reward Distribution)    │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────┐
│            Social Value Mining Layer                 │
│  (Exercise, Social, Relationship Verification)       │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────┐
│              Core Blockchain Layer                   │
│  (Blocks, Transactions, Consensus)                  │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────┐
│              Cryptography Layer                      │
│  (Ring Signatures, Stealth Addresses, Keys)         │
└─────────────────────────────────────────────────────┘
```

## Core Components

### Block Structure

Each block contains:
- Index and timestamp
- List of privacy-enhanced transactions
- Merkle root for efficient verification
- Social value proof (replaces PoW nonce)
- Previous block hash

### Transaction Structure

Transactions include:
- Ring signature (min 16 members)
- Stealth address for receiver
- Confidential amount (Pedersen commitment)
- Key image (prevents double-spending)
- Transaction type and metadata

### Blockchain

The blockchain maintains:
- Chain of blocks with validation
- Pending transaction pool
- Mining reward schedule with halving
- Demurrage calculation
- Chain statistics and validation

## Privacy Implementation

### Ring Signatures

Ring signatures provide sender anonymity with minimum 16 public keys (vs Monero's 11).

### Stealth Addresses

One-time addresses for each transaction prevent address reuse and transaction linking.

### Confidential Transactions

Hide transaction amounts using Pedersen commitments and range proofs.

## Social Value Mining

### Proof of Social Value

Replace computational work with social value contribution.

**Activity Categories:** Exercise (25%), Social (25%), Relationships (25%), Velocity (15%), Distribution (10%)

**Minimum Score**: 25/100 to mine
**Target Score**: 75/100 for optimal rewards
**Reward Multiplier**: 0.5x to 2.0x based on score

## API Reference

See full documentation for complete API details.
