const http = require('http');

async function checkOracle(replayLog, score = 1500) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3001,
            path: '/submit-proof',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
                } catch(e) {
                    resolve({ statusCode: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);

        req.write(JSON.stringify({
            proof: {
                publicValues: {
                    address: "mock-address",
                    score: score,
                    replayLog: replayLog
                }
            }
        }));
        req.end();
    });
}

async function checkGovernanceAudit() {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3001,
            path: '/governance/audit',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });

        req.on('error', reject);

        req.write(JSON.stringify({
            title: "Test scam proposal",
            action: "MINT_TREASURY",
            amount: 500000,
            target: "mock-address"
        }));
        req.end();
    });
}

async function run() {
    console.log("Verifying AI Oracle Bot Detection (Macro vs Human)...");
    try {
        // Test Case 1: Robotic Macro Inputs (Uniform 100ms intervals -> variance 0, mad 0)
        console.log("  * Test 1: Submitting robotic macro sequence...");
        const macroLog = Array.from({ length: 12 }, (_, i) => ({ time: i * 100, action: 'press' }));
        const macroResult = await checkOracle(macroLog);
        console.log("    Macro response:", macroResult.statusCode, macroResult.body);

        if (macroResult.statusCode === 400 && macroResult.body.oracle && macroResult.body.oracle.confidenceScore <= 0.10) {
            console.log("    ✓ AI Oracle successfully detected and rejected macro bot!");
        } else {
            console.error("    ❌ AI Oracle failed to reject robotic macro:", macroResult);
            process.exit(1);
        }

        // Test Case 2: Organic Human Inputs (Realistic timing jitter -> variance > 10, mad > 5)
        console.log("  * Test 2: Submitting human jitter sequence...");
        let curr = 0;
        const humanLog = Array.from({ length: 12 }, (_, i) => {
            curr += 120 + ((i % 4) * 25);
            return { time: curr, action: 'press' };
        });
        const humanResult = await checkOracle(humanLog);
        console.log("    Human response:", humanResult.statusCode, humanResult.body);

        if (humanResult.statusCode === 200 && humanResult.body.success && humanResult.body.oracle && humanResult.body.oracle.confidenceScore >= 0.90) {
            console.log("    ✓ AI Oracle successfully accepted human jitter sequence!");
        } else {
            console.error("    ❌ AI Oracle failed to accept human jitter:", humanResult);
            process.exit(1);
        }

        console.log("\nVerifying Governance Audit connection...");
        const auditResult = await checkGovernanceAudit();
        console.log("Governance Audit result:", auditResult);

        if (auditResult.success && auditResult.riskScore > 0.5) {
             console.log("✅ Governance Audit integration successful (detected scam).");
             process.exit(0);
        } else {
             console.log("❌ Governance Audit verification failed.");
             process.exit(1);
        }
    } catch(err) {
        console.error("Test failed to run:", err.message);
        process.exit(1);
    }
}

run();
