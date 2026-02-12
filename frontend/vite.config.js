import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import fs from 'fs';
import path from 'path';

// Read version from ../VERSION.md
let version = '0.0.0';
try {
    const versionPath = path.resolve(process.cwd(), '../VERSION.md');
    if (fs.existsSync(versionPath)) {
        version = fs.readFileSync(versionPath, 'utf8').trim();
    } else {
        const localVersionPath = path.resolve(process.cwd(), 'VERSION.md');
         if (fs.existsSync(localVersionPath)) {
            version = fs.readFileSync(localVersionPath, 'utf8').trim();
        }
    }
} catch (e) {
    console.warn('Could not read VERSION.md', e);
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        nodePolyfills({
            // To polyfill `node:` protocol imports.
            protocolImports: true,
            // To polyfill global variables.
            globals: {
                Buffer: true,
                global: true,
                process: true,
            },
        }),
    ],
    define: {
        __APP_VERSION__: JSON.stringify(version)
    }
})
