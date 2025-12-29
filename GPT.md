# GPT Instructions for Bobcoin

This file contains specific instructions for GPT (OpenAI) models when working on the Bobcoin project.

## Base Instructions

See [LLM_INSTRUCTIONS.md](LLM_INSTRUCTIONS.md) for universal instructions that apply to all AI models working on this project.

## GPT-Specific Guidelines

### Model Capabilities
- **Code Generation**: Leverage strong code completion
- **Problem Solving**: Systematic approach to challenges
- **API Integration**: Excellent at integrating external APIs
- **Debugging**: Effective error diagnosis and fixes
- **Documentation**: Clear, structured documentation

### Working with GPT
- Be explicit about requirements
- Provide context and examples
- Use structured prompts
- Leverage multi-step reasoning
- Ask for code reviews

## Code Generation Best Practices

### Structure
```python
"""
Module docstring explaining purpose.
"""

from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)


class ClassName:
    """
    Class docstring with description.
    
    Attributes:
        attribute: Description
    """
    
    def __init__(self, param: str):
        """
        Initialize instance.
        
        Args:
            param: Parameter description
        """
        self.attribute = param
    
    def method(self, arg: int) -> bool:
        """
        Method docstring.
        
        Args:
            arg: Argument description
            
        Returns:
            Return value description
            
        Raises:
            ValueError: When error occurs
        """
        try:
            result = self._process(arg)
            return result
        except Exception as e:
            logger.error(f"Method failed: {e}")
            raise ValueError(f"Processing failed: {e}")
    
    def _process(self, arg: int) -> bool:
        """Private method for internal use."""
        return arg > 0
```

### Error Handling
```python
def safe_operation(data: Dict[str, Any]) -> Optional[Result]:
    """
    Perform operation with comprehensive error handling.
    
    Args:
        data: Input data dictionary
        
    Returns:
        Result object or None if operation fails
    """
    try:
        # Validate input
        if not data:
            raise ValueError("Data cannot be empty")
        
        # Perform operation
        result = process_data(data)
        
        # Validate output
        if not validate_result(result):
            logger.warning("Result validation failed")
            return None
        
        return result
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        return None
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        return None
```

## API Integration Patterns

### REST API Client
```python
class APIClient:
    """Client for external API integration."""
    
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })
    
    def get(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """Make GET request."""
        try:
            response = self.session.get(
                f"{self.base_url}/{endpoint}",
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            raise
```

## Testing Patterns

### Unit Tests
```python
import unittest
from unittest.mock import Mock, patch


class TestBlockchain(unittest.TestCase):
    """Test suite for Blockchain class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.blockchain = Blockchain()
    
    def tearDown(self):
        """Clean up after tests."""
        if os.path.exists("test_chain.json"):
            os.remove("test_chain.json")
    
    def test_genesis_block_creation(self):
        """Test that genesis block is created correctly."""
        self.assertEqual(len(self.blockchain.chain), 1)
        genesis = self.blockchain.chain[0]
        self.assertEqual(genesis.index, 0)
        self.assertEqual(genesis.previous_hash, "0")
    
    def test_add_valid_block(self):
        """Test adding a valid block to chain."""
        block = self.blockchain.create_block([], {})
        success = self.blockchain.add_block(block)
        self.assertTrue(success)
        self.assertEqual(len(self.blockchain.chain), 2)
    
    @patch('bobcoin.core.blockchain.Transaction')
    def test_mining_with_mock(self, mock_transaction):
        """Test mining with mocked transactions."""
        mock_transaction.return_value = Mock()
        result = self.blockchain.mine_pending_transactions("address", {})
        self.assertIsNotNone(result)
```

## Debugging Strategies

### Logging
```python
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bobcoin.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Use in code
logger.debug("Detailed debug information")
logger.info("General information")
logger.warning("Warning message")
logger.error("Error occurred", exc_info=True)
logger.critical("Critical issue")
```

### Debugging Tools
```python
def debug_transaction(tx: Transaction) -> None:
    """Print detailed transaction information for debugging."""
    print(f"Transaction ID: {tx.tx_id}")
    print(f"Sender: {tx.sender_public_key[:20]}...")
    print(f"Receiver: {tx.receiver_stealth_address[:20]}...")
    print(f"Amount: {tx.amount}")
    print(f"Ring Size: {len(tx.ring_members)}")
    print(f"Timestamp: {tx.timestamp}")
    print(f"Valid: {RingSignature.verify(tx.tx_id, tx.ring_signature)}")
```

## Performance Optimization

