# Gemini Instructions for Bobcoin

This file contains specific instructions for Gemini (Google) when working on the Bobcoin project.

## Base Instructions

See [LLM_INSTRUCTIONS.md](LLM_INSTRUCTIONS.md) for universal instructions that apply to all AI models working on this project.

## Gemini-Specific Guidelines

### Model Strengths
- **Multimodal**: Can process code, documentation, and diagrams
- **Code Analysis**: Strong at understanding complex codebases
- **Research**: Excellent at finding and synthesizing information
- **Systematic**: Methodical approach to problem-solving
- **Integration**: Good at connecting different parts of a system

### Working Style
- Analyze thoroughly before acting
- Consider multiple approaches
- Provide detailed explanations
- Use structured thinking
- Test assumptions

## Code Quality Focus

### Clean Code Principles
```python
# Good: Clear, self-documenting
def calculate_mining_reward(block_height: int, base_reward: float) -> float:
    """Calculate mining reward with halving."""
    halvings = block_height // HALVING_INTERVAL
    return base_reward / (2 ** halvings)

# Avoid: Unclear, no documentation
def calc(h, r):
    return r / (2 ** (h // 210000))
```

### Type Safety
```python
from typing import List, Dict, Optional, Union, TypedDict

class TransactionData(TypedDict):
    """Type definition for transaction data."""
    tx_id: str
    amount: float
    timestamp: float
    verified: bool

def process_transactions(
    transactions: List[TransactionData]
) -> Dict[str, float]:
    """Process transactions with full type safety."""
    results: Dict[str, float] = {}
    for tx in transactions:
        if tx['verified']:
            results[tx['tx_id']] = tx['amount']
    return results
```

## Research and Analysis

### When Researching Technology
1. **Survey**: Review multiple sources
2. **Compare**: Analyze different approaches
3. **Evaluate**: Assess pros and cons
4. **Document**: Record findings clearly
5. **Recommend**: Provide actionable suggestions

### Example Research Template
```markdown
## Research: [Topic]

### Overview
Brief description of what was researched and why.

### Sources
- Source 1: [URL/Reference]
- Source 2: [URL/Reference]
- Source 3: [URL/Reference]

### Findings
- Key finding 1
- Key finding 2
- Key finding 3

### Analysis
Detailed analysis of findings and their implications.

### Recommendations
1. Recommendation with rationale
2. Recommendation with rationale

### Implementation Notes
Technical considerations for implementation.
```

## Architecture Design

### System Design Approach
```python
"""
System Architecture: Multi-Purpose Node

Components:
1. Blockchain Core - Handles transactions and blocks
2. Mining Module - Social value verification
3. Tor Relay - Anonymous networking
4. File Sharing - Distributed storage
5. Communication - Anonymous messaging
6. Voting System - Democratic decision-making

Data Flow:
User -> API Gateway -> Component Manager -> Individual Components
                                          -> Response Aggregator -> User

Resource Allocation:
- CPU: 40% blockchain, 20% Tor, 20% file sharing, 20% other
- Memory: Dynamic allocation based on load
- Network: Prioritized queue system
"""

class MultiPurposeNode:
    """
    Node serving multiple functions simultaneously.
    
    Architecture supports modular components that can be
    enabled/disabled independently while sharing resources.
    """
    
    def __init__(self, config: NodeConfig):
        self.blockchain = BlockchainComponent(config.blockchain)
        self.tor = TorRelayComponent(config.tor) if config.enable_tor else None
        self.files = FileShareComponent(config.files) if config.enable_files else None
        self.comm = CommunicationComponent(config.comm) if config.enable_comm else None
        self.voting = VotingComponent(config.voting) if config.enable_voting else None
        
        self.resource_manager = ResourceManager([
            self.blockchain,
            self.tor,
            self.files,
            self.comm,
            self.voting
        ])
```

## Performance Optimization

### Profiling and Optimization
```python
import time
from contextlib import contextmanager

@contextmanager
def timer(description: str):
    """Context manager for timing operations."""
    start = time.perf_counter()
    yield
    elapsed = time.perf_counter() - start
    print(f"{description}: {elapsed:.4f}s")

# Usage
with timer("Block validation"):
    is_valid = blockchain.is_chain_valid()

# Optimization example
def optimized_balance_calculation(address: str) -> float:
    """
    Optimized balance calculation using caching and indexing.
    
    Before: O(n * m) where n=blocks, m=transactions
    After: O(1) with index, O(n) without
    """
    # Check cache first
    if address in self.balance_cache:
        return self.balance_cache[address]
    
    # Use transaction index if available
    if hasattr(self, 'tx_index'):
        transactions = self.tx_index.get(address, [])
        balance = sum(tx.amount for tx in transactions)
    else:
        # Fallback to full scan
        balance = self._calculate_balance_slow(address)
    
    # Update cache
    self.balance_cache[address] = balance
    return balance
```

