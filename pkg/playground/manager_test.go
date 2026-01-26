package playground

import (
	"flag"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/coopernurse/pulserpc/pkg/generator"
	"github.com/coopernurse/pulserpc/pkg/parser"
)

// mockPlugin is a mock generator plugin for testing
type mockPlugin struct {
	name      string
	generateFunc func(idl *parser.IDL, fs *flag.FlagSet) error
}

func (m *mockPlugin) Name() string {
	return m.name
}

func (m *mockPlugin) RegisterFlags(fs *flag.FlagSet) {
	// No-op for mock
}

func (m *mockPlugin) Generate(idl *parser.IDL, fs *flag.FlagSet) error {
	if m.generateFunc != nil {
		return m.generateFunc(idl, fs)
	}
	return nil
}

func TestNewManager(t *testing.T) {
	// Create temp directory for tests
	tempDir, err := os.MkdirTemp("", "barrister-test-")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create manager
	plugins := []generator.Plugin{
		&mockPlugin{name: "mock-runtime"},
	}
	mgr, err := NewManager(tempDir, plugins)
	if err != nil {
		t.Fatalf("failed to create manager: %v", err)
	}

	// Verify manager is initialized
	if mgr.baseDir != tempDir {
		t.Errorf("expected baseDir %s, got %s", tempDir, mgr.baseDir)
	}

	if mgr.maxAge != DefaultMaxAge {
		t.Errorf("expected maxAge %v, got %v", DefaultMaxAge, mgr.maxAge)
	}

	// Verify plugin was registered
	if _, ok := mgr.plugins["mock-runtime"]; !ok {
		t.Error("mock-runtime plugin not registered")
	}
}

func TestGenerate(t *testing.T) {
	// Create temp directory for tests
	tempDir, err := os.MkdirTemp("", "barrister-test-")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create manager with mock plugin
	plugins := []generator.Plugin{
		&mockPlugin{
			name: "mock-runtime",
			generateFunc: func(idl *parser.IDL, fs *flag.FlagSet) error {
				// Create a test file in the session directory
				dirFlag := fs.Lookup("dir")
				if dirFlag != nil {
					dir := dirFlag.Value.String()
					testFile := filepath.Join(dir, "test.txt")
					return os.WriteFile(testFile, []byte("test content"), 0644)
				}
				return nil
			},
		},
	}
	mgr, err := NewManager(tempDir, plugins)
	if err != nil {
		t.Fatalf("failed to create manager: %v", err)
	}

	// Test invalid runtime
	_, err = mgr.Generate("some idl", "invalid-runtime")
	if err == nil {
		t.Error("expected error for invalid runtime, got nil")
	}

	// Test with valid IDL
	idl := `
	namespace test

	struct User {
		name string
		age int
	}
	`

	session, err := mgr.Generate(idl, "mock-runtime")
	if err != nil {
		t.Fatalf("failed to generate: %v", err)
	}

	// Verify session was created
	if session.ID == "" {
		t.Error("expected session ID to be set")
	}

	if session.Runtime != "mock-runtime" {
		t.Errorf("expected runtime mock-runtime, got %s", session.Runtime)
	}

	if session.IDL != idl {
		t.Error("expected IDL to be preserved")
	}

	if session.Dir == "" {
		t.Error("expected session Dir to be set")
	}

	// Verify session was stored
	retrieved, ok := mgr.GetSession(session.ID)
	if !ok {
		t.Error("failed to retrieve session")
	}

	if retrieved.ID != session.ID {
		t.Error("retrieved session ID doesn't match")
	}

	// Verify session directory exists
	if _, err := os.Stat(session.Dir); os.IsNotExist(err) {
		t.Error("session directory was not created")
	}
}

func TestGenerateInvalidIDL(t *testing.T) {
	// Create temp directory for tests
	tempDir, err := os.MkdirTemp("", "barrister-test-")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create manager with mock plugin
	plugins := []generator.Plugin{
		&mockPlugin{name: "mock-runtime"},
	}
	mgr, err := NewManager(tempDir, plugins)
	if err != nil {
		t.Fatalf("failed to create manager: %v", err)
	}

	// Test with invalid IDL
	invalidIDL := `
	namespace test

	struct User {
		name string
		age: invalidtype
	}
	`

	_, err = mgr.Generate(invalidIDL, "mock-runtime")
	if err == nil {
		t.Error("expected error for invalid IDL, got nil")
	}
}

func TestSessionCleanup(t *testing.T) {
	// Create temp directory for tests
	tempDir, err := os.MkdirTemp("", "barrister-test-")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create manager with short max age for testing
	plugins := []generator.Plugin{
		&mockPlugin{name: "mock-runtime"},
	}
	mgr, err := NewManager(tempDir, plugins)
	if err != nil {
		t.Fatalf("failed to create manager: %v", err)
	}
	mgr.maxAge = 10 * time.Millisecond // Very short max age for testing

	// Create a session
	idl := `
	namespace test

	struct User {
		name string
	}
	`
	session, err := mgr.Generate(idl, "mock-runtime")
	if err != nil {
		t.Fatalf("failed to generate: %v", err)
	}

	// Verify session exists
	_, ok := mgr.GetSession(session.ID)
	if !ok {
		t.Error("session should exist immediately after creation")
	}

	// Verify session directory exists
	if _, err := os.Stat(session.Dir); os.IsNotExist(err) {
		t.Error("session directory should exist")
	}

	// Wait for session to expire
	time.Sleep(20 * time.Millisecond)

	// Force cleanup
	mgr.CleanupNow()

	// Verify session was deleted
	_, ok = mgr.GetSession(session.ID)
	if ok {
		t.Error("session should be deleted after cleanup")
	}

	// Verify session directory was deleted
	if _, err := os.Stat(session.Dir); !os.IsNotExist(err) {
		t.Error("session directory should be deleted after cleanup")
	}
}

