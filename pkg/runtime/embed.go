package runtime

import (
	"embed"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Embed all Python runtime files
// The embed path is relative to this file's location in pkg/runtime/
// Note: Go's embed doesn't support ".." paths, so runtime files are located in
// pkg/runtime/runtimes/ to enable embedding. This allows the binary to be
// self-contained without requiring the source tree at runtime.
//go:embed all:runtimes/python/barrister2
var pythonRuntimeFiles embed.FS

// Embed all TypeScript runtime files
//go:embed all:runtimes/ts/barrister2
var tsRuntimeFiles embed.FS

// runtimeMap maps language names to their embedded file systems
var runtimeMap = map[string]embed.FS{
	"python": pythonRuntimeFiles,
	"ts":     tsRuntimeFiles,
}

// ListRuntimes returns a list of all available embedded runtimes
func ListRuntimes() []string {
	runtimes := make([]string, 0, len(runtimeMap))
	for lang := range runtimeMap {
		runtimes = append(runtimes, lang)
	}
	return runtimes
}

// GetRuntimeFiles returns a map of filename -> file contents for the specified language runtime
func GetRuntimeFiles(lang string) (map[string][]byte, error) {
	fs, ok := runtimeMap[lang]
	if !ok {
		return nil, fmt.Errorf("runtime for language %q not found (available: %v)", lang, ListRuntimes())
	}

	files := make(map[string][]byte)
	
	// The embed path includes the directory structure, so we need to walk it
	// For Python, files are at: runtimes/python/barrister2/*.py
	basePath := fmt.Sprintf("runtimes/%s/barrister2", lang)
	
	entries, err := fs.ReadDir(basePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read embedded runtime directory for %s: %w", lang, err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		// Filter files by language-specific extension
		if lang == "python" && !strings.HasSuffix(entry.Name(), ".py") {
			continue
		}
		if lang == "ts" && !strings.HasSuffix(entry.Name(), ".ts") {
			continue
		}

		filePath := filepath.Join(basePath, entry.Name())
		data, err := fs.ReadFile(filePath)
		if err != nil {
			return nil, fmt.Errorf("failed to read embedded runtime file %s: %w", entry.Name(), err)
		}

		// Extract just the filename (not the full path) for the map key
		files[entry.Name()] = data
	}

	return files, nil
}

// CopyRuntimeFiles copies all runtime files for the specified language to the output directory
// The files are copied to outputDir/{runtimePackageName}/ where runtimePackageName is typically
// "barrister2" for Python, but may vary by language.
func CopyRuntimeFiles(lang string, outputDir string) error {
	files, err := GetRuntimeFiles(lang)
	if err != nil {
		return err
	}

	// Determine the runtime package directory name based on language
	// For Python, it's "barrister2"
	runtimePackageName := getRuntimePackageName(lang)
	runtimeDir := filepath.Join(outputDir, runtimePackageName)

	if err := os.MkdirAll(runtimeDir, 0755); err != nil {
		return fmt.Errorf("failed to create runtime directory: %w", err)
	}

	// Copy all files
	for filename, data := range files {
		dstPath := filepath.Join(runtimeDir, filename)
		if err := os.WriteFile(dstPath, data, 0644); err != nil {
			return fmt.Errorf("failed to write runtime file %s: %w", dstPath, err)
		}
	}

	return nil
}

// getRuntimePackageName returns the package/module name for the runtime library
// This is the directory name where runtime files are placed in the output
func getRuntimePackageName(lang string) string {
	switch lang {
	case "python":
		return "barrister2"
	default:
		// Default to "barrister2" for unknown languages
		return "barrister2"
	}
}