## Testing Strategy

### Comprehensive Test Suite
```python
import pytest
from unittest.mock import Mock, patch, MagicMock

class TestSocialValueMining:
    """Comprehensive test suite for social value mining."""
    
    @pytest.fixture
    def miner(self):
        """Create miner instance for tests."""
        return SocialValueMiner("test_address")
    
    def test_exercise_proof_valid(self, miner):
        """Test adding valid exercise proof."""
        proof = {
            "duration_minutes": 30,
            "intensity": 1.2,
            "source": "test"
        }
        miner.add_exercise_proof(proof)
        assert miner.current_proof.exercise_score > 0
    
    def test_exercise_proof_invalid_duration(self, miner):
        """Test exercise proof with invalid duration."""
        proof = {
            "duration_minutes": -10,  # Invalid
            "intensity": 1.0,
            "source": "test"
        }
        with pytest.raises(ValueError):
            miner.add_exercise_proof(proof)
    
    @pytest.mark.parametrize("duration,expected_score", [
        (10, 16.7),
        (30, 50.1),
        (60, 100.2),
    ])
    def test_exercise_scoring(self, miner, duration, expected_score):
        """Test exercise scoring for different durations."""
        proof = {"duration_minutes": duration, "intensity": 1.0, "source": "test"}
        miner.add_exercise_proof(proof)
        assert abs(miner.current_proof.exercise_score - expected_score) < 1.0
    
    def test_mining_threshold(self, miner):
        """Test that mining requires minimum score."""
        # Below threshold
        assert not miner.can_mine()
        
        # Add enough proofs to exceed threshold
        for _ in range(5):
            miner.add_exercise_proof({
                "duration_minutes": 20,
                "intensity": 1.0,
                "source": "test"
            })
        
        # Above threshold
        assert miner.can_mine()
```

## Security Analysis

### Security Review Checklist
```python
def security_review_checklist():
    """
    Comprehensive security review checklist.
    
    Cryptographic Security:
    - [ ] All randomness uses secrets module
    - [ ] Key generation uses secure methods
    - [ ] No hardcoded keys or secrets
    - [ ] Proper key storage and rotation
    
    Input Validation:
    - [ ] All user inputs validated
    - [ ] Type checking enforced
    - [ ] Range checking for numeric inputs
    - [ ] Sanitization for string inputs
    
    Privacy:
    - [ ] Ring signatures properly implemented
    - [ ] Stealth addresses used correctly
    - [ ] No metadata leakage
    - [ ] Timing attack prevention
    
    Network Security:
    - [ ] TLS/SSL for communications
    - [ ] Rate limiting implemented
    - [ ] DDoS protection considered
    - [ ] Secure defaults
    
    Code Security:
    - [ ] No SQL injection vulnerabilities
    - [ ] No XSS vulnerabilities
    - [ ] Proper error handling
    - [ ] Logging doesn't expose secrets
    """
    pass
```

## Documentation Excellence

### Comprehensive Module Documentation
```python
"""
Bobcoin Social Value Mining Module.

This module implements the revolutionary Proof of Social Value consensus
mechanism that rewards participants for healthy behaviors rather than
computational work or capital stake.

Architecture:
    - SocialValueMiner: Main miner class
    - ExerciseVerifier: Validates exercise activities
    - SocialVerifier: Validates social interactions
    - RelationshipVerifier: Validates relationship health

Usage:
    >>> miner = SocialValueMiner("address")
    >>> miner.add_exercise_proof({
    ...     "duration_minutes": 30,
    ...     "intensity": 1.2,
    ...     "source": "fitness_tracker"
    ... })
    >>> if miner.can_mine():
    ...     proof = miner.create_proof()
    ...     blockchain.mine_pending_transactions("address", proof.to_dict())

See Also:
    - docs/TECHNICAL.md: Technical specification
    - examples/demo.py: Complete usage example
    - ROADMAP.md: Future enhancements

Author: Bobcoin Development Team
License: [To be determined]
Version: 0.1.0
"""
```

## Integration Patterns

