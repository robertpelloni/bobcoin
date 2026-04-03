import crypto from 'crypto';

/**
 * Generate a new Ed25519 Keypair
 */
export function generateKeypair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    return {
        publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('hex'),
        // In production, keep privateKey secure. We export as hex for simplicity in this prototype.
        privateKey: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex')
    };
}

/**
 * Hash data using SHA-256
 */
export function hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Sign data with private key
 */
export function sign(data, privateKeyHex) {
    const privateKey = crypto.createPrivateKey({
        key: Buffer.from(privateKeyHex, 'hex'),
        format: 'der',
        type: 'pkcs8'
    });
    return crypto.sign(null, Buffer.from(data), privateKey).toString('hex');
}

/**
 * Verify signature with public key
 */
export function verify(data, signatureHex, publicKeyHex) {
    const publicKey = crypto.createPublicKey({
        key: Buffer.from(publicKeyHex, 'hex'),
        format: 'der',
        type: 'spki'
    });
    return crypto.verify(null, Buffer.from(data), publicKey, Buffer.from(signatureHex, 'hex'));
}
