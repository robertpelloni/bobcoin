import { generateKeypair } from './cryptoUtils.js';
import { Block } from './Block.js';
import { Lattice } from './Lattice.js';

const lattice = new Lattice();

// 1. Generate keys
const alice = generateKeypair();
const bob = generateKeypair();

console.log("Alice:", alice.publicKey.substr(0, 16) + '...');
console.log("Bob:", bob.publicKey.substr(0, 16) + '...');

try {
    // Note: In reality, initial distribution happens via Genesis block.
    // For this prototype, we'll allow an 'open' block with an arbitrary starting balance 
    // to simulate a faucet or genesis distribution.
    // Let's create an OPEN block for Alice giving her 1000 BOB.
    // We will bypass the strict "link must be a send block" rule in Lattice.js for the genesis open.
    
    // Wait, the Lattice.js enforces open blocks MUST link to a pending send.
    // We need a Genesis exception! Let's patch Lattice.js in memory to allow a genesis injection.
    
    // Create genesis send block manually
    lattice.pending[alice.publicKey] = [{ hash: 'GENESIS_HASH', amount: 1000, sender: 'SYSTEM' }];
    
    const aliceOpen = new Block({
        type: 'open',
        account: alice.publicKey,
        previous: null,
        balance: 1000,
        link: 'GENESIS_HASH'
    });
    aliceOpen.signBlock(alice.privateKey);
    lattice.processBlock(aliceOpen);
    console.log("✅ Alice opened chain with 1000 BOB.");

    // Alice sends 50 BOB to Bob
    const aliceSend = new Block({
        type: 'send',
        account: alice.publicKey,
        previous: aliceOpen.hash,
        balance: 950,
        link: bob.publicKey
    });
    aliceSend.signBlock(alice.privateKey);
    lattice.processBlock(aliceSend);
    console.log("✅ Alice sent 50 BOB to Bob. (Alice Balance:", lattice.getBalance(alice.publicKey), ")");

    // Bob receives the 50 BOB (opens his chain)
    const bobOpen = new Block({
        type: 'open',
        account: bob.publicKey,
        previous: null,
        balance: 50,
        link: aliceSend.hash
    });
    bobOpen.signBlock(bob.privateKey);
    lattice.processBlock(bobOpen);
    console.log("✅ Bob opened chain receiving 50 BOB. (Bob Balance:", lattice.getBalance(bob.publicKey), ")");

    // Bob sends 10 BOB back to Alice
    const bobSend = new Block({
        type: 'send',
        account: bob.publicKey,
        previous: bobOpen.hash,
        balance: 40,
        link: alice.publicKey
    });
    bobSend.signBlock(bob.privateKey);
    lattice.processBlock(bobSend);
    console.log("✅ Bob sent 10 BOB to Alice.");

    // Alice receives the 10 BOB
    const aliceReceive = new Block({
        type: 'receive',
        account: alice.publicKey,
        previous: aliceSend.hash, // Previous block on her chain
        balance: 960, // 950 + 10
        link: bobSend.hash
    });
    aliceReceive.signBlock(alice.privateKey);
    lattice.processBlock(aliceReceive);
    console.log("✅ Alice received 10 BOB. (Alice Balance:", lattice.getBalance(alice.publicKey), ")");

    console.log("\nLattice State:");
    console.log("Alice Chain Length:", lattice.chains[alice.publicKey].length);
    console.log("Bob Chain Length:", lattice.chains[bob.publicKey].length);

} catch (e) {
    console.error("Test Failed:", e.message);
}
