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
/**
 * Encrypt the sovereign vault using a user password (AES-256-GCM)
 */
export async function encryptVault(plainData, password) {
    const encoder = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    
    // Derive key from password
    const passwordKey = await window.crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
    const aesKey = await window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
        passwordKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        aesKey,
        encoder.encode(JSON.stringify(plainData))
    );

    return {
        salt: bs58.encode(salt),
        iv: bs58.encode(iv),
        ciphertext: bs58.encode(new Uint8Array(encrypted))
    };
}

/**
 * Decrypt the sovereign vault
 */
export async function decryptVault(vault, password) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const salt = bs58.decode(vault.salt);
    const iv = bs58.decode(vault.iv);
    const ciphertext = bs58.decode(vault.ciphertext);

    const passwordKey = await window.crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
    const aesKey = await window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
        passwordKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );

    const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        aesKey,
        ciphertext
    );

    return JSON.parse(decoder.decode(decrypted));
}

async function deriveAesKey(secret, salt) {
    const encoder = new TextEncoder();
    const baseKey = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

export async function encryptFileForVault(fileBytes, secret) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const aesKey = await deriveAesKey(secret, salt);
    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        fileBytes
    );

    return {
        ciphertext: new Uint8Array(encrypted),
        salt: bs58.encode(salt),
        iv: bs58.encode(iv),
        algorithm: 'AES-256-GCM'
    };
}

export async function decryptFileFromVault(ciphertextBytes, secret, metadata) {
    const salt = bs58.decode(metadata.salt);
    const iv = bs58.decode(metadata.iv);
    const aesKey = await deriveAesKey(secret, salt);

    const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        ciphertextBytes
    );

    return new Uint8Array(decrypted);
}

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

/**
 * Scan and verify whether an ephemeral public key corresponds to a given stealth address
 * for the recipient holding the view secret key and spend public key.
 */
export async function scanStealthAddress(ephemeralPublicKeyBase58, recipientSpendKeyBase58, recipientViewSecretKeyBase58) {
    try {
        const ephemeralPub = bs58.decode(ephemeralPublicKeyBase58);
        const recipientViewSec = bs58.decode(recipientViewSecretKeyBase58);
        const recipientSpendPub = bs58.decode(recipientSpendKeyBase58);

        // Recipient reconstructs shared secret: S = nacl.box.before(ephemeralPub, recipientViewSec)
        const sharedSecret = nacl.box.before(ephemeralPub, recipientViewSec);
        const hashBuf = await crypto.subtle.digest('SHA-256', sharedSecret);
        const tweak = new Uint8Array(hashBuf);

        // P_stealth = SHA256(recipientSpendPub || tweak)
        const combined = new Uint8Array(recipientSpendPub.length + tweak.length);
        combined.set(recipientSpendPub);
        combined.set(tweak, recipientSpendPub.length);
        const stealthBuf = await crypto.subtle.digest('SHA-256', combined);
        const stealthPub = bs58.encode(new Uint8Array(stealthBuf));

        return {
            stealthAddress: `stealth:${stealthPub}`,
            tweak: bs58.encode(tweak),
            matches: (expectedStealth) => expectedStealth === `stealth:${stealthPub}`
        };
    } catch (e) {
        console.error("Failed to scan stealth address:", e);
        return null;
    }
}

/**
 * Generate a Cryptographic Stealth Address using Dual-Key Stealth Address Protocol (DKSAP)
 * Combines ephemeral Diffie-Hellman exchange with spend key derivation.
 */
export async function generateStealthAddress(recipientSpendKeyBase58, recipientViewKeyBase58) {
    try {
        // Ephemeral sender keypair
        const ephemeral = nacl.box.keyPair();
        const recipientViewPub = bs58.decode(recipientViewKeyBase58);
        const recipientSpendPub = bs58.decode(recipientSpendKeyBase58);

        // Shared secret via Diffie-Hellman: S = nacl.box.before(recipientViewPub, ephemeral.secretKey)
        const sharedSecret = nacl.box.before(recipientViewPub, ephemeral.secretKey);

        // Hash shared secret: h = SHA256(sharedSecret)
        const hashBuf = await crypto.subtle.digest('SHA-256', sharedSecret);
        const tweak = new Uint8Array(hashBuf);

        // Stealth destination key: P_stealth = SHA256(recipientSpendPub || tweak)
        const combined = new Uint8Array(recipientSpendPub.length + tweak.length);
        combined.set(recipientSpendPub);
        combined.set(tweak, recipientSpendPub.length);
        const stealthBuf = await crypto.subtle.digest('SHA-256', combined);
        const stealthPub = bs58.encode(new Uint8Array(stealthBuf));
        const ephemeralPub = bs58.encode(ephemeral.publicKey);

        return {
            stealthAddress: `stealth:${stealthPub}`,
            ephemeralPublicKey: ephemeralPub,
            tweak: bs58.encode(tweak)
        };
    } catch (e) {
        console.error("Failed to generate stealth address:", e);
        return null;
    }
}
