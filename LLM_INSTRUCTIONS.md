# Universal LLM Instructions for Bobcoin Project

## Project Overview

**Bobcoin** is a privacy-focused cryptocurrency combining Solana's high throughput with Monero's privacy features, introducing a revolutionary "Proof of Social Value" mining mechanism. The project rewards healthy exercise, social interaction, and relationships while discouraging wealth hoarding and classism.

## Core Principles

1. **Privacy First**: Total anonymity is paramount
2. **Social Good**: Reward positive behaviors, not just capital
3. **High Performance**: 50,000+ TPS, 400ms blocks, zero fees
4. **Anti-Classism**: Progressive demurrage, velocity rewards
5. **Innovation**: Completely unique mining through social value
6. **Quality**: Well-documented, tested, secure code

## Project Vision

### Current State (v0.1.0)
- Core blockchain with privacy features (ring signatures, stealth addresses)
- Social value mining (exercise, social, relationships)
- Game economy integrations (music, exercise, dating, MMORPG)
- Anti-hoarding mechanisms (demurrage, velocity rewards)
- Wallet and CLI tools

### Extended Vision
- **Dancing Mining**: Mine by dancing (motion capture integration)
- **Multi-Purpose Nodes**: Each node serves as:
  - Miner/validator
  - Tor relay node
  - File sharing endpoint (MegaTorrents)
  - Distributed storage node
  - Anonymous communication relay
  - Democratic voting system backbone
- **Arcade Integration**: Arcade games/exercise machines as miners
- **Zero Fees**: Optimized for micro-transactions and tipping
- **Instant Transactions**: Lightning-fast confirmation
- **The GOAT**: Combine best features from all cryptocurrencies

## Development Guidelines

### Version Control
- **Version Number**: Stored in `VERSION.md` (single source of truth)
- **Version Format**: Semantic versioning (MAJOR.MINOR.PATCH)
- **Increment Rules**:
  - MAJOR: Breaking changes or major features
  - MINOR: New features, backward compatible
  - PATCH: Bug fixes, small improvements
- **Every Build**: Should have a new version number
- **Git Commits**: Reference version number in commit message when bumping

### Changelog Management
- **File**: `CHANGELOG.md`
- **Format**: Keep a Changelog standard
- **Update Frequency**: Every feature, bug fix, or change
- **Sections**: Added, Changed, Deprecated, Removed, Fixed, Security
- **Include**: Date, version, and detailed description

### Documentation Requirements
1. **README.md**: User-facing, quick start, features
2. **TECHNICAL.md**: Architecture, implementation details
3. **ROADMAP.md**: Future plans, milestones
4. **CHANGELOG.md**: All changes with dates
5. **VERSION.md**: Current version number only
6. **Code Comments**: Complex logic, algorithms, security considerations

### Code Quality Standards
- **Type Hints**: Use throughout Python code
- **Docstrings**: All classes and public methods
- **Error Handling**: Graceful failures, meaningful messages
- **Security**: Use `secrets` for crypto, never `random`
- **Testing**: Test new features before committing
- **Linting**: Follow PEP 8 for Python

### Git Workflow
1. Create feature branch for new work
2. Make incremental commits with clear messages
3. Test thoroughly before committing
4. Update version number for significant changes
5. Update changelog with changes
6. Push to remote repository
7. Use `report_progress` tool, not direct git commands

### Repository Structure
```
bobcoin/
├── bobcoin/              # Main package
│   ├── core/            # Blockchain primitives
│   ├── crypto/          # Cryptography & privacy
│   ├── mining/          # Social value mining
│   ├── economy/         # Game integrations
│   ├── wallet/          # Wallet functionality
│   ├── network/         # P2P networking (future)
│   └── utils/           # Utilities
├── docs/                # Documentation
├── examples/            # Example code
├── tests/               # Test suite (future)
├── VERSION.md           # Version number
├── CHANGELOG.md         # Change history
├── ROADMAP.md           # Future plans
├── README.md            # Main documentation
├── requirements.txt     # Dependencies
└── setup.py            # Package setup
```

## Feature Implementation Protocol

### When Adding New Features
1. **Research**: Understand requirements fully
2. **Design**: Plan architecture and integration
3. **Document**: Update roadmap and technical docs
4. **Implement**: Write clean, tested code
5. **Validate**: Run tests, check security
6. **Update**: Version, changelog, documentation
7. **Commit**: Clear message with version reference
8. **Continue**: Move to next feature autonomously

