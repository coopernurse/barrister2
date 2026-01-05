package playground

import (
	"archive/zip"
	"bytes"
	"flag"
	"io"
	"os"
	"path/filepath"
	"testing"

	"github.com/coopernurse/barrister2/pkg/generator"
	"github.com/coopernurse/barrister2/pkg/parser"
)

func TestCreateZip(t *testing.T) {
	// Create temp directory for tests
	tempDir, err := os.MkdirTemp("", "barrister-test-")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create manager with a plugin that creates multiple test files
	plugins := []generator.Plugin{
		&mockPlugin{
			name: "mock-runtime",
			generateFunc: func(idl *parser.IDL, fs *flag.FlagSet) error {
				dirFlag := fs.Lookup("dir")
				if dirFlag != nil {
					dir := dirFlag.Value.String()
					// Create multiple test files
					if err := os.WriteFile(filepath.Join(dir, "file1.txt"), []byte("content 1"), 0644); err != nil {
						return err
					}
					if err := os.WriteFile(filepath.Join(dir, "file2.txt"), []byte("content 2"), 0644); err != nil {
						return err
					}
					// Create a subdirectory with a file
					subDir := filepath.Join(dir, "subdir")
					if err := os.MkdirAll(subDir, 0755); err != nil {
						return err
					}
					if err := os.WriteFile(filepath.Join(subDir, "file3.txt"), []byte("content 3"), 0644); err != nil {
						return err
					}
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

	// Create ZIP
	zipData, err := mgr.CreateZip(session.ID)
	if err != nil {
		t.Fatalf("failed to create zip: %v", err)
	}

	// Verify ZIP is not empty
	if len(zipData) == 0 {
		t.Error("expected zip data to be non-empty")
	}

	// Read ZIP and verify contents
	zipReader, err := zip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
	if err != nil {
		t.Fatalf("failed to read zip: %v", err)
	}

	// Verify expected files are in ZIP
	expectedFiles := []string{"file1.txt", "file2.txt", "subdir/file3.txt"}
	foundFiles := make(map[string]bool)

	for _, f := range zipReader.File {
		foundFiles[f.Name] = true

		// Verify file contents
		rc, err := f.Open()
		if err != nil {
			t.Fatalf("failed to open zip entry %s: %v", f.Name, err)
		}
		content, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			t.Fatalf("failed to read zip entry %s: %v", f.Name, err)
		}

		// Verify content matches expected
		switch f.Name {
		case "file1.txt":
			if string(content) != "content 1" {
				t.Errorf("expected 'content 1', got '%s'", string(content))
			}
		case "file2.txt":
			if string(content) != "content 2" {
				t.Errorf("expected 'content 2', got '%s'", string(content))
			}
		case "subdir/file3.txt":
			if string(content) != "content 3" {
				t.Errorf("expected 'content 3', got '%s'", string(content))
			}
		}
	}

	// Verify all expected files are present
	for _, expected := range expectedFiles {
		if !foundFiles[expected] {
			t.Errorf("expected file %s not found in zip", expected)
		}
	}

	// Verify zip filename format
	zipFilename := session.GetZipFilename()
	if zipFilename == "" {
		t.Error("expected zip filename to be non-empty")
	}
	t.Logf("Generated zip filename: %s", zipFilename)
}

func TestCreateZipNonExistentSession(t *testing.T) {
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

	// Try to create ZIP for non-existent session
	_, err = mgr.CreateZip("non-existent-id")
	if err == nil {
		t.Error("expected error when creating zip for non-existent session")
	}
}
