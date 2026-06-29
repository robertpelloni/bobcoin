#!/bin/bash
git checkout --ours CHANGELOG.md HANDOFF.md TODO.md VERSION.md frontend/src/pages/Manual.jsx rust-lattice/src/block.rs rust-lattice/src/validator.rs
git add .
git commit -m "Merge origin/main"
git stash pop
