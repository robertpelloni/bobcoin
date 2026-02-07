import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Read version from ../VERSION.md
// In ESM, we can't use __dirname easily, but we can assume we are running from project root or frontend root.
// We'll try to find VERSION.md relative to process.cwd()
let version = '0.0.0';
try {
    const versionPath = path.resolve(process.cwd(), '../VERSION.md');
    if (fs.existsSync(versionPath)) {
        version = fs.readFileSync(versionPath, 'utf8').trim();
    } else {
        // Fallback for when running inside frontend folder
        const localVersionPath = path.resolve(process.cwd(), 'VERSION.md'); // If copied
         if (fs.existsSync(localVersionPath)) {
            version = fs.readFileSync(localVersionPath, 'utf8').trim();
        }
    }
} catch (e) {
    console.warn('Could not read VERSION.md', e);
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    define: {
        __APP_VERSION__: JSON.stringify(version)
    }
})
