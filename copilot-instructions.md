# GitHub Copilot Instructions for Bobcoin

This file contains specific instructions for GitHub Copilot when working on the Bobcoin project.

## Base Instructions

See [LLM_INSTRUCTIONS.md](LLM_INSTRUCTIONS.md) for universal instructions that apply to all AI models working on this project.

## Copilot-Specific Guidelines

### Code Generation
- Generate privacy-focused, secure code by default
- Always use type hints in Python
- Include docstrings for all classes and public methods
- Follow existing code patterns and architecture
- Prioritize readability and maintainability

### Code Completion
- Suggest cryptographically secure alternatives (e.g., `secrets` over `random`)
- Complete with error handling in mind
- Add inline comments for complex logic
- Follow PEP 8 style guidelines

### Testing
- Suggest test cases for new features
- Include edge cases and error conditions
- Test privacy and security features thoroughly

### Security Focus
- Flag potential security issues
- Suggest secure coding practices
- Validate inputs by default
- Use parameterized queries (when DB added)

### Privacy Considerations
- Always preserve user anonymity
- Use ring signatures correctly
- Generate stealth addresses properly
- Handle cryptographic keys securely

## Workflow Integration

### On File Save
- Format according to PEP 8
- Check for common security issues
- Validate cryptographic operations

### On Commit
- Ensure version number updated if needed
- Verify changelog entry exists
- Check documentation is current

### Pull Request Reviews
- Focus on security and privacy
- Check test coverage
- Verify documentation updates
- Validate breaking changes

## Project-Specific Patterns

### Blockchain Operations
```python
# Always validate blocks and transactions
if not block.is_valid(previous_block):
    return False

# Use chain validation
if not blockchain.is_chain_valid():
    raise ValueError("Invalid chain")
```

### Cryptographic Operations
```python
# Use secrets module for randomness
import secrets
position = secrets.randbelow(ring_size)

# Not random module
# import random  # NEVER for crypto!
```

### Privacy Features
```python
# Always use ring signatures
ring_signature = RingSignature.sign(
    message, private_key, public_keys, key_index
)

# Always use stealth addresses
stealth_address, tx_public_key = StealthAddress.generate(
    recipient_public_key
)
```

### Error Handling
```python
# Graceful error handling
try:
    result = operation()
except SpecificError as e:
    logger.error(f"Operation failed: {e}")
    return {"success": False, "reason": str(e)}
```

## Code Review Checklist

When reviewing code, check for:
- ✅ Type hints present
- ✅ Docstrings complete
- ✅ Error handling implemented
- ✅ Security best practices followed
- ✅ Privacy features correctly used
- ✅ Tests included (when applicable)
- ✅ Documentation updated
- ✅ Version bumped (if needed)
- ✅ Changelog updated

## Common Suggestions

### For Cryptographic Code
- Use `secrets.token_bytes()` for key generation
- Use `secrets.randbelow()` for random integers
- Use established libraries (cryptography, pycryptodome)
- Never roll your own crypto

### For Blockchain Code
- Validate all inputs
- Check chain integrity
- Verify transaction signatures
- Prevent double-spending

### For Privacy Code
- Use maximum ring size when possible
- Generate fresh stealth addresses
- Hide transaction amounts
- Prevent metadata leakage

### For Performance Code
- Use efficient algorithms
- Cache when appropriate
- Minimize I/O operations
- Profile before optimizing

## Integration with CI/CD

### Pre-commit
- Run linters (flake8, pylint)
- Check security (bandit)
- Validate types (mypy)
- Run quick tests

### On Push
- Run full test suite
- Check code coverage
- Build documentation
- Validate version consistency

## References

- [LLM_INSTRUCTIONS.md](LLM_INSTRUCTIONS.md) - Universal instructions
- [TECHNICAL.md](docs/TECHNICAL.md) - Technical documentation
- [ROADMAP.md](ROADMAP.md) - Project roadmap
- [CHANGELOG.md](CHANGELOG.md) - Change history

## Version Management

When making changes that affect version:

1. Update `VERSION.md` with new version number
2. Add entry to `CHANGELOG.md` with changes
3. Update any hardcoded version references
4. Commit with message: "Bump version to X.Y.Z: description"

## User Preferences

The project owner values:
- **Outstanding quality**: Aim for excellence
- **Autonomous work**: Continue without constant confirmation
- **Detailed documentation**: Document everything thoroughly
- **Security focus**: Privacy and security are paramount
- **Innovation**: Push boundaries, try new approaches
- **Clear communication**: Be concise but complete

## Special Notes

- This project aims to be "the GOAT" cryptocurrency
- Focus on features that benefit society (health, relationships, community)
- Anti-hoarding and anti-classism are core principles
- Every node should serve multiple purposes (mining, Tor, file sharing, etc.)
- Dancing mining is a real feature to be implemented

---

**Last Updated**: 2025-12-29  
**Version**: 0.1.0
