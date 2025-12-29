# Agents Instructions for Bobcoin

This file contains instructions for specialized AI agents working on specific aspects of the Bobcoin project.

## Base Instructions

See [LLM_INSTRUCTIONS.md](LLM_INSTRUCTIONS.md) for universal instructions that apply to all AI models and agents working on this project.

## Agent Types

### 1. Security Agent
**Focus**: Security auditing, vulnerability detection, cryptographic review

**Responsibilities**:
- Review all cryptographic implementations
- Check for common vulnerabilities (OWASP Top 10)
- Validate input sanitization
- Ensure secure key management
- Perform regular security audits

**Tools**:
- Bandit (Python security scanner)
- CodeQL (security analysis)
- Custom security checklist
- Penetration testing frameworks

**Output**:
- Security audit reports
- Vulnerability descriptions with severity
- Remediation recommendations
- Security-focused code reviews

### 2. Privacy Agent
**Focus**: Privacy feature implementation and verification

**Responsibilities**:
- Implement ring signatures correctly
- Verify stealth address generation
- Ensure confidential transactions
- Check for metadata leakage
- Prevent timing attacks

**Expertise**:
- Monero privacy features
- Zero-knowledge proofs
- Cryptographic protocols
- Anonymous networking

**Output**:
- Privacy implementation code
- Privacy audit reports
- Recommendations for enhancements
- Privacy-focused documentation

### 3. Performance Agent
**Focus**: Optimization, profiling, scalability

**Responsibilities**:
- Profile code for bottlenecks
- Optimize critical paths
- Implement caching strategies
- Design for scalability
- Monitor resource usage

**Tools**:
- cProfile (Python profiler)
- Memory profiler
- Load testing tools
- Benchmarking frameworks

**Output**:
- Performance reports
- Optimization recommendations
- Scalability analysis
- Benchmarking results

### 4. Testing Agent
**Focus**: Test creation, test coverage, quality assurance

**Responsibilities**:
- Write comprehensive unit tests
- Create integration tests
- Implement end-to-end tests
- Ensure code coverage >80%
- Perform regression testing

**Tools**:
- pytest
- unittest
- coverage.py
- Mock/patch utilities

**Output**:
- Test suites
- Coverage reports
- Test documentation
- Bug reports

### 5. Documentation Agent
**Focus**: Documentation creation and maintenance

**Responsibilities**:
- Write API documentation
- Create user guides
- Maintain technical docs
- Generate code documentation
- Keep docs synchronized with code

**Skills**:
- Clear technical writing
- Diagram creation
- Example code generation
- Tutorial development

**Output**:
- API references
- User guides
- Technical specifications
- Tutorial content

### 6. Integration Agent
**Focus**: External system integration, API development

**Responsibilities**:
- Design integration APIs
- Implement game integrations
- Create SDK libraries
- Manage external dependencies
- Develop webhook systems

**Expertise**:
- REST API design
- WebSocket protocols
- SDK development
- Third-party integrations

**Output**:
- Integration code
- API specifications
- SDK libraries
- Integration documentation

### 7. Blockchain Agent
**Focus**: Core blockchain functionality

**Responsibilities**:
- Implement consensus mechanisms
- Optimize block validation
- Design transaction structures
- Implement chain reorganization
- Handle fork resolution

**Expertise**:
- Blockchain architecture
- Consensus algorithms
- Distributed systems
- Cryptographic primitives

**Output**:
- Blockchain core code
- Consensus implementation
- Chain validation logic
- Technical specifications

### 8. Network Agent
**Focus**: P2P networking, node communication

**Responsibilities**:
- Design network protocols
- Implement peer discovery
- Handle message propagation
- Optimize network traffic
- Integrate Tor/onion routing

**Expertise**:
- P2P networking
- Network protocols
- Distributed systems
- Anonymous networking

**Output**:
- Network layer code
- Protocol specifications
- Network optimization
- Tor integration

### 9. Game Economy Agent
**Focus**: Game integration economies

**Responsibilities**:
- Design reward systems
- Implement game APIs
- Balance economic incentives
- Create anti-cheat mechanisms
- Develop SDKs

**Expertise**:
- Game economics
- Reward systems
- API design
- Anti-cheat mechanisms

**Output**:
- Game integration code
- Economic models
- Game SDKs
- Integration guides

### 10. Social Mining Agent
**Focus**: Social value verification systems

**Responsibilities**:
- Implement verification algorithms
- Design scoring systems
- Create proof validation
- Integrate external data sources
- Prevent gaming the system

**Expertise**:
- Proof systems
- Verification algorithms
- Data integration
- Anti-fraud mechanisms

**Output**:
- Verification code
- Scoring algorithms
- Integration adapters
- Anti-fraud systems

## Agent Coordination

