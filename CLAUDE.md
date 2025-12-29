# Claude Instructions for Bobcoin

This file contains specific instructions for Claude (Anthropic) when working on the Bobcoin project.

## Base Instructions

See [LLM_INSTRUCTIONS.md](LLM_INSTRUCTIONS.md) for universal instructions that apply to all AI models working on this project.

## Claude-Specific Capabilities

### Strengths to Leverage
- **Long Context**: Use full context to understand project history
- **Detailed Analysis**: Provide thorough analysis of code and architecture
- **Security Focus**: Deep security reviews and recommendations
- **Code Quality**: High-quality, well-structured code generation
- **Documentation**: Comprehensive, clear documentation

### Working Style
- Think through problems systematically
- Consider edge cases and error conditions
- Provide detailed explanations when needed
- Ask clarifying questions when requirements unclear
- Work autonomously when direction is clear

## Task Approach

### For New Features
1. **Understand**: Read requirements and existing code thoroughly
2. **Design**: Plan architecture before implementing
3. **Research**: Investigate best practices and similar implementations
4. **Implement**: Write clean, tested, documented code
5. **Validate**: Test thoroughly, including edge cases
6. **Document**: Update all relevant documentation
7. **Review**: Self-review for quality and security

### For Bug Fixes
1. **Reproduce**: Understand the bug completely
2. **Diagnose**: Identify root cause
3. **Fix**: Implement minimal, targeted fix
4. **Test**: Verify fix and check for regressions
5. **Document**: Update changelog and comments

### For Refactoring
1. **Analyze**: Understand current implementation
2. **Plan**: Design improved structure
3. **Incremental**: Make small, testable changes
4. **Validate**: Ensure no behavior changes
5. **Document**: Explain improvements

## Code Quality Standards

### Python Code
- Type hints on all function signatures
- Comprehensive docstrings (Google or NumPy style)
- Error handling with specific exceptions
- Logging for important operations
- Clean, readable code structure

### Cryptographic Code
- Always use `secrets` module for randomness
- Use established cryptographic libraries
- Validate all cryptographic inputs
- Document security considerations
- Consider timing attack vulnerabilities

### Blockchain Code
- Validate all inputs and state transitions
- Ensure atomicity of operations
- Handle concurrent access carefully
- Optimize for performance where needed
- Document consensus rules clearly

## Security Review Checklist

When reviewing or writing code, verify:
- ✅ No use of `random` for security-critical operations
- ✅ Proper input validation
- ✅ No hardcoded secrets or keys
- ✅ Secure key storage and handling
- ✅ Protection against common attacks (injection, XSS, etc.)
- ✅ Proper error handling (no information leakage)
- ✅ Cryptographic best practices followed
- ✅ Privacy features correctly implemented

## Documentation Standards

### Code Documentation
- Module-level docstrings explaining purpose
- Class docstrings with usage examples
- Method docstrings with parameters and returns
- Inline comments for complex logic
- Type hints for static analysis

### User Documentation
- Clear, concise explanations
- Code examples for all features
- Architecture diagrams (ASCII art)
- API references
- Troubleshooting guides

### Developer Documentation
- Setup instructions
- Development workflow
- Testing procedures
- Deployment process
- Contributing guidelines

## Project-Specific Patterns

### Blockchain Operations
```python
def add_block(self, block: Block) -> bool:
    """
    Add a new block to the chain.
    
    Args:
        block: Block to add
        
    Returns:
        True if block was added successfully
        
    Raises:
        ValueError: If block is invalid
    """
    previous_block = self.get_latest_block()
    
    if not block.is_valid(previous_block):
        raise ValueError("Invalid block")
    
    self.chain.append(block)
    self.save_chain()
    return True
```

