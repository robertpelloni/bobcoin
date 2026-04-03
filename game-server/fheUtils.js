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

export async function homomorphicAddPlain(cipherTextBase64, plainValue) {
    const { seal, context } = await initFHE();
    const encoder = new seal.BatchEncoder(context);
    const evaluator = new seal.Evaluator(context);

    const cipherText = new seal.Ciphertext();
    cipherText.loadFromBase64(context, cipherTextBase64);

    const array = BigInt64Array.from([BigInt(plainValue)]);
    const plainText = new seal.Plaintext();
    encoder.encode(array, plainText);

    evaluator.addPlain(cipherText, plainText, cipherText);

    return cipherText.saveToBase64(seal.ComprModeType.none);
}

export async function homomorphicMultiplyPlain(cipherTextBase64, plainValue) {
    const { seal, context } = await initFHE();
    const encoder = new seal.BatchEncoder(context);
    const evaluator = new seal.Evaluator(context);

    const cipherText = new seal.Ciphertext();
    cipherText.loadFromBase64(context, cipherTextBase64);

    const array = BigInt64Array.from([BigInt(plainValue)]);
    const plainText = new seal.Plaintext();
    encoder.encode(array, plainText);

    evaluator.multiplyPlain(cipherText, plainText, cipherText);
    
    return cipherText.saveToBase64(seal.ComprModeType.none);
}
