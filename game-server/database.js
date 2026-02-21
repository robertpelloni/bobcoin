import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'database.sqlite');
const PROPOSALS_JSON = path.resolve(process.cwd(), 'proposals.json');

const db = new sqlite3.Database(DB_PATH);

export function initDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS proposals (
                    id INTEGER PRIMARY KEY,
                    title TEXT NOT NULL,
                    status TEXT NOT NULL,
                    votesFor INTEGER DEFAULT 0,
                    votesAgainst INTEGER DEFAULT 0,
                    endTime TEXT NOT NULL
                )
            `, async (err) => {
                if (err) return reject(err);

                // Check if empty, import JSON if needed
                db.get("SELECT count(*) as count FROM proposals", async (err, row) => {
                    if (row.count === 0 && fs.existsSync(PROPOSALS_JSON)) {
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
