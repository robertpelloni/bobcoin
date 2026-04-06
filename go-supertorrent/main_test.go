package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func newTestSuperTorrentService(t *testing.T) *SuperTorrentService {
	t.Helper()
	tmp := t.TempDir()
	cfg := Config{
		Port:          "0",
		LatticeURL:    "http://localhost:4001",
		GameServerURL: "http://localhost:3001",
		UploadsDir:    tmp + "/uploads",
		DownloadsDir:  tmp + "/downloads",
		WalletFile:    tmp + "/wallet.json",
		TorrentsFile:  tmp + "/torrents.json",
	}
	service, err := NewSuperTorrentService(cfg)
	if err != nil {
		t.Fatalf("failed to create test supertorrent service: %v", err)
	}
	return service
}

func TestNewSuperTorrentServiceLoadsRegistryAndCoreAnchors(t *testing.T) {
	tmp := t.TempDir()
	torrentsPath := tmp + "/torrents.json"
	preloaded := []map[string]interface{}{{
		"magnet":   "magnet:?xt=urn:btih:feedfeedfeedfeedfeedfeedfeedfeedfeedfeed",
		"infoHash": "feedfeedfeedfeedfeedfeedfeedfeedfeedfeed",
		"name":     "preloaded.bin",
		"addedAt":  float64(1),
		"accepted": true,
	}}
	encoded, _ := json.Marshal(preloaded)
	if err := os.WriteFile(torrentsPath, encoded, 0o644); err != nil {
		t.Fatalf("failed to seed torrent registry: %v", err)
	}

	cfg := Config{
		Port:          "0",
		LatticeURL:    "http://localhost:4001",
		GameServerURL: "http://localhost:3001",
		UploadsDir:    tmp + "/uploads",
		DownloadsDir:  tmp + "/downloads",
		WalletFile:    tmp + "/wallet.json",
		TorrentsFile:  torrentsPath,
	}
	service, err := NewSuperTorrentService(cfg)
	if err != nil {
		t.Fatalf("failed to create supertorrent service: %v", err)
	}

	service.mu.RLock()
	defer service.mu.RUnlock()
	if _, ok := service.torrents["feedfeedfeedfeedfeedfeedfeedfeedfeedfeed"]; !ok {
		t.Fatalf("expected preloaded torrent registry entry to be loaded")
	}
	for _, anchor := range coreArcadeAnchors {
		infoHash := magnetInfoHash(anchor.Magnet)
		if _, ok := service.torrents[infoHash]; !ok {
			t.Fatalf("expected core anchor %s to be tracked", infoHash)
		}
	}
}

func TestStatsEndpointReportsTrackedTorrents(t *testing.T) {
	service := newTestSuperTorrentService(t)
	service.trackTorrent(TorrentRecord{Magnet: "magnet:?xt=urn:btih:abcdefabcdefabcdefabcdefabcdefabcdefabcd", InfoHash: "abcdefabcdefabcdefabcdefabcdefabcdefabcd", Name: "demo.bin", Size: 321, AddedAt: 1, Source: "test", Accepted: true})

	req := httptest.NewRequest(http.MethodGet, "/stats", nil)
	rec := httptest.NewRecorder()
	service.handleStats(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected stats success, got %d", rec.Code)
	}
	var body map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to decode stats response: %v", err)
	}
	storage, ok := body["storage"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected storage stats object, got %v", body["storage"])
	}
	if storage["totalSize"] != float64(321) {
		t.Fatalf("expected totalSize 321, got %v", storage["totalSize"])
	}
	torrents, ok := storage["torrents"].([]interface{})
	if !ok || len(torrents) == 0 {
		t.Fatalf("expected tracked torrents in stats response, got %v", storage["torrents"])
	}
	found := false
	for _, item := range torrents {
		entry := item.(map[string]interface{})
		if entry["infoHash"] == "abcdefabcdefabcdefabcdefabcdefabcdefabcd" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected tracked torrent infoHash to appear in stats response, got %v", torrents)
	}
}

