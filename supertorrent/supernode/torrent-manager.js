import WebTorrent from 'webtorrent';

/**
 * Real TorrentManager using WebTorrent
 * Manages downloading and seeding of files for Proof of Storage.
 */
class TorrentManager {
    constructor() {
        this.client = new WebTorrent();
        this.storedFiles = new Map(); // infoHash -> torrent object

        this.client.on('error', (err) => {
            console.error('[TorrentManager] Client Error:', err.message);
        });
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
            torrent.destroy(); // Stop downloading/seeding
            this.storedFiles.delete(infoHash);
            // Optionally delete files from disk? usually safer to keep them or ask user.
            // keeping for now.
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
