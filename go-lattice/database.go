package main

import (
	"database/sql"
	"encoding/json"
	"log"

	_ "modernc.org/sqlite"
)

type DBManager struct {
	db *sql.DB
}

func NewDBManager(path string) *DBManager {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	// Initialize Schema
	schema := `
	CREATE TABLE IF NOT EXISTS blocks (
		hash TEXT PRIMARY KEY,
		account TEXT,
		type TEXT,
		height INTEGER,
		data TEXT,
		timestamp INTEGER
	);
	CREATE INDEX IF NOT EXISTS idx_account ON blocks(account);
	`
	_, err = db.Exec(schema)
	if err != nil {
		log.Fatalf("Failed to initialize schema: %v", err)
	}

	return &DBManager{db: db}
}

func (mgr *DBManager) SaveBlock(b *Block) error {
	blockJSON, _ := json.Marshal(b)
	query := `INSERT INTO blocks (hash, account, type, height, data, timestamp) VALUES (?, ?, ?, ?, ?, ?)`
	_, err := mgr.db.Exec(query, b.Hash, b.Account, b.Type, b.Height, string(blockJSON), b.Timestamp)
	return err
}

func (mgr *DBManager) LoadAllBlocks() ([]*Block, error) {
	rows, err := mgr.db.Query("SELECT data FROM blocks ORDER BY timestamp ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var blocks []*Block
	for rows.Next() {
		var data string
		if err := rows.Scan(&data); err != nil {
			return nil, err
		}
		var b Block
		if err := json.Unmarshal([]byte(data), &b); err != nil {
			return nil, err
		}
		blocks = append(blocks, &b)
	}
	return blocks, nil
}
