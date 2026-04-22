import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'database.sqlite');
const PROPOSALS_JSON = path.resolve(process.cwd(), 'proposals.json');

const db = new sqlite3.Database(DB_PATH);

export function initDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Proposals Table
            db.run(`
                CREATE TABLE IF NOT EXISTS proposals (
                    id INTEGER PRIMARY KEY,
                    title TEXT NOT NULL,
                    status TEXT NOT NULL,
                    votesFor INTEGER DEFAULT 0,
                    votesAgainst INTEGER DEFAULT 0,
                    endTime TEXT NOT NULL
                )
            `);

            // Bids Table
            db.run(`
                CREATE TABLE IF NOT EXISTS bids (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    magnet TEXT NOT NULL,
                    amount INTEGER NOT NULL,
                    status TEXT DEFAULT 'OPEN',
                    acceptedBy TEXT
                )
            `);

            // Votes Table (to prevent double voting and track voter power)
            db.run(`
                CREATE TABLE IF NOT EXISTS votes (
                    proposal_id INTEGER,
                    voter_id TEXT,
                    vote_type TEXT,
                    power REAL,
                    PRIMARY KEY (proposal_id, voter_id)
                )
            `);

            // Transactions Table
            db.run(`
                CREATE TABLE IF NOT EXISTS transactions (
                    id TEXT PRIMARY KEY,
                    date TEXT NOT NULL,
                    amount REAL NOT NULL,
                    type TEXT NOT NULL,
                    hash TEXT NOT NULL
                )
            `, async (err) => {
                if (err) return reject(err);

                // Migration Logic for Proposals
                db.get("SELECT count(*) as count FROM proposals", async (err, row) => {
                    if (row && row.count === 0 && fs.existsSync(PROPOSALS_JSON)) {
                        console.log('[DB] Migrating from proposals.json...');
                        try {
                            const proposals = JSON.parse(fs.readFileSync(PROPOSALS_JSON, 'utf8'));
                            const stmt = db.prepare("INSERT INTO proposals (id, title, status, votesFor, votesAgainst, endTime) VALUES (?, ?, ?, ?, ?, ?)");
                            proposals.forEach(p => {
                                stmt.run(p.id, p.title, p.status, p.votesFor, p.votesAgainst, p.endTime);
                            });
                            stmt.finalize();
                            console.log('[DB] Migration complete.');
                        } catch (e) {
                            console.error('[DB] Migration failed:', e);
                        }
                    }
                    resolve();
                });
            });
        });
    });
}

// Proposals
export function getAllProposals() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM proposals", (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

export function getProposalById(id) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM proposals WHERE id = ?", [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

export function updateProposalVotes(id, votesFor, votesAgainst) {
    return new Promise((resolve, reject) => {
        db.run(
            "UPDATE proposals SET votesFor = ?, votesAgainst = ? WHERE id = ?",
            [votesFor, votesAgainst, id],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
}

export function castVote(proposalId, voterId, voteType, power) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            
            db.run(
                "INSERT INTO votes (proposal_id, voter_id, vote_type, power) VALUES (?, ?, ?, ?)",
                [proposalId, voterId, voteType, power],
                function(err) {
                    if (err) {
                        db.run("ROLLBACK");
                        return reject(err);
                    }
                    
                    const voteCol = voteType === 'FOR' ? 'votesFor' : 'votesAgainst';
                    db.run(
                        `UPDATE proposals SET ${voteCol} = ${voteCol} + ? WHERE id = ?`,
                        [power, proposalId],
                        (err) => {
                            if (err) {
                                db.run("ROLLBACK");
                                return reject(err);
                            }
                            db.run("COMMIT");
                            resolve();
                        }
                    );
                }
            );
        });
    });
}

export function getVotesByProposal(proposalId) {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM votes WHERE proposal_id = ?", [proposalId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Market Bids
export function createBid(magnet, amount) {
    return new Promise((resolve, reject) => {
        db.run(
            "INSERT INTO bids (magnet, amount) VALUES (?, ?)",
            [magnet, amount],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

export function getOpenBids() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM bids WHERE status = 'OPEN'", (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

export function acceptBid(id, nodeId) {
    return new Promise((resolve, reject) => {
        db.run(
            "UPDATE bids SET status = 'ACCEPTED', acceptedBy = ? WHERE id = ? AND status = 'OPEN'",
            [nodeId, id],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes); // 1 if successful, 0 if already taken
            }
        );
    });
}

// Transactions
export function recordTransaction(id, type, amount, hash) {
    return new Promise((resolve, reject) => {
        const date = new Date().toISOString().replace('T', ' ').substring(0, 16);
        db.run(
            "INSERT INTO transactions (id, date, amount, type, hash) VALUES (?, ?, ?, ?, ?)",
            [id, date, amount, type, hash],
            function(err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

export function getTransactions() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM transactions ORDER BY date DESC", (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}
