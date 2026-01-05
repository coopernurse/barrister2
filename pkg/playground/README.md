# Playground Package

The playground package provides an in-memory session management system for the Barrister IDL playground web UI. It handles code generation, file storage, and automatic cleanup of temporary sessions.

## Overview

The playground is designed to support interactive code generation in a web environment:

- **Session-based**: Each code generation request creates a unique session with a ULID identifier
- **In-memory**: Session metadata is stored in memory for fast access
- **On-disk files**: Generated files are written to a temporary directory on disk
- **Auto-cleanup**: Sessions and files are automatically deleted after a configurable time period (default: 2 hours)
- **Thread-safe**: All operations are protected by mutexes for concurrent access

## Components

### Manager

The `Manager` struct is the main entry point for playground operations:

```go
type Manager struct {
    baseDir string           // Base directory for session files
    maxAge  time.Duration    // Maximum session age before cleanup
    mu      sync.RWMutex     // Protects sessions map
    sessions map[string]*Session
    plugins map[string]generator.Plugin
}
```

**Key Methods:**

- `NewManager(baseDir string, plugins []generator.Plugin) (*Manager, error)`: Creates a new manager
- `Generate(idl string, runtime string) (*Session, error)`: Generates code from IDL and creates a session
- `GetSession(id string) (*Session, bool)`: Retrieves a session by ID
- `GetFile(sessionID string, filename string) ([]byte, error)`: Retrieves a file from a session
- `CreateZip(sessionID string) ([]byte, error)`: Creates a ZIP archive of all session files
- `CleanupNow()`: Manually triggers cleanup of expired sessions
- `SetMaxAge(duration time.Duration)`: Sets the maximum session age
- `GetSessionCount() int`: Returns the current number of active sessions

### Session

The `Session` struct represents a single code generation session:

```go
type Session struct {
    ID      string    // ULID-based session identifier
    Dir     string    // Directory containing generated files
    Files   []string  // List of generated file paths
    Created time.Time // Session creation timestamp
}
```

**Key Methods:**

- `IsExpired(maxAge time.Duration) bool`: Checks if the session has expired
- `Delete() error`: Deletes the session's directory and all files

## Usage Example

```go
import (
    "github.com/coopernurse/barrister2/pkg/generator"
    "github.com/coopernurse/barrister2/pkg/playground"
)

func main() {
    // Create plugins for supported runtimes
    plugins := []generator.Plugin{
        generator.NewGoClientServer(),
        generator.NewJavaClientServer(),
        generator.NewPythonClientServer(),
        generator.NewTSClientServer(),
        generator.NewCSharpClientServer(),
    }

    // Create manager
    mgr, err := playground.NewManager("/tmp/playground", plugins)
    if err != nil {
        log.Fatal(err)
    }

    // Generate code from IDL
    idl := `
namespace test

struct User {
    name string
    age  int
}
`
    session, err := mgr.Generate(idl, "go-client-server")
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Generated session: %s\n", session.ID)
    fmt.Printf("Files: %v\n", session.Files)

    // Retrieve a file
    content, err := mgr.GetFile(session.ID, "go.mod")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("File content: %s\n", content)

    // Create ZIP archive
    zipData, err := mgr.CreateZip(session.ID)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("ZIP size: %d bytes\n", len(zipData))
}
```

## Session Lifecycle

1. **Creation**: A session is created when `Generate()` is called
   - Unique ULID is generated
   - Temporary directory is created
   - Code is generated into the directory
   - Session metadata is stored in memory

2. **Access**: Sessions can be accessed via `GetSession()` and file operations
   - Files are read from disk on demand
   - No memory overhead for file contents

3. **Expiration**: Sessions expire after `maxAge` duration
   - Default: 2 hours
   - Configurable via `SetMaxAge()`

4. **Cleanup**: Expired sessions are automatically removed
   - Background goroutine runs every 15 minutes
   - Can be manually triggered via `CleanupNow()`
   - Deletes both in-memory metadata and on-disk files

## Thread Safety

The Manager is designed for concurrent access:

- All session operations are protected by `sync.RWMutex`
- Multiple readers can access sessions simultaneously
- Writers (generate, cleanup) have exclusive access
- Safe for use in web servers with multiple concurrent requests

## Testing

The package includes comprehensive tests:

- `TestGenerate`: Basic session generation
- `TestGenerateMultipleRuntimes`: Multiple runtime support
- `TestSessionExpiration`: Session expiration logic
- `TestGetSession`: Session retrieval
- `TestGetFile`: File retrieval
- `TestGetFileNotFound`: Error handling
- `TestCreateZip`: ZIP creation
- `TestSessionCleanup`: Cleanup functionality
- `TestConcurrentAccess`: Thread safety
- `TestSessionPersistence`: Session behavior across manager instances
- `TestSessionExpirationCleanup`: Full cleanup workflow
- `TestMultipleRuntimesParallel`: Parallel generation

Run tests with:

```bash
go test ./pkg/playground -v
```

## Integration with Web UI

The playground manager is integrated into the web UI server at `pkg/webui/server.go`:

- HTTP handler for `/api/playground/generate`: Code generation endpoint
- HTTP handler for `/api/playground/files/:id/*`: File retrieval endpoint
- HTTP handler for `/api/playground/zip/:id`: ZIP download endpoint

See `pkg/webui/server.go` for implementation details.

## Dependencies

- `github.com/oklog/ulid/v2`: Unique session identifier generation
- `github.com/coopernurse/barrister2/pkg/generator`: Code generation plugins
- Standard library: `archive/zip`, `io`, `os`, `path/filepath`, `sync`, `time`