func TestHandleAddAndRemoveTorrent(t *testing.T) {
	service := newTestSuperTorrentService(t)

	addReq := httptest.NewRequest(http.MethodPost, "/add-torrent", strings.NewReader(`{"magnet":"magnet:?xt=urn:btih:abcdefabcdefabcdefabcdefabcdefabcdefabcd","name":"demo"}`))
	addRec := httptest.NewRecorder()
	service.handleAddTorrent(addRec, addReq)
	if addRec.Code != http.StatusOK {
		t.Fatalf("expected add torrent success, got %d", addRec.Code)
	}

	infoHash := magnetInfoHash("magnet:?xt=urn:btih:abcdefabcdefabcdefabcdefabcdefabcdefabcd")
	service.mu.RLock()
	_, ok := service.torrents[infoHash]
	service.mu.RUnlock()
	if !ok {
		t.Fatalf("expected tracked torrent to be added")
	}

	removeReq := httptest.NewRequest(http.MethodPost, "/remove-torrent", strings.NewReader(`{"infoHash":"`+infoHash+`"}`))
	removeRec := httptest.NewRecorder()
	service.handleRemoveTorrent(removeRec, removeReq)
	if removeRec.Code != http.StatusOK {
		t.Fatalf("expected remove torrent success, got %d", removeRec.Code)
	}

	service.mu.RLock()
	_, ok = service.torrents[infoHash]
	service.mu.RUnlock()
	if ok {
		t.Fatalf("expected tracked torrent to be removed")
	}
}

func TestSporaEndpoint(t *testing.T) {
	service := newTestSuperTorrentService(t)
	req := httptest.NewRequest(http.MethodGet, "/spora/12345", nil)
	rec := httptest.NewRecorder()
	service.handleSpora(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected spora success, got %d", rec.Code)
	}
	var body map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to decode spora response: %v", err)
	}
	if body["success"] != true {
		t.Fatalf("expected spora success payload, got %v", body)
	}
}

func TestAcceptBidOnLattice(t *testing.T) {
	var processedBlock map[string]interface{}
	lattice := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasPrefix(r.URL.Path, "/frontier/"):
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"frontier": "abcdef1234567890abcdef1234567890abcdef12", "balance": 10.0, "height": 2})
		case r.URL.Path == "/process":
			_ = json.NewDecoder(r.Body).Decode(&processedBlock)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "hash": "accepted-block-hash"})
		default:
			t.Fatalf("unexpected lattice path: %s", r.URL.Path)
		}
	}))
	defer lattice.Close()

	service := newTestSuperTorrentService(t)
	service.cfg.LatticeURL = lattice.URL

	bid := Bid{ID: "bid-hash-123", Magnet: "magnet:?xt=urn:btih:feedfeedfeedfeedfeedfeedfeedfeedfeedfeed", Amount: 25, Status: "OPEN"}
	if err := service.acceptBidOnLattice(bid); err != nil {
		t.Fatalf("expected acceptBidOnLattice to succeed, got %v", err)
	}

	blockPayload, ok := processedBlock["block"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected process payload to include block")
	}
	if blockPayload["type"] != "accept_bid" {
		t.Fatalf("expected accept_bid block type, got %v", blockPayload["type"])
	}
	if blockPayload["link"] != bid.ID {
		t.Fatalf("expected block link %q, got %v", bid.ID, blockPayload["link"])
	}
}

func TestBootstrapWalletOnLattice(t *testing.T) {
	var openedBlock map[string]interface{}
	var mintRequested bool
	gameServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/mint" {
			t.Fatalf("unexpected game server path: %s", r.URL.Path)
		}
		mintRequested = true
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "hash": "bootstrap-send-hash"})
	}))
	defer gameServer.Close()

	var frontierCalls int
	lattice := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasPrefix(r.URL.Path, "/frontier/"):
			frontierCalls++
			_ = json.NewEncoder(w).Encode(map[string]interface{}{})
		case strings.HasPrefix(r.URL.Path, "/pending/"):
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"pending": []map[string]interface{}{{"hash": "bootstrap-send-hash", "amount": 1.0}}})
		case r.URL.Path == "/process":
			_ = json.NewDecoder(r.Body).Decode(&openedBlock)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "hash": "opened-hash"})
		default:
			t.Fatalf("unexpected lattice path: %s", r.URL.Path)
		}
	}))
	defer lattice.Close()

	service := newTestSuperTorrentService(t)
	service.cfg.GameServerURL = gameServer.URL
	service.cfg.LatticeURL = lattice.URL
	service.bootstrapWalletOnLattice()

	if !mintRequested {
		t.Fatalf("expected bootstrap flow to request mint")
	}
	if frontierCalls == 0 {
		t.Fatalf("expected bootstrap flow to query frontier")
	}
	blockPayload, ok := openedBlock["block"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected bootstrap process call to include block payload")
	}
	if blockPayload["type"] != "open" {
		t.Fatalf("expected bootstrap block type open, got %v", blockPayload["type"])
	}
	if blockPayload["link"] != "bootstrap-send-hash" {
		t.Fatalf("expected bootstrap link to target mint hash, got %v", blockPayload["link"])
	}
}

