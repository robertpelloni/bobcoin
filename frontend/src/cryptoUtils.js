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
 * Hash data using SHA-256 (Web Crypto API)
 */
export async function hashData(dataString) {
    const msgBuffer = new TextEncoder().encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Sign data with private key
 */
export async function signBlock(hashHex, privateKeyBase58) {
    const secretKey = bs58.decode(privateKeyBase58);
    const msgBuffer = new TextEncoder().encode(hashHex); // We sign the hex string of the hash
    const signature = nacl.sign.detached(msgBuffer, secretKey);
    return bs58.encode(signature);
}

/**
 * Verify signature with public key
 */
export function verifySignature(hashHex, signatureBase58, publicKeyBase58) {
    try {
        const signature = bs58.decode(signatureBase58);
        const publicKey = bs58.decode(publicKeyBase58);
        const msgBuffer = new TextEncoder().encode(hashHex);
        return nacl.sign.detached.verify(msgBuffer, signature, publicKey);
    } catch (e) {
        return false;
    }
}

export function encryptMemo(memoString, recipientBoxPublicKeyBase58, senderBoxPrivateKeyBase58) {
    try {
        const recipientPub = bs58.decode(recipientBoxPublicKeyBase58);
        const senderPriv = bs58.decode(senderBoxPrivateKeyBase58);
        const nonce = nacl.randomBytes(nacl.box.nonceLength);
        const msgBuffer = new TextEncoder().encode(memoString);
        
        const encrypted = nacl.box(msgBuffer, nonce, recipientPub, senderPriv);
        
        return {
            nonce: bs58.encode(nonce),
            box: bs58.encode(encrypted)
        };
    } catch (e) {
        throw new Error("Failed to encrypt memo");
    }
}

export function decryptMemo(encryptedBox, nonceBase58, senderBoxPublicKeyBase58, recipientBoxPrivateKeyBase58) {
    try {
        const box = bs58.decode(encryptedBox);
        const nonce = bs58.decode(nonceBase58);
        const senderPub = bs58.decode(senderBoxPublicKeyBase58);
        const recipientPriv = bs58.decode(recipientBoxPrivateKeyBase58);
        
        const decrypted = nacl.box.open(box, nonce, senderPub, recipientPriv);
        if (!decrypted) return null;
        
        return new TextDecoder().decode(decrypted);
    } catch (e) {
        return null;
    }
}
