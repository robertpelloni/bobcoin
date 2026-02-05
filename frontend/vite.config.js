import fs from 'fs';
import path from 'path';

// Read version from ../VERSION.md (relative to frontend root)
const versionPath = path.resolve(__dirname, '../VERSION.md');
let version = '0.0.0';
try {
    version = fs.readFileSync(versionPath, 'utf8').trim();
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
