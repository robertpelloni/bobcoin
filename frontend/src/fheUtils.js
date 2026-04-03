let sealInstance = null;

export async function initFHE() {
    if (!sealInstance) {
        const SEAL = await import('node-seal');
        sealInstance = await SEAL.default();
    }
    const schemeType = sealInstance.SchemeType.bfv;
    const securityLevel = sealInstance.SecLevelType.tc128;
    const polyModulusDegree = 4096;
    const bitSizes = [36, 36, 37];
    const bitSize = 20;

    const parms = new sealInstance.EncryptionParameters(schemeType);
    parms.setPolyModulusDegree(polyModulusDegree);
    parms.setCoeffModulus(sealInstance.CoeffModulus.Create(polyModulusDegree, Int32Array.from(bitSizes)));
    parms.setPlainModulus(sealInstance.PlainModulus.Batching(polyModulusDegree, bitSize));

    const context = new sealInstance.SEALContext(parms, true, securityLevel);
    if (!context.parametersSet()) {
        throw new Error("Could not set the encryption parameters");
    }
    return { seal: sealInstance, context };
}

export async function generateFHEKeys() {
    const { seal, context } = await initFHE();
    const keyGenerator = new seal.KeyGenerator(context);
    const secretKey = keyGenerator.secretKey();
    const publicKey = keyGenerator.createPublicKey();
    return { secretKey, publicKey, context, seal };
}

export async function encryptInt(value, publicKey, context, seal) {
    const encoder = new seal.BatchEncoder(context);
    const encryptor = new seal.Encryptor(context, publicKey);
    
    const array = BigInt64Array.from([BigInt(value)]);
    const plainText = new seal.Plaintext();
    encoder.encode(array, plainText);
    
    const cipherText = new seal.Ciphertext();
    encryptor.encrypt(plainText, cipherText);
    
    return cipherText.saveToBase64(seal.ComprModeType.none);
}

export async function decryptInt(cipherTextBase64, secretKey, context, seal) {
    const encoder = new seal.BatchEncoder(context);
    const decryptor = new seal.Decryptor(context, secretKey);
    
    const cipherText = new seal.Ciphertext();
    cipherText.loadFromBase64(context, cipherTextBase64);
    
    const plainText = new seal.Plaintext();
    decryptor.decrypt(cipherText, plainText);
    
    const decoded = encoder.decodeBigInt64(plainText);
    
    return Number(decoded[0]);
}
