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

            // Quests Table
            db.run(`
                CREATE TABLE IF NOT EXISTS quests (
                    id INTEGER PRIMARY KEY,
                    title TEXT NOT NULL,
                    target INTEGER NOT NULL,
                    reward INTEGER NOT NULL,
                    type TEXT NOT NULL
                )
            `);

            // Chat Messages Table
            db.run(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user TEXT NOT NULL,
                    text TEXT NOT NULL,
                    timestamp TEXT NOT NULL
                )
            `);

            // Users Table (Profiles)
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    pubkey TEXT PRIMARY KEY,
                    username TEXT NOT NULL,
                    avatar TEXT DEFAULT '🤖',
                    created_at TEXT NOT NULL
                )
            `, async (err) => {
                if (err) return reject(err);

                // Seed Default Quests if empty
                db.get("SELECT count(*) as count FROM quests", async (err, row) => {
                    if (row && row.count === 0) {
                        console.log('[DB] Seeding daily quests...');
                        const stmt = db.prepare("INSERT INTO quests (title, target, reward, type) VALUES (?, ?, ?, ?)");
                        stmt.run("Score 10,000 Points", 10000, 50, "SCORE");
                        stmt.run("Mint 1 Token", 1, 100, "MINT");
                        stmt.run("Seed 1 File", 1, 200, "SEED");
                        stmt.finalize();
                    }
                });

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

// Quests
export function getQuests() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM quests", (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Chat
export function getChatMessages(limit = 50) {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM messages ORDER BY id DESC LIMIT ?", [limit], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.reverse()); // Return oldest first
        });
    });
}

export function addChatMessage(user, text) {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toLocaleTimeString();
        db.run(
            "INSERT INTO messages (user, text, timestamp) VALUES (?, ?, ?)",
            [user, text, timestamp],
            function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, user, text, timestamp });
            }
        );
    });
}

// Users (Profiles)
export function getUser(pubkey) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE pubkey = ?", [pubkey], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

export function updateUserProfile(pubkey, username, avatar) {
    return new Promise((resolve, reject) => {
        const now = new Date().toISOString();
        db.run(
            `INSERT INTO users (pubkey, username, avatar, created_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(pubkey) DO UPDATE SET
             username = excluded.username,
             avatar = excluded.avatar`,
            [pubkey, username, avatar, now],
            function(err) {
                if (err) reject(err);
                else resolve({ success: true });
            }
        );
    });
}