### Game Integration Template
```python
class GameIntegration:
    """
    Base class for game economy integrations.
    
    Provides common functionality for all game types while
    allowing customization for specific game mechanics.
    """
    
    def __init__(self, blockchain: Blockchain, config: GameConfig):
        self.blockchain = blockchain
        self.config = config
        self.player_sessions: Dict[str, List[Session]] = {}
    
    def record_session(
        self,
        player: str,
        session_data: Dict[str, Any]
    ) -> SessionResult:
        """Record a game session and calculate rewards."""
        # Validate session data
        if not self.validate_session(session_data):
            return SessionResult(success=False, reason="Invalid session data")
        
        # Calculate rewards based on game-specific rules
        reward = self.calculate_reward(session_data)
        
        # Apply multipliers
        reward = self.apply_multipliers(reward, session_data)
        
        # Record in blockchain
        self.blockchain.add_transaction(
            self.create_reward_transaction(player, reward)
        )
        
        # Store session
        if player not in self.player_sessions:
            self.player_sessions[player] = []
        self.player_sessions[player].append(Session(session_data, reward))
        
        return SessionResult(success=True, reward=reward)
    
    def validate_session(self, data: Dict[str, Any]) -> bool:
        """Validate session data. Override in subclasses."""
        raise NotImplementedError
    
    def calculate_reward(self, data: Dict[str, Any]) -> float:
        """Calculate base reward. Override in subclasses."""
        raise NotImplementedError
    
    def apply_multipliers(
        self,
        base_reward: float,
        data: Dict[str, Any]
    ) -> float:
        """Apply game-specific multipliers."""
        multiplier = 1.0
        
        # Social multiplier
        if data.get('multiplayer', False):
            multiplier *= 1.5
        
        # Difficulty multiplier
        difficulty_mult = {
            'easy': 0.8,
            'normal': 1.0,
            'hard': 1.5,
            'extreme': 2.0
        }
        multiplier *= difficulty_mult.get(data.get('difficulty', 'normal'), 1.0)
        
        return base_reward * multiplier
```

## Future Feature Planning

### Dancing Mining Implementation Plan
```python
"""
Dancing Mining Feature Specification

Objective:
    Enable users to mine Bobcoin by dancing, verified through
    motion capture or accelerometer data.

Components:
    1. Motion Capture Interface
        - Webcam-based pose estimation
        - Wearable device integration
        - Arcade machine sensors
    
    2. Dance Verification
        - Pattern recognition algorithms
        - Movement quality assessment
        - Anti-spoofing measures
    
    3. Reward Calculation
        - Duration-based rewards
        - Complexity bonuses
        - Style variety bonuses
        - Group dance multipliers

Implementation Phases:
    Phase 1: Basic motion detection
    Phase 2: Dance pattern recognition
    Phase 3: Quality assessment
    Phase 4: Arcade integration
    Phase 5: Social/group features

Technical Requirements:
    - Real-time processing (<100ms latency)
    - Offline capability (sync later)
    - Low bandwidth (works on mobile data)
    - Privacy-preserving (no video storage)

Research Needed:
    - Pose estimation models (MediaPipe, OpenPose)
    - Motion analysis algorithms
    - Anti-spoofing techniques
    - Arcade hardware integration
"""

class DanceMiningVerifier:
    """Verifies dance activities for mining rewards."""
    
    def __init__(self):
        self.pose_estimator = PoseEstimator()
        self.pattern_recognizer = DancePatternRecognizer()
        self.anti_spoof = AntiSpoofingSystem()
    
    def verify_dance_session(
        self,
        motion_data: MotionData,
        duration: int
    ) -> VerificationResult:
        """Verify a dance session for mining."""
        # Extract poses from motion data
        poses = self.pose_estimator.extract_poses(motion_data)
        
        # Check for spoofing
        if not self.anti_spoof.verify_authentic(poses):
            return VerificationResult(
                verified=False,
                reason="Possible spoofing detected"
            )
        
        # Recognize dance patterns
        patterns = self.pattern_recognizer.identify_patterns(poses)
        
        # Calculate quality score
        quality = self.calculate_dance_quality(poses, patterns)
        
        # Calculate reward
        reward = self.calculate_reward(duration, quality, patterns)
        
        return VerificationResult(
            verified=True,
            quality_score=quality,
            patterns_recognized=len(patterns),
            reward=reward
        )
```

## Autonomous Development

When working autonomously:
1. Review full project context
2. Check roadmap for priorities
3. Select high-value features
4. Design thoroughly
5. Implement incrementally
6. Test comprehensively
7. Document completely
8. Commit regularly
9. Continue to next task

## Quality Metrics

Track these metrics:
- Code coverage: >80%
- Documentation coverage: 100%
- Security scan: 0 issues
- Performance: <400ms block time
- Test pass rate: 100%

---

**Last Updated**: 2025-12-29  
**Version**: 0.1.0  
**Model**: Gemini (Google)
