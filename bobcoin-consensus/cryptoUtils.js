import crypto from 'crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Generate a new Ed25519 Keypair (nacl.sign.keyPair)
 * Returns keys in Base58 format to be readable by humans (Solana style)
 */
export function generateKeypair() {
    const signKeyPair = nacl.sign.keyPair();
    const boxKeyPair = nacl.box.keyPair();
    return {
        publicKey: bs58.encode(signKeyPair.publicKey),
        privateKey: bs58.encode(signKeyPair.secretKey),
        boxPublicKey: bs58.encode(boxKeyPair.publicKey),
        boxPrivateKey: bs58.encode(boxKeyPair.secretKey)
    };
}

/**
 * Hash data using SHA-256 (Node Native)
 */
export function hash(dataString) {
    return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Sign data with private key
 */
export function sign(hashHex, privateKeyBase58) {
    const secretKey = bs58.decode(privateKeyBase58);
    const msgBuffer = Buffer.from(hashHex, 'utf8');
    const signature = nacl.sign.detached(msgBuffer, secretKey);
    return bs58.encode(signature);
}

/**
 * Verify signature with public key
 */
export function verify(hashHex, signatureBase58, publicKeyBase58) {
    try {
        const signature = bs58.decode(signatureBase58);
        const publicKey = bs58.decode(publicKeyBase58);
        const msgBuffer = Buffer.from(hashHex, 'utf8');
        return nacl.sign.detached.verify(msgBuffer, signature, publicKey);
    } catch (e) {
        return false;
    }
}

/**
 * Encrypt a memo for a recipient
 */
export function encryptMemo(memoString, recipientBoxPublicKeyBase58, senderBoxPrivateKeyBase58) {
    try {
        const recipientPub = bs58.decode(recipientBoxPublicKeyBase58);
        const senderPriv = bs58.decode(senderBoxPrivateKeyBase58);
        
        // Generate a cryptographic nonce (24 bytes)
        const nonce = nacl.randomBytes(nacl.box.nonceLength);
        const msgBuffer = Buffer.from(memoString, 'utf8');
        
        const encrypted = nacl.box(msgBuffer, nonce, recipientPub, senderPriv);
        
        return {
            nonce: bs58.encode(nonce),
            box: bs58.encode(encrypted)
        };
    } catch (e) {
        throw new Error("Failed to encrypt memo: " + e.message);
    }
}

/**
 * Decrypt a memo from a sender
 */
export function decryptMemo(encryptedBox, nonceBase58, senderBoxPublicKeyBase58, recipientBoxPrivateKeyBase58) {
    try {
        const box = bs58.decode(encryptedBox);
        const nonce = bs58.decode(nonceBase58);
        const senderPub = bs58.decode(senderBoxPublicKeyBase58);
        const recipientPriv = bs58.decode(recipientBoxPrivateKeyBase58);
        
        const decrypted = nacl.box.open(box, nonce, senderPub, recipientPriv);
        if (!decrypted) return null; // Decryption failed
        
        return Buffer.from(decrypted).toString('utf8');
    } catch (e) {
        return null;
    }
}