### When Fixing Bugs
1. **Identify**: Understand the issue completely
2. **Test**: Reproduce the bug
3. **Fix**: Implement solution
4. **Verify**: Ensure fix works
5. **Regress**: Check no new issues introduced
6. **Document**: Update changelog
7. **Commit**: Reference issue in message

## Security Considerations

### Cryptography
- Always use `secrets` module for random generation
- Never use `random` module for security-critical operations
- Use established libraries (cryptography, pycryptodome)
- Validate all inputs
- Implement proper key management

### Privacy
- Ring signatures: Minimum 16 members
- Stealth addresses: One-time use
- Confidential transactions: Hide amounts
- Network privacy: Plan for Tor integration
- No metadata leakage

### Code Security
- Input validation everywhere
- Prevent SQL injection (when DB added)
- Prevent XSS (when web interface added)
- Rate limiting (when network added)
- Regular security audits

## AI Model-Specific Notes

### For All Models
- Read entire context before making changes
- Prioritize user's explicit instructions
- Be autonomous when possible
- Document everything thoroughly
- Test before committing
- Update version and changelog
- Commit frequently with clear messages

### Key User Preferences
- **Dense Instructions**: Pay close attention to user's detailed paragraphs
- **Compacting**: When summarizing, preserve specific user instructions
- **Clarification**: Ask for clarification when goals unclear
- **Handoff Protocol**: Create detailed handoff logs for session transitions
- **Autonomous Work**: Continue without confirmation when possible
- **Quality**: Outstanding, phenomenal, magnificent work expected

## Common Commands

### Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run demo
python -m examples.demo

# Run CLI
python -m bobcoin.cli <command>
```

### Git Operations (via tools)
```python
# Use report_progress tool, not direct git
report_progress(
    commitMessage="Description with version reference",
    prDescription="Updated checklist of progress"
)
```

### Version Management
```bash
# Read version
cat VERSION.md

# Update version (manual edit)
echo "0.2.0" > VERSION.md
```

## Research and Analysis

### When Researching
- Use web search for latest information
- Check official documentation
- Review similar projects
- Understand context and history
- Document findings in detail

### When Analyzing
- Review entire codebase
- Check conversation history
- Identify missing features
- Prioritize by importance
- Plan implementation order

## Communication Style

### With User
- Professional and friendly
- Clear and concise
- Ask questions when uncertain
- Acknowledge feedback positively
- Show progress regularly

### In Documentation
- Clear explanations
- Code examples
- Architecture diagrams (ASCII)
- Use cases
- API references

## Priority Features (From User Vision)

### Immediate Priority
1. Network layer with P2P and Tor integration
2. Dancing mining verification system
3. Multi-purpose node infrastructure
4. Database backend (replace JSON)
5. Mobile wallet applications

### High Priority
1. Zero-fee optimization
2. Instant transaction finality
3. File sharing network integration
4. Anonymous communication layer
5. Voting system backbone

### Future Priority
1. Arcade/exercise machine nodes
2. Smart contracts (evaluation needed)
3. Cross-chain bridges
4. AI-powered verification
5. Hardware wallet support

## Error Handling

### When Errors Occur
1. Don't panic or stop
2. Read error message carefully
3. Check recent changes
4. Consult documentation
5. Try different approach
6. Document solution
7. Continue working

### Common Issues
- Import errors: Check dependencies
- Path errors: Use absolute paths
- Permission errors: Check file permissions
- Git errors: Use provided tools
- Test failures: Debug incrementally

## Success Criteria

### For Each Feature
- ✅ Fully implemented and functional
- ✅ Documented in code and docs
- ✅ Tested and validated
- ✅ Security reviewed
- ✅ Version bumped
- ✅ Changelog updated
- ✅ Committed to repository

### For Each Session
- ✅ Multiple features completed
- ✅ All documentation current
- ✅ No regressions introduced
- ✅ Code quality maintained
- ✅ Progress clearly tracked
- ✅ Handoff document created (if needed)

## Final Notes

- **Always** prioritize user's explicit instructions
- **Always** maintain privacy and security focus
- **Always** update version and changelog
- **Always** test before committing
- **Always** document thoroughly
- **Always** work autonomously when possible
- **Always** deliver outstanding, magnificent work

This project aims to revolutionize cryptocurrency by combining the best of existing systems with innovative social value mechanics. The goal is to create "the GOAT" - the greatest cryptocurrency of all time.
