const http = require('http');

async function checkOracle() {
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
            res.on('end', () => resolve(JSON.parse(data)));
        });

        req.on('error', reject);

        req.write(JSON.stringify({
            proof: {
                publicValues: {
                    address: "mock-address",
                    score: 1500,
                    replayLog: [
                        { time: 100 },
                        { time: 200 },
                        { time: 300 },
                        { time: 500 }
                    ]
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
    console.log("Verifying Oracle connection...");
    try {
        const oracleResult = await checkOracle();
        console.log("Oracle result:", oracleResult);

        console.log("\nVerifying Governance Audit connection...");
        const auditResult = await checkGovernanceAudit();
        console.log("Governance Audit result:", auditResult);

        if (oracleResult.error && oracleResult.error.includes("AI Oracle Bot Detection")) {
            console.log("\n✅ AI Oracle integration successful (detected bot).");
        } else if (oracleResult.success) {
            console.log("\n✅ AI Oracle integration successful (proof accepted).");
        } else {
             console.log("\n❌ Oracle verification failed.");
             process.exit(1);
        }

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
