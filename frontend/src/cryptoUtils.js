import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Generate a pseudo-mnemonic for prototype purposes
 */
export function generateMnemonic() {
    const words = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliet", "kilo", "lima", "mike", "november", "oscar", "papa", "quebec", "romeo", "sierra", "tango", "uniform", "victor", "whiskey", "xray", "yankee", "zulu"];
    let mnemonic = [];
    for(let i=0; i<12; i++) {
        mnemonic.push(words[Math.floor(Math.random() * words.length)]);
    }
    return mnemonic.join(" ");
}

/**
 * Derive deterministic keypair from a seed string (mnemonic) and account index (BIP-44 style)
 */
export async function deriveKeypair(mnemonic, index = 0) {
    const derivationPath = `m/44'/1337'/${index}'`;
    const msgBuffer = new TextEncoder().encode(mnemonic + derivationPath);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const seed = new Uint8Array(hashBuffer);
    const kp = nacl.sign.keyPair.fromSeed(seed);
    const boxKp = nacl.box.keyPair.fromSecretKey(seed);
    
    return {
        publicKey: bs58.encode(kp.publicKey),
        privateKey: bs58.encode(kp.secretKey),
        boxPublicKey: bs58.encode(boxKp.publicKey),
        boxPrivateKey: bs58.encode(boxKp.secretKey),
        mnemonic: mnemonic,
        index: index,
        derivationPath: derivationPath
    };
}

/**
 * Generate a new Ed25519 Keypair (nacl.sign.keyPair)
 */
export async function generateKeypair() {
    const mnemonic = generateMnemonic();
    return await deriveKeypair(mnemonic);
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
