const DEFAULT_SUPERNODE_ORIGIN = import.meta.env.VITE_SUPERNODE_URL || 'http://localhost:8000';
const WASM_EXEC_URL = import.meta.env.VITE_WASM_EXEC_URL || `${DEFAULT_SUPERNODE_ORIGIN}/wasm_exec.js`;
const STORAGE_WASM_URL = import.meta.env.VITE_STORAGE_WASM_URL || `${DEFAULT_SUPERNODE_ORIGIN}/storage.wasm`;

let clientPromise = null;

function ensureBrowser() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('Storage WASM client must run in a browser environment.');
    }
}

function ensureUint8Array(value, name) {
    if (!(value instanceof Uint8Array)) {
        throw new TypeError(`${name} must be a Uint8Array`);
    }
}

async function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-storage-wasm="${src}"]`);
        if (existing) {
            if (existing.dataset.loaded === 'true') {
                resolve();
                return;
            }
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.dataset.storageWasm = src;
        script.onload = () => {
            script.dataset.loaded = 'true';
            resolve();
        };
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

async function ensureGoRuntime() {
    ensureBrowser();

    if (typeof window.Go !== 'undefined') {
        return window.Go;
    }

    await loadScript(WASM_EXEC_URL);
    if (typeof window.Go === 'undefined') {
        throw new Error('Go runtime failed to initialize. Confirm wasm_exec.js is being served.');
    }

    return window.Go;
}

export async function sha256Hex(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createStorageWasmClient() {
    ensureBrowser();

    if (clientPromise) {
        return clientPromise;
    }

    clientPromise = (async () => {
        const GoRuntime = await ensureGoRuntime();
        const go = new GoRuntime();

        const response = await fetch(STORAGE_WASM_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch storage.wasm (${response.status}). Run the root build to publish the WASM artifacts.`);
        }

        const bytes = await response.arrayBuffer();
        const { instance } = await WebAssembly.instantiate(bytes, go.importObject);

        // Keep the Go runtime alive. This intentionally is not awaited.
        go.run(instance);

        const requiredFns = ['bobEncrypt', 'bobDecrypt', 'bobEncodeErasure', 'bobDecodeErasure'];
        for (const fn of requiredFns) {
            if (typeof window[fn] !== 'function') {
                throw new Error(`WASM export missing: ${fn}`);
            }
        }

        return {
            encrypt(input) {
                ensureUint8Array(input, 'input');
                const result = window.bobEncrypt(input);
                if (typeof result === 'string') throw new Error(result);
                return result;
            },
            decrypt(input, key, nonce) {
                ensureUint8Array(input, 'input');
                const result = window.bobDecrypt(input, key, nonce);
                if (typeof result === 'string') throw new Error(result);
                return result;
            },
            encodeErasure(input) {
                ensureUint8Array(input, 'input');
                const result = window.bobEncodeErasure(input);
                if (typeof result === 'string') throw new Error(result);
                return Array.from(result);
            },
            decodeErasure(shards) {
                if (!Array.isArray(shards)) {
                    throw new TypeError('shards must be an array');
                }
                const result = window.bobDecodeErasure(shards);
                if (typeof result === 'string') throw new Error(result);
                return result;
            },
        };
    })();

    return clientPromise;
}

export async function probeStorageWasmAvailability() {
    try {
        await createStorageWasmClient();
        return { available: true, error: null };
    } catch (error) {
        return { available: false, error: error.message };
    }
}