func TestProcessOpenBidsOnce(t *testing.T) {
	var processedBlock map[string]interface{}
	lattice := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/market/bids":
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"bids": []map[string]interface{}{{"id": "open-bid-1", "magnet": "magnet:?xt=urn:btih:1234512345123451234512345123451234512345", "amount": 7.5, "status": "OPEN"}}})
		case strings.HasPrefix(r.URL.Path, "/frontier/"):
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"frontier": "abcdef1234567890abcdef1234567890abcdef12", "balance": 10.0, "height": 2})
		case r.URL.Path == "/process":
			_ = json.NewDecoder(r.Body).Decode(&processedBlock)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "hash": "accepted-block-hash"})
		default:
			t.Fatalf("unexpected lattice path during open-bid scan: %s", r.URL.Path)
		}
	}))
	defer lattice.Close()

	service := newTestSuperTorrentService(t)
	service.cfg.LatticeURL = lattice.URL
	if err := service.processOpenBidsOnce(); err != nil {
		t.Fatalf("expected processOpenBidsOnce to succeed, got %v", err)
	}

	infoHash := magnetInfoHash("magnet:?xt=urn:btih:1234512345123451234512345123451234512345")
	service.mu.RLock()
	_, ok := service.torrents[infoHash]
	service.mu.RUnlock()
	if !ok {
		t.Fatalf("expected open bid magnet to be tracked after processing")
	}
	blockPayload, ok := processedBlock["block"].(map[string]interface{})
	if !ok || blockPayload["type"] != "accept_bid" {
		t.Fatalf("expected accept_bid block submission after processing open bids, got %+v", processedBlock)
	}
}

func TestHandleUploadTracksTorrent(t *testing.T) {
	service := newTestSuperTorrentService(t)
	body := &strings.Builder{}
	writer := multipartNewWriter(body)
	writer.WriteField("noop", "1")
	if err := writer.WriteFile("file", "demo.bin", "hello world"); err != nil {
		t.Fatalf("failed to prepare multipart upload: %v", err)
	}
	contentType := writer.CloseAndGetContentType()

	req := httptest.NewRequest(http.MethodPost, "/upload", strings.NewReader(body.String()))
	req.Header.Set("Content-Type", contentType)
	rec := httptest.NewRecorder()
	service.handleUpload(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected upload success, got %d with %s", rec.Code, rec.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode upload response: %v", err)
	}
	infoHash, _ := resp["infoHash"].(string)
	service.mu.RLock()
	_, ok := service.torrents[infoHash]
	service.mu.RUnlock()
	if !ok {
		t.Fatalf("expected uploaded file to be tracked as torrent")
	}
}

type multipartWriterHelper struct {
	builder     *strings.Builder
	boundary    string
	contentType string
}

func multipartNewWriter(builder *strings.Builder) *multipartWriterHelper {
	boundary := "go-supertorrent-test-boundary"
	return &multipartWriterHelper{builder: builder, boundary: boundary, contentType: "multipart/form-data; boundary=" + boundary}
}

func (w *multipartWriterHelper) WriteField(name, value string) {
	w.builder.WriteString("--" + w.boundary + "\r\n")
	w.builder.WriteString("Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n")
	w.builder.WriteString(value + "\r\n")
}

func (w *multipartWriterHelper) WriteFile(fieldName, fileName, content string) error {
	w.builder.WriteString("--" + w.boundary + "\r\n")
	w.builder.WriteString("Content-Disposition: form-data; name=\"" + fieldName + "\"; filename=\"" + fileName + "\"\r\n")
	w.builder.WriteString("Content-Type: application/octet-stream\r\n\r\n")
	w.builder.WriteString(content + "\r\n")
	return nil
}

func (w *multipartWriterHelper) CloseAndGetContentType() string {
	w.builder.WriteString("--" + w.boundary + "--\r\n")
	return w.contentType
}
