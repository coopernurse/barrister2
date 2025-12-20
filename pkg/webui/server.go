package webui

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"strings"
)

// Server represents the web UI HTTP server
type Server struct {
	port int
}

// NewServer creates a new web UI server
func NewServer(port int) *Server {
	return &Server{
		port: port,
	}
}

// Start starts the HTTP server
func (s *Server) Start() error {
	mux := http.NewServeMux()

	// Serve static files
	mux.HandleFunc("/", s.handleStatic)
	mux.HandleFunc("/app.js", s.handleJS)
	mux.HandleFunc("/css/", s.handleCSS)

	// API endpoints
	mux.HandleFunc("/api/proxy", s.handleProxy)

	addr := fmt.Sprintf(":%d", s.port)
	log.Printf("Barrister Web UI server starting on http://localhost%s", addr)
	log.Printf("Open http://localhost%s in your browser", addr)

	return http.ListenAndServe(addr, mux)
}

// handleStatic serves the index.html file
func (s *Server) handleStatic(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	data, err := WebUIFiles.ReadFile("dist/index.html")
	if err != nil {
		http.Error(w, "Failed to read index.html", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if _, err := w.Write(data); err != nil {
		log.Printf("Failed to write response: %v", err)
	}
}

// handleJS serves the bundled JavaScript file
func (s *Server) handleJS(w http.ResponseWriter, r *http.Request) {
	data, err := WebUIFiles.ReadFile("dist/app.js")
	if err != nil {
		http.Error(w, "Failed to read app.js", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
	if _, err := w.Write(data); err != nil {
		log.Printf("Failed to write response: %v", err)
	}
}

// handleCSS serves CSS files
func (s *Server) handleCSS(w http.ResponseWriter, r *http.Request) {
	// Extract the CSS file path
	path := strings.TrimPrefix(r.URL.Path, "/css/")
	if path == "" {
		http.NotFound(w, r)
		return
	}

	// Read from embedded files
	filePath := filepath.Join("dist", "css", path)
	data, err := WebUIFiles.ReadFile(filePath)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "text/css; charset=utf-8")
	if _, err := w.Write(data); err != nil {
		log.Printf("Failed to write response: %v", err)
	}
}

// handleProxy proxies JSON-RPC requests to the target endpoint
func (s *Server) handleProxy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get target endpoint from header
	targetEndpoint := r.Header.Get("X-Target-Endpoint")
	if targetEndpoint == "" {
		http.Error(w, "X-Target-Endpoint header is required", http.StatusBadRequest)
		return
	}

	// Read request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read request body: %v", err), http.StatusBadRequest)
		return
	}
	defer func() {
		if err := r.Body.Close(); err != nil {
			log.Printf("Failed to close request body: %v", err)
		}
	}()

	// Validate JSON
	var jsonReq map[string]interface{}
	if err := json.Unmarshal(body, &jsonReq); err != nil {
		http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
		return
	}

	// Create request to target endpoint
	proxyReq, err := http.NewRequest(http.MethodPost, targetEndpoint, strings.NewReader(string(body)))
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create proxy request: %v", err), http.StatusInternalServerError)
		return
	}

	// Copy relevant headers
	proxyReq.Header.Set("Content-Type", "application/json")
	for key, values := range r.Header {
		if strings.HasPrefix(strings.ToLower(key), "x-") && key != "X-Target-Endpoint" {
			for _, value := range values {
				proxyReq.Header.Add(key, value)
			}
		}
	}

	// Make request
	client := &http.Client{}
	resp, err := client.Do(proxyReq)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to proxy request: %v", err), http.StatusBadGateway)
		return
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			log.Printf("Failed to close response body: %v", err)
		}
	}()

	// Read response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read response: %v", err), http.StatusBadGateway)
		return
	}

	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Target-Endpoint")
	w.Header().Set("Content-Type", "application/json")

	// Copy status code
	w.WriteHeader(resp.StatusCode)
	if _, err := w.Write(respBody); err != nil {
		log.Printf("Failed to write response: %v", err)
	}
}