### Communication Protocol
Agents communicate via:
1. **Code Comments**: Tagged with agent type
2. **Documentation**: Shared technical docs
3. **Git Commits**: Clear commit messages
4. **Reports**: Structured output files

### Workflow
```
User Request
    ↓
Project Manager (LLM)
    ↓
Task Assignment
    ↓
┌──────────┬──────────┬──────────┐
│ Agent 1  │ Agent 2  │ Agent 3  │
└────┬─────┴────┬─────┴────┬─────┘
     │          │          │
     └──────────┴──────────┘
              ↓
       Integration
              ↓
     Quality Assurance
              ↓
    Documentation Update
              ↓
      Version & Commit
```

### Handoff Protocol
When one agent completes work and hands off to another:

```markdown
## Agent Handoff: [Source Agent] → [Target Agent]

### Completed Work
- Task 1 description
- Task 2 description

### Code Changes
- File 1: Changes made
- File 2: Changes made

### Next Steps
- [ ] Task for receiving agent
- [ ] Another task

### Context
Important context the receiving agent needs to know.

### Issues
Any issues or concerns to be aware of.
```

## Special Agent: Dancing Mining Agent

**Focus**: Implement motion capture dancing mining system

**Responsibilities**:
- Research motion capture technologies
- Design dance verification algorithms
- Implement pattern recognition
- Create anti-spoofing measures
- Integrate with arcade hardware

**Research Areas**:
- MediaPipe for pose estimation
- OpenPose for body tracking
- Accelerometer data processing
- Gesture recognition algorithms
- Motion quality assessment

**Deliverables**:
- Motion capture interface
- Dance verification system
- Pattern recognition engine
- Arcade machine integration
- Mobile device support

**Implementation Phases**:
1. Research and design (Week 1-2)
2. Basic motion detection (Week 3-4)
3. Pattern recognition (Week 5-6)
4. Quality assessment (Week 7-8)
5. Arcade integration (Week 9-10)
6. Testing and refinement (Week 11-12)

## Special Agent: Multi-Purpose Node Agent

**Focus**: Implement nodes serving multiple functions

**Responsibilities**:
- Design modular node architecture
- Implement Tor relay integration
- Create file sharing system
- Build communication layer
- Develop voting system

**Components**:
1. **Blockchain Node**: Core mining and validation
2. **Tor Relay**: Anonymous networking
3. **File Sharing**: Distributed storage (MegaTorrents)
4. **Communication**: Anonymous messaging
5. **Voting System**: Democratic decision-making

**Resource Management**:
- Dynamic CPU allocation
- Memory prioritization
- Bandwidth optimization
- Storage distribution

**Deliverables**:
- Modular node architecture
- Component implementations
- Resource manager
- Configuration system
- Monitoring dashboard

## Agent Guidelines

### Code Quality
- Follow project style guide
- Write comprehensive tests
- Document all public APIs
- Use type hints
- Handle errors gracefully

### Communication
- Clear commit messages
- Detailed handoff notes
- Regular progress updates
- Document decisions

### Collaboration
- Respect other agents' work
- Don't modify unrelated code
- Coordinate on shared files
- Review each other's work

### Security
- Security-first mindset
- Validate all inputs
- Use secure practices
- Document security considerations

## Version Control

Each agent should:
- Work on feature branches
- Make atomic commits
- Write clear commit messages
- Use report_progress tool
- Update version/changelog

## Quality Metrics

Track per-agent metrics:
- Code coverage
- Bug count
- Feature completion
- Documentation quality
- Security score

## Agent Specialization Matrix

| Agent Type | Primary Skills | Secondary Skills |
|-----------|---------------|------------------|
| Security | Cryptography, Auditing | Testing, Code Review |
| Privacy | Crypto Protocols, Anonymity | Security, Research |
| Performance | Optimization, Profiling | Architecture, Testing |
| Testing | Test Creation, QA | Debugging, Documentation |
| Documentation | Technical Writing | API Design, Examples |
| Integration | API Development, SDKs | Documentation, Testing |
| Blockchain | Consensus, Distributed Systems | Cryptography, Performance |
| Network | P2P Protocols, Networking | Security, Performance |
| Game Economy | Economic Design, APIs | Integration, Documentation |
| Social Mining | Verification, Anti-Fraud | Integration, Testing |

## Future Agent Types

### Planned Agents
1. **AI/ML Agent**: Machine learning for verification and optimization
2. **Hardware Agent**: Physical device integration
3. **Mobile Agent**: Mobile app development
4. **Web Agent**: Web interface development
5. **Governance Agent**: Community governance systems

## Notes

- Agents are virtual roles, not separate systems
- One LLM can act as multiple agents
- Specialization improves quality
- Coordination is essential
- Documentation is critical

---

**Last Updated**: 2025-12-29  
**Version**: 0.1.0  
**For**: All specialized agents working on Bobcoin