func TestIsExpired(t *testing.T) {
	// Create temp directory for tests
	tempDir, err := os.MkdirTemp("", "barrister-test-")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create manager with short max age for testing
	plugins := []generator.Plugin{
		&mockPlugin{name: "mock-runtime"},
	}
	mgr, err := NewManager(tempDir, plugins)
	if err != nil {
		t.Fatalf("failed to create manager: %v", err)
	}
	mgr.maxAge = 10 * time.Millisecond // Very short max age for testing

	// Create a session
	idl := `
	namespace test

	struct User {
		name string
	}
	`
	session, err := mgr.Generate(idl, "mock-runtime")
	if err != nil {
		t.Fatalf("failed to generate: %v", err)
	}

	// Session should not be expired immediately
	if mgr.IsExpired(session.ID) {
		t.Error("session should not be expired immediately after creation")
	}

	// Wait for session to expire
	time.Sleep(20 * time.Millisecond)

	// Session should be expired
	if !mgr.IsExpired(session.ID) {
		t.Error("session should be expired after max age")
	}
}

func TestGetSessionCount(t *testing.T) {
	// Create temp directory for tests
	tempDir, err := os.MkdirTemp("", "barrister-test-")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create manager
	plugins := []generator.Plugin{
		&mockPlugin{name: "mock-runtime"},
	}
	mgr, err := NewManager(tempDir, plugins)
	if err != nil {
		t.Fatalf("failed to create manager: %v", err)
	}

	// Initially no sessions
	if count := mgr.GetSessionCount(); count != 0 {
		t.Errorf("expected 0 sessions, got %d", count)
	}

	// Create a session
	idl := `
	namespace test

	struct User {
		name string
	}
	`
	session, err := mgr.Generate(idl, "mock-runtime")
	if err != nil {
		t.Fatalf("failed to generate: %v", err)
	}

	// Should have 1 session
	if count := mgr.GetSessionCount(); count != 1 {
		t.Errorf("expected 1 session, got %d", count)
	}

	// Delete the session
	if err := mgr.Delete(session.ID); err != nil {
		t.Fatalf("failed to delete session: %v", err)
	}

	// Should have 0 sessions again
	if count := mgr.GetSessionCount(); count != 0 {
		t.Errorf("expected 0 sessions after deletion, got %d", count)
	}
}

func TestDelete(t *testing.T) {
	// Create temp directory for tests
	tempDir, err := os.MkdirTemp("", "barrister-test-")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create manager
	plugins := []generator.Plugin{
		&mockPlugin{name: "mock-runtime"},
	}
	mgr, err := NewManager(tempDir, plugins)
	if err != nil {
		t.Fatalf("failed to create manager: %v", err)
	}

	// Create a session
	idl := `
	namespace test

	struct User {
		name string
	}
	`
	session, err := mgr.Generate(idl, "mock-runtime")
	if err != nil {
		t.Fatalf("failed to generate: %v", err)
	}

	// Verify session directory exists
	if _, err := os.Stat(session.Dir); os.IsNotExist(err) {
		t.Error("session directory should exist")
	}

	// Delete the session
	if err := mgr.Delete(session.ID); err != nil {
		t.Fatalf("failed to delete session: %v", err)
	}

	// Verify session was deleted
	_, ok := mgr.GetSession(session.ID)
	if ok {
		t.Error("session should be deleted after Delete()")
	}

	// Verify session directory was deleted
	if _, err := os.Stat(session.Dir); !os.IsNotExist(err) {
		t.Error("session directory should be deleted after Delete()")
	}

	// Try to delete non-existent session
	err = mgr.Delete("non-existent-id")
	if err == nil {
		t.Error("expected error when deleting non-existent session")
	}
}

func TestGetFile(t *testing.T) {
	// Create temp directory for tests
	tempDir, err := os.MkdirTemp("", "barrister-test-")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create manager with a plugin that creates test files
	plugins := []generator.Plugin{
		&mockPlugin{
			name: "mock-runtime",
			generateFunc: func(idl *parser.IDL, fs *flag.FlagSet) error {
				// Create a test file in the session directory
				dirFlag := fs.Lookup("dir")
				if dirFlag != nil {
					dir := dirFlag.Value.String()
					testFile := filepath.Join(dir, "test.txt")
					return os.WriteFile(testFile, []byte("test content"), 0644)
				}
				return nil
			},
		},
	}
	mgr, err := NewManager(tempDir, plugins)
	if err != nil {
		t.Fatalf("failed to create manager: %v", err)
	}

	// Create a session
	idl := `
	namespace test

	struct User {
		name string
	}
	`
	session, err := mgr.Generate(idl, "mock-runtime")
	if err != nil {
		t.Fatalf("failed to generate: %v", err)
	}

	// Test getting file content (file was created by mock plugin)
	expectedContent := []byte("test content")
	content, err := mgr.GetFile(session.ID, "test.txt")
	if err != nil {
		t.Fatalf("failed to get file: %v", err)
	}

	if string(content) != string(expectedContent) {
		t.Errorf("expected content %s, got %s", expectedContent, content)
	}

	// Test getting file from non-existent session
	_, err = mgr.GetFile("non-existent-id", "test.txt")
	if err == nil {
		t.Error("expected error when getting file from non-existent session")
	}
}
