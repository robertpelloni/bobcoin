package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
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
