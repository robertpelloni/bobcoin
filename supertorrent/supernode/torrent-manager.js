import WebTorrent from 'webtorrent';
import fs from 'fs';
import path from 'path';

const CONFIG_FILE = 'torrents.json';

/**
 * Real TorrentManager using WebTorrent
 * Manages downloading and seeding of files for Proof of Storage.
 */
class TorrentManager {
    constructor() {
        this.client = new WebTorrent();
        this.storedFiles = new Map(); // infoHash -> torrent object
        this.configPath = path.resolve(process.cwd(), CONFIG_FILE);

        this.client.on('error', (err) => {
            console.error('[TorrentManager] Client Error:', err.message);
        });

        // Delay loading to allow constructor to finish
        setTimeout(() => this.loadState(), 100);
    }

    /**
     * Loads saved torrents from disk.
     */
    loadState() {
        if (fs.existsSync(this.configPath)) {
            try {
                const data = fs.readFileSync(this.configPath, 'utf8');
                const saved = JSON.parse(data);
                if (Array.isArray(saved) && saved.length > 0) {
                    console.log(`[TorrentManager] Loading ${saved.length} torrents from disk...`);
                    saved.forEach(magnet => {
                        this.client.add(magnet, { path: './storage' }, (torrent) => {
                            console.log(`[TorrentManager] Restored: ${torrent.name}`);
                            this.storedFiles.set(torrent.infoHash, torrent);
                        });
                    });
                }
            } catch (e) {
                console.error('[TorrentManager] Failed to load state:', e);
            }
        } else {
            console.log('[TorrentManager] No saved state found.');
        }
    }

    /**
     * Saves current torrent list to disk.
     */
    saveState() {
        try {
            const magnets = [];
            for (const torrent of this.storedFiles.values()) {
                if (torrent.magnetURI) magnets.push(torrent.magnetURI);
            }
            fs.writeFileSync(this.configPath, JSON.stringify(magnets, null, 2));
            console.log(`[TorrentManager] Saved state (${magnets.length} torrents).`);
        } catch (e) {
            console.error('[TorrentManager] Failed to save state:', e);
        }
    }

    /**
     * Adds a file via magnet URI or file path.
     * @param {string} identifier - Magnet URI or path
     */
    addFile(identifier) {
        return new Promise((resolve, reject) => {
            console.log(`[TorrentManager] Adding torrent: ${identifier.substring(0, 30)}...`);

            this.client.add(identifier, { path: './storage' }, (torrent) => {
                console.log(`[TorrentManager] Torrent added: ${torrent.name}`);
                console.log(`[TorrentManager] InfoHash: ${torrent.infoHash}`);

                this.storedFiles.set(torrent.infoHash, torrent);
                this.saveState();

                torrent.on('download', (bytes) => {
                    // console.log(`[TorrentManager] Downloaded ${bytes} bytes`);
                });

                torrent.on('done', () => {
                    console.log(`[TorrentManager] Download complete: ${torrent.name}`);
                });

                resolve({
                    infoHash: torrent.infoHash,
                    name: torrent.name
                });
            });
        });
    }

    /**
     * Removes a torrent by infoHash.
     * @param {string} infoHash
     */
    removeFile(infoHash) {
        const torrent = this.storedFiles.get(infoHash);
        if (torrent) {
            console.log(`[TorrentManager] Removing torrent: ${torrent.name}`);
            // Note: torrent.destroy() is async but we don't await it here usually
            torrent.destroy();
            this.storedFiles.delete(infoHash);
            this.saveState();
            return true;
        }
        return false;
    }

    /**
     * Returns the list of active infoHashes.
     * @returns {string[]}
     */
    getStoredFiles() {
        return Array.from(this.storedFiles.keys());
    }

    /**
     * Returns the total size of storage being provided.
     * @returns {number}
     */
    getTotalStorageSize() {
        let total = 0;
        for (const torrent of this.storedFiles.values()) {
            total += torrent.length;
        }
        return total;
    }

    /**
     * Returns detailed stats for all active torrents.
     * @returns {Object[]}
     */
    getStats() {
        const stats = [];
        for (const torrent of this.storedFiles.values()) {
            stats.push({
                name: torrent.name,
                infoHash: torrent.infoHash,
                progress: torrent.progress,
                downloaded: torrent.downloaded,
                uploaded: torrent.uploaded,
                downloadSpeed: torrent.downloadSpeed,
                uploadSpeed: torrent.uploadSpeed,
                peers: torrent.numPeers,
                totalSize: torrent.length,
                path: torrent.path,
                timeRemaining: torrent.timeRemaining
            });
        }
        return stats;
    }

    /**
     * Clean shutdown
     */
    destroy() {
        this.client.destroy();
    }
}

export default TorrentManager;
