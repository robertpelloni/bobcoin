import { generateFHEKeys, encryptInt, decryptInt, initFHE } from './frontend/src/fheUtils.js';
import { homomorphicAddPlain, homomorphicMultiplyPlain } from './game-server/fheUtils.js';

async function testFHE() {
    try {
        console.log("1. Generating FHE Keys...");
        const { secretKey, publicKey, context, seal } = await generateFHEKeys();

        const initialScore = 5000;
        console.log("2. Encrypting Base Score:", initialScore);
        const cipherTextBase64 = await encryptInt(initialScore, publicKey, context, seal);

        console.log("3. Sending CipherText to Server Oracle...");
        console.log("Server multiplying by 2...");
        const multipliedCipher = await homomorphicMultiplyPlain(cipherTextBase64, 2);

        console.log("Server adding 500 bonus...");
        const finalCipher = await homomorphicAddPlain(multipliedCipher, 500);

        console.log("4. User Decrypting final ciphertext...");
        const result = await decryptInt(finalCipher, secretKey, context, seal);
        
        console.log(`Final Decrypted Result: ${result} (Expected: ${(initialScore * 2) + 500})`);
        
        if (result === 10500) {
            console.log("✅ FHE White-Magic Privacy Computation is SUCCESSFUL!");
        } else {
            console.error("❌ FHE Computation Failed!");
        }

    } catch (e) {
        console.error("Test Failed:");
        console.error(e.stack);
    }
}

testFHE();
