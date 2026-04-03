import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import cryptography from the consensus module
import { generateKeypair, sign, hash as sha256 } from './cryptoUtils.js';
import { Block } from './Block.js';

const LATTICE_URL = process.env.LATTICE_URL || 'http://localhost:4000';
const WALLET_FILE = path.resolve(__dirname, 'casino_wallet.json');

let casinoWallet = null;

async function initCasino() {
    console.log("🎲 [Casino Bot] Initializing Autonomous Smart Contract...");

    if (fs.existsSync(WALLET_FILE)) {
        casinoWallet = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
        console.log(`[Casino Bot] Loaded Wallet: ${casinoWallet.publicKey.substr(0,16)}...`);
    } else {
        casinoWallet = generateKeypair();
        fs.writeFileSync(WALLET_FILE, JSON.stringify(casinoWallet, null, 2));
        console.log(`[Casino Bot] Generated New Wallet: ${casinoWallet.publicKey.substr(0,16)}...`);
    }

    // Bootstrap if needed
    try {
        const frontRes = await fetch(`${LATTICE_URL}/frontier/${casinoWallet.publicKey}`);
        const frontData = await frontRes.json();
        if (!frontData.frontier) {
            console.log(`[Casino Bot] Account not open. Requesting 500 BOB bankroll from Game Server...`);
            const mintRes = await fetch(`http://localhost:3001/mint`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 500, reason: "Casino Bankroll Bootstrapping", address: casinoWallet.publicKey })
            });
            const mintData = await mintRes.json();
            
            if (mintData.success) {
                console.log(`[Casino Bot] Bankroll Send Block confirmed. Creating OPEN block...`);
                // Wait a second for lattice to sync
                await new Promise(r => setTimeout(r, 1000));
                
                const pendRes = await fetch(`${LATTICE_URL}/pending/${casinoWallet.publicKey}`);
                const pendData = await pendRes.json();
                const pendingAmount = pendData.pending && pendData.pending.length > 0 ? pendData.pending[0].amount : 500;

                const expectedChallenge = parseInt(crypto.createHash('sha256').update(casinoWallet.publicKey).digest('hex').substr(0, 8), 16);
                
                // For the prototype Casino, we will hit the supernode for SPoRA
                const sporaRes = await fetch(`http://localhost:8081/spora/${expectedChallenge}`);
                const sporaData = await sporaRes.json();

                const openBlock = new Block({
                    type: 'open',
                    account: casinoWallet.publicKey,
                    previous: null,
                    balance: pendingAmount,
                    link: mintData.hash,
                    spora: sporaData.spora
                });
                openBlock.signBlock(casinoWallet.privateKey);

                await fetch(`${LATTICE_URL}/process`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ block: openBlock })
                });
                console.log(`[Casino Bot] ✅ Casino is OPEN for business!`);
            }
        }
    } catch (e) {
        console.error(`[Casino Bot] Bootstrap warning:`, e.message);
    }

    // Main Event Loop
    setInterval(async () => {
        try {
            const pendRes = await fetch(`${LATTICE_URL}/pending/${casinoWallet.publicKey}`);
            const pendData = await pendRes.json();
            
            if (pendData.pending && pendData.pending.length > 0) {
                for (const tx of pendData.pending) {
                    console.log(`\n🎰 [Casino Bot] Received ${tx.amount} BOB from ${tx.sender.substr(0, 8)}... Processing bet!`);
                    
                    // 1. Receive the bet
                    let frontRes = await fetch(`${LATTICE_URL}/frontier/${casinoWallet.publicKey}`);
                    let frontData = await frontRes.json();
                    let previousHash = frontData.frontier;

                    let balRes = await fetch(`${LATTICE_URL}/balance/${casinoWallet.publicKey}`);
                    let balData = await balRes.json();
                    let currentBalance = balData.balance || 0;

                    let expectedChallenge = parseInt(previousHash.substr(0, 8), 16);
                    let sporaRes = await fetch(`http://localhost:8081/spora/${expectedChallenge}`);
                    let sporaData = await sporaRes.json();

                    currentBalance += tx.amount;
                    const receiveBlock = new Block({
                        type: 'receive',
                        account: casinoWallet.publicKey,
                        previous: previousHash,
                        balance: currentBalance,
                        link: tx.hash,
                        spora: sporaData.spora
                    });
                    receiveBlock.signBlock(casinoWallet.privateKey);

                    const recRes = await fetch(`${LATTICE_URL}/process`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ block: receiveBlock })
                    });
                    const recData = await recRes.json();
                    if (!recData.success) {
                        console.error(`[Casino Bot] Failed to accept bet:`, recData.error);
                        continue;
                    }
                    console.log(`[Casino Bot] Accepted bet into bankroll. Hash: ${receiveBlock.hash}`);

                    // 2. Play the game (Provably Fair based on user's send hash)
                    const isWinner = parseInt(tx.hash.substr(-2), 16) % 2 === 0;
                    
                    if (isWinner) {
                        const payout = tx.amount * 1.98; // 2% house edge
                        console.log(`[Casino Bot] 🎉 Player WON! Payout: ${payout.toFixed(2)} BOB`);

                        // Send the payout back
                        frontRes = await fetch(`${LATTICE_URL}/frontier/${casinoWallet.publicKey}`);
                        frontData = await frontRes.json();
                        previousHash = frontData.frontier;

                        balRes = await fetch(`${LATTICE_URL}/balance/${casinoWallet.publicKey}`);
                        balData = await balRes.json();
                        currentBalance = balData.balance || 0;

                        expectedChallenge = parseInt(previousHash.substr(0, 8), 16);
                        sporaRes = await fetch(`http://localhost:8081/spora/${expectedChallenge}`);
                        sporaData = await sporaRes.json();

                        currentBalance -= payout;
                        const sendBlock = new Block({
                            type: 'send',
                            account: casinoWallet.publicKey,
                            previous: previousHash,
                            balance: currentBalance,
                            link: tx.sender,
                            spora: sporaData.spora,
                            payload: { memo: "Casino Payout! You won!" }
                        });
                        sendBlock.signBlock(casinoWallet.privateKey);

                        await fetch(`${LATTICE_URL}/process`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ block: sendBlock })
                        });
                        console.log(`[Casino Bot] Payout sent. Hash: ${sendBlock.hash}`);

                    } else {
                        console.log(`[Casino Bot] 💀 Player LOST! House keeps the bet.`);
                    }
                }
            }
        } catch (e) {
            console.error(`[Casino Bot] Polling error:`, e.message);
        }
    }, 5000);
}

initCasino();
