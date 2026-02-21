// scripts/generate-build-info.js
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const MODULES = [
    { name: 'frontend', path: 'frontend' },
    { name: 'game-server', path: 'game-server' },
    { name: 'supertorrent', path: 'supertorrent' },
    { name: 'proof-of-play', path: 'proof-of-play', isRust: true }
];

function getGitInfo() {
    try {
        const hash = execSync('git rev-parse --short HEAD').toString().trim();
        const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
        const date = execSync('git log -1 --format=%cd').toString().trim();
        return { hash, branch, date };
    } catch (e) {
        return { hash: 'unknown', branch: 'unknown', date: new Date().toISOString() };
    }
}

function getPackageVersion(modulePath) {
    try {
        const pkgPath = path.resolve(modulePath, 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            return pkg.version;
        }
    } catch (e) {}

    try {
        const cargoPath = path.resolve(modulePath, 'Cargo.toml');
        if (fs.existsSync(cargoPath)) {
            // Simple regex parse for [package] version
            const content = fs.readFileSync(cargoPath, 'utf8');
            const match = content.match(/version\s*=\s*"(.*?)"/);
            return match ? match[1] : '0.0.0';
        }
    } catch(e) {}

    return '0.0.0';
}

const buildInfo = {
    generatedAt: new Date().toISOString(),
    git: getGitInfo(),
    modules: MODULES.map(m => ({
        name: m.name,
        path: m.path,
        version: getPackageVersion(m.path),
        type: m.isRust ? 'Rust' : 'Node.js'
    }))
};

const outputPath = path.resolve('frontend/public/build-info.json');
// Ensure dir exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2));
console.log(`[BuildInfo] Generated build-info.json at ${outputPath}`);
