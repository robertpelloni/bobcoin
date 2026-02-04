# Proof of Play (SP1 Circuit)

This directory contains the Zero-Knowledge Circuit for Bobcoin's "Proof of Play" mechanism.
It is built using [SP1](https://github.com/succinctlabs/sp1), a zkVM that proves the execution of Rust programs.

## Prerequisites

You need the SP1 toolchain installed to compile this program for the RISC-V zkVM.

```bash
curl -L https://sp1.succinct.xyz | bash
source $HOME/.bashrc
sp1up
```

## Building

To compile the program into an ELF binary executable by the SP1 zkVM:

```bash
cargo prove build
```

This will output the ELF to `elf/riscv32im-succinct-zkvm-elf`.

## Logic

The program (`src/main.rs`) validates that a claimed game score matches the individual judgment counts (Perfects, Greats, Misses).
It ensures:
1. `score == perfects * 100 + greats * 50`
2. `score <= 1,000,000`

If valid, it commits the score and a boolean `true` to the public output.

## Integration (Game Server)

The `game-server` directory contains a Node.js Host application that:
1.  Accepts proofs (simulated or real) via HTTP POST.
2.  Verifies the public values match the score.
3.  Interacts with the `supertorrent` bridge to mint tokens.

To run the Verifier:
```bash
cd ../game-server
npm start
```
