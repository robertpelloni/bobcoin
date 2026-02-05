
import BobcoinBridge from './supernode/blockchain/bobcoin.js';

(async () => {
    console.log('Testing Burn-to-Upload...');
    const bridge = new BobcoinBridge();
    await bridge.init();

    const magnet = "magnet:?xt=urn:btih:TESTHASH1234567890&dn=TestFile";
    try {
        const sig = await bridge.registerFile(magnet, 500);
        console.log('SUCCESS: File Registered with Sig:', sig);
    } catch (e) {
        console.error('FAILURE:', e);
        process.exit(1);
    }
})();
