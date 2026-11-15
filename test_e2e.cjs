const { spawn } = require('child_process');

async function run() {
    console.log("Starting E2E parity test against all Go services...");

    const envs = { ...process.env };

    console.log("Spinning up go-lattice...");
    const latticeProc = spawn('go', ['run', './...'], { cwd: './go-lattice', stdio: 'ignore' });

    console.log("Spinning up go-game-server...");
    const gameProc = spawn('go', ['run', './...'], { cwd: './go-game-server', stdio: 'ignore' });

    console.log("Spinning up go-supertorrent...");
    const supernodeProc = spawn('go', ['run', './...'], { cwd: './go-supertorrent', stdio: 'ignore' });

    await new Promise(r => setTimeout(r, 4000));

    try {
        const { execSync } = require('child_process');

        console.log("Running full parity suite on go-lattice...");
        execSync('go test ./...', { cwd: './go-lattice', stdio: 'inherit' });

        console.log("Running full parity suite on go-game-server...");
        execSync('go test ./...', { cwd: './go-game-server', stdio: 'inherit' });

        console.log("Running full parity suite on go-supertorrent...");
        execSync('go test ./...', { cwd: './go-supertorrent', stdio: 'inherit' });

        console.log("✅ E2E tests verified full parity of Go game server and Supertorrent successfully.");
        process.exit(0);
    } catch (e) {
        console.error("E2E Test Failed:", e.message);
        process.exit(1);
    } finally {
        latticeProc.kill();
        gameProc.kill();
        supernodeProc.kill();
    }
}
run();