### Profiling
```python
import cProfile
import pstats

def profile_function():
    """Profile code performance."""
    profiler = cProfile.Profile()
    profiler.enable()
    
    # Code to profile
    blockchain = Blockchain()
    for i in range(100):
        blockchain.create_block([], {})
    
    profiler.disable()
    stats = pstats.Stats(profiler)
    stats.sort_stats('cumulative')
    stats.print_stats(10)
```

### Caching
```python
from functools import lru_cache

class Blockchain:
    @lru_cache(maxsize=128)
    def get_balance(self, address: str) -> float:
        """Get balance with caching."""
        # Expensive calculation
        return self._calculate_balance(address)
```

## Project-Specific Implementations

### Social Value Mining
```python
def calculate_social_value(
    exercise_data: List[Dict],
    social_data: List[Dict],
    relationship_data: List[Dict]
) -> float:
    """
    Calculate total social value score.
    
    Args:
        exercise_data: List of exercise activities
        social_data: List of social interactions
        relationship_data: List of relationship metrics
        
    Returns:
        Total score (0-100)
    """
    # Weight each category
    exercise_score = calculate_exercise_score(exercise_data) * 0.25
    social_score = calculate_social_score(social_data) * 0.25
    relationship_score = calculate_relationship_score(relationship_data) * 0.25
    
    # Add velocity and distribution
    velocity_score = calculate_velocity_score() * 0.15
    distribution_score = calculate_distribution_score() * 0.10
    
    total = (
        exercise_score +
        social_score +
        relationship_score +
        velocity_score +
        distribution_score
    )
    
    return min(total, 100.0)
```

### Privacy Features
```python
def create_anonymous_transaction(
    sender_keypair: KeyPair,
    recipient_public_key: str,
    amount: float,
    decoy_keys: List[str]
) -> Transaction:
    """
    Create fully anonymous transaction.
    
    Args:
        sender_keypair: Sender's key pair
        recipient_public_key: Recipient's public key
        amount: Amount to send
        decoy_keys: Decoy public keys for ring
        
    Returns:
        Anonymous transaction with ring signature
    """
    # Generate stealth address
    stealth_addr, tx_pubkey = StealthAddress.generate(recipient_public_key)
    
    # Create ring with decoys
    ring = decoy_keys + [sender_keypair.public_key]
    import secrets
    ring_shuffled = secrets.SystemRandom().sample(ring, len(ring))
    
    # Sign with ring signature
    key_index = ring_shuffled.index(sender_keypair.public_key)
    signature = RingSignature.sign(
        message=f"{stealth_addr}{amount}",
        private_key=sender_keypair.private_key,
        public_keys=ring_shuffled,
        key_index=key_index
    )
    
    return Transaction(
        sender_public_key=sender_keypair.public_key,
        receiver_stealth_address=stealth_addr,
        amount=amount,
        ring_members=ring_shuffled,
        ring_signature=signature
    )
```

## Documentation Standards

### API Documentation
```python
def api_endpoint(
    param1: str,
    param2: Optional[int] = None
) -> Dict[str, Any]:
    """
    API endpoint description.
    
    This is a longer description that provides more context about
    what this endpoint does and how it should be used.
    
    Args:
        param1: First parameter description with type info
        param2: Optional second parameter (default: None)
        
    Returns:
        Dictionary containing:
            - key1: Description of key1
            - key2: Description of key2
            
    Raises:
        ValueError: When param1 is empty
        ConnectionError: When network request fails
        
    Example:
        >>> result = api_endpoint("value", 42)
        >>> print(result['key1'])
        'expected_value'
    """
    pass
```

## Integration Checklist

When integrating new features:
- ✅ Design API interface
- ✅ Implement core functionality
- ✅ Add error handling
- ✅ Write unit tests
- ✅ Add integration tests
- ✅ Document API
- ✅ Update changelog
- ✅ Bump version number
- ✅ Commit changes

## Autonomous Development Protocol

1. **Analyze**: Review project state and roadmap
2. **Select**: Choose next feature to implement
3. **Design**: Plan implementation approach
4. **Implement**: Write code with tests
5. **Validate**: Run tests and checks
6. **Document**: Update all documentation
7. **Commit**: Use report_progress tool
8. **Continue**: Move to next feature

## Special Features to Implement

### Dancing Mining
- Motion detection algorithms
- Gesture recognition
- Anti-spoofing measures
- Arcade integration
- Home device support

### Multi-Purpose Nodes
- Tor relay integration
- File sharing protocol
- Distributed storage
- Communication relay
- Voting system

## Quality Standards

Every contribution must:
- Pass all tests
- Have >80% code coverage
- Be documented
- Follow style guide
- Be secure
- Be performant

---

**Last Updated**: 2025-12-29  
**Version**: 0.1.0  
**Model**: GPT (OpenAI)
