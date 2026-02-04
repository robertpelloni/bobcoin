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
        });
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
     * Clean shutdown
     */
    destroy() {
        this.client.destroy();
    }
}

export default TorrentManager;