### Privacy Features
```python
def create_transaction(
    self,
    recipient: str,
    amount: float,
    ring_size: int = 32
) -> Transaction:
    """
    Create a privacy-enhanced transaction.
    
    Args:
        recipient: Recipient's public key
        amount: Amount to send
        ring_size: Size of anonymity set (default: 32)
        
    Returns:
        Privacy-enhanced transaction
        
    Raises:
        ValueError: If ring_size < 16 or insufficient balance
    """
    if ring_size < RingSignature.MIN_RING_SIZE:
        raise ValueError(f"Ring size must be at least {RingSignature.MIN_RING_SIZE}")
    
    # Generate stealth address for recipient
    stealth_address, tx_public_key = StealthAddress.generate(recipient)
    
    # Create ring signature
    ring_members = RingSignature.generate_ring(self.public_key, ring_size)
    key_index = ring_members.index(self.public_key)
    
    message = f"{stealth_address}{amount}"
    ring_signature = RingSignature.sign(
        message, self.private_key, ring_members, key_index
    )
    
    return Transaction(
        sender_public_key=self.public_key,
        receiver_stealth_address=stealth_address,
        amount=amount,
        ring_members=ring_members,
        ring_signature=ring_signature
    )
```

## Multi-Step Task Protocol

For complex tasks:

1. **Break Down**: Divide into manageable subtasks
2. **Prioritize**: Order by dependencies and importance
3. **Implement**: Complete one subtask at a time
4. **Validate**: Test after each subtask
5. **Document**: Update docs as you go
6. **Review**: Check overall quality at end
7. **Commit**: Use report_progress tool with clear message

## Communication Style

### With User
- Be clear and professional
- Provide context for decisions
- Ask questions when uncertain
- Acknowledge feedback positively
- Show progress regularly

### In Code
- Self-documenting code structure
- Clear variable and function names
- Comprehensive comments
- Meaningful error messages

## Version and Changelog Management

### When to Bump Version
- **PATCH** (0.1.X): Bug fixes, small improvements
- **MINOR** (0.X.0): New features, backward compatible
- **MAJOR** (X.0.0): Breaking changes, major milestones

### Changelog Entry Template
```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New feature description

### Changed
- Modification description

### Fixed
- Bug fix description

### Security
- Security improvement description
```

## Autonomous Work Guidelines

When working autonomously:

1. **Read Context**: Understand full project state
2. **Plan**: Identify what needs to be done
3. **Prioritize**: Choose most important/valuable tasks
4. **Implement**: Work through systematically
5. **Validate**: Test thoroughly
6. **Document**: Update all docs
7. **Commit**: Regular commits with clear messages
8. **Continue**: Move to next task without stopping

## Research Guidelines

When researching:

1. **Web Search**: Use for latest information
2. **Documentation**: Check official docs
3. **Best Practices**: Review industry standards
4. **Similar Projects**: Learn from others
5. **Document**: Record findings clearly
6. **Apply**: Implement learned concepts

## Error Recovery

When encountering errors:

1. **Don't Stop**: Errors are learning opportunities
2. **Diagnose**: Understand the root cause
3. **Research**: Look up error messages
4. **Try Alternatives**: Multiple approaches
5. **Document**: Record solution for future
6. **Continue**: Resume work

## Special Project Considerations

### Dancing Mining
- Research motion capture technologies
- Consider accuracy vs. accessibility
- Plan for arcade/home use
- Design verification algorithms
- Prevent cheating/spoofing

### Multi-Purpose Nodes
- Plan resource allocation
- Consider network bandwidth
- Design modular architecture
- Ensure compatibility
- Document integration points

### Zero Fees
- Optimize transaction size
- Batch operations efficiently
- Design incentive mechanisms
- Consider network sustainability

## User's Vision

Remember the user wants:
- "The GOAT" cryptocurrency
- Total anonymity and privacy
- Extremely high volume and speed
- Dancing mining (unique!)
- Multi-purpose nodes (Tor, file sharing, voting, etc.)
- Anti-hoarding, anti-classism
- Social good (exercise, relationships, community)
- Outstanding, phenomenal, magnificent work

## Quality Bar

Every contribution should be:
- **Secure**: No vulnerabilities
- **Private**: Protects user anonymity
- **Fast**: Optimized for performance
- **Tested**: Thoroughly validated
- **Documented**: Clearly explained
- **Maintainable**: Clean, readable code

---

**Last Updated**: 2025-12-29  
**Version**: 0.1.0  
**Model**: Claude (Anthropic)
