# Barrister Playground Design

## Overview

Add an interactive playground mode to Barrister's web UI that allows users to edit/paste IDL, generate code for different language runtimes, view the generated files with syntax highlighting, and download the results as a ZIP archive.

## Requirements

- **Integrated feature**: Add as a second mode to the existing web UI, accessible via navigation menu (Client/Playground)
- **Multi-language support**: Support all current Barrister runtimes (Go, Java, Python, TypeScript, C#)
- **Real-time validation**: Strict IDL validation with clear error messages
- **Session persistence**: Remember user's IDL between sessions via localStorage
- **Clean resource management**: Time-based cleanup of generated files (2-hour max age)

## Architecture

### Backend Components

#### New Package: `pkg/playground`

**Manager struct** - Manages generation sessions and temp file cleanup
```go
type Manager struct {
    baseDir string        // temp base dir for all playground sessions
    maxAge  time.Duration // 2 hours
    mu      sync.RWMutex
    sessions map[string]*Session // keyed by ULID
}
```

**Session struct** - Represents a single generation run
```go
type Session struct {
    ID      string    // ULID identifier
    Created time.Time
    Runtime string    // e.g., "go-client-server"
    IDL     string    // original IDL text
    Files   []string  // relative file paths
    Dir     string    // absolute path to temp dir
}
```

**Key Responsibilities:**
- Generate ULID for each session (using github.com/oklog/ulid)
- Create temp directory: `$TEMP/barrister-playground/<ULID>/`
- Parse IDL with strict validation (fail fast on errors)
- Call appropriate plugin's `Generate()` method with custom FlagSet
- Collect all generated file paths (walk directory tree)
- Run cleanup goroutine every 15 minutes to delete sessions older than 2 hours

#### API Endpoints (in `pkg/webui/server.go`)

**POST /api/playground/generate**
- Request: `{idl: string, runtime: string}`
- Response: `{id: string, files: []string}`
- Returns list of file paths, contents fetched on-demand

**GET /api/playground/files/:id/\***
- Returns file contents for a specific session/file
- Path parameter: ULID session ID + file path
- Returns 404 with friendly message if session was cleaned up

**GET /api/playground/zip/:id**
- Returns ZIP archive of all files in a session
- Preserves directory structure
- Filename: `barrister-<runtime>-<timestamp>.zip`

### Frontend Components

**Technology Stack:**
- **Mithril.js** - Component-based UI framework
- **Highlight.js** - Syntax highlighting via CDN
- **Vite** - Build tool for fast development and production bundling

**Layout Structure:**
```
┌─────────────────────────────────────────────────────┐
│ Client | Playground (mode switcher)                  │
├─────────────────────────────────────────────────────┤
│ Language: [dropdown] | [Generate] | [Download ZIP]  │
├─────────────────────────────────────────────────────┤
│ Error Panel (hidden by default, shows above editor)  │
├──────────────┬──────────────────┬───────────────────┤
│ IDL Editor   │ File Tree        │ Code Viewer       │
│ (textarea)   │ (UL, tree view)  │ (pre > code)      │
│              │                  │                   │
│              │                  │                   │
└──────────────┴──────────────────┴───────────────────┘
```

**Mithril Components:**

1. **App** - Top-level component, handles mode switching between Client and Playground
2. **Playground** - Main playground view container
3. **Editor** - IDL editor with auto-save to localStorage (debounced 500ms)
4. **FileTree** - Recursive tree view with directory grouping
5. **CodeViewer** - Code display with Highlight.js syntax highlighting
6. **Controls** - Language dropdown, Generate button, Download ZIP button
7. **ErrorPanel** - Validation error display banner

**State Management:**
- Mithril's reactive redraw system
- State object tracks: current IDL, selected runtime, file list, selected file, errors, session ID

### Frontend Build Setup

**Project Structure:**
```
pkg/webui/
├── src/                    # New source directory
│   ├── main.js            # Entry point
│   ├── app.js             # App root component
│   ├── client/            # Existing client mode components
│   ├── playground/        # New playground components
│   │   ├── editor.js
│   │   ├── filetree.js
│   │   ├── codeviewer.js
│   │   ├── controls.js
│   │   └── errorpanel.js
│   ├── styles/
│   │   └── main.css
│   └── api.js             # Shared API client
├── dist/                   # Build output (generated)
├── server.go               # Go server
├── vite.config.js          # Vite config
└── package.json            # Node dependencies
```

**Build Configuration:**
- Single `app.js` bundle (all JS + Mithril + Highlight.js bundled)
- Single `style.css` bundle
- `index.html` that references these
- Everything embedded via Go embed (`//go:embed dist/*`)
- Minified in production, no sourcemaps in embedded files

**Makefile Integration:**
```makefile
build-webui:
	cd pkg/webui && npm install && npm run build

build: build-webui
	go build ./cmd/barrister
```

### Testing Strategy

**Backend Testing (Go):**
- Unit tests for `pkg/playground` session management
- Test ULID generation and session lifecycle
- Test cleanup logic (delete old sessions)
- Test concurrent session access (thread safety)
- Integration tests for all API endpoints
- Test error handling with invalid IDL
- Test 404 for stale/expired sessions

**Frontend Testing (E2E with Playwright + Docker):**
- Dockerfile for test environment
- Playwright configuration for headless testing
- Test flows:
  - Generate code for each runtime (Go, Java, Python, TypeScript, C#)
  - Verify file tree displays with nested directories
  - Test syntax highlighting for each language
  - Download ZIP and verify contents
  - Test error display with invalid IDL
  - Test session persistence (refresh page)
  - Test cleanup (try to access old session, verify 404)
  - Test mode switching between Client and Playground
- Can run in CI/CD pipelines

**Test Execution:**
```bash
# Run all tests
make test-e2e

# Or via Docker
docker build -f pkg/webui/tests/Dockerfile -t barrister-e2e .
docker run barrister-e2e
```

## User Flow

1. User opens web UI, sees "Client | Playground" menu
2. User clicks "Playground"
3. Editor loads with:
   - Previous IDL from localStorage (if exists)
   - Or example IDL (UserService from README) if no session
   - Default language: Go
4. User edits IDL (or pastes their own)
5. User selects desired language runtime from dropdown
6. User clicks "Generate" button
7. Backend validates IDL (strict mode - no warnings allowed)
8. On success: File tree populates on right, user can browse files
9. On error: Red banner shows error message above editor
10. User clicks file in tree → contents appear in code viewer with syntax highlighting
11. User clicks "Download ZIP" → browser downloads archive of all generated files
12. If user returns after >2 hours, attempting to access files shows friendly 404 message

## Implementation Phases

**Phase 1: Backend Foundation**
1. Create `pkg/playground` package with Manager and Session structs
2. Implement ULID-based session creation
3. Add cleanup goroutine with 2-hour max age
4. Write unit tests for session management and cleanup

**Phase 2: API Endpoints**
1. Add `/api/playground/generate` endpoint
2. Add `/api/playground/files/:id/*` endpoint
3. Add `/api/playground/zip/:id` endpoint
4. Write integration tests for all endpoints
5. Test with all generator plugins

**Phase 3: Frontend Build Setup**
1. Set up Vite + Mithril project structure
2. Configure build to generate minimal artifacts
3. Set up Go embed to bundle dist/ files
4. Update Makefile with build-webui target
5. Verify build produces working embedded UI

**Phase 4: Frontend Components**
1. Create App component with mode switcher
2. Create Editor component with localStorage persistence
3. Create Controls component (runtime dropdown, Generate button)
4. Create ErrorPanel component
5. Test basic UI rendering

**Phase 5: Playground Features**
1. Create FileTree component with directory grouping
2. Create CodeViewer component with Highlight.js
3. Wire up API client for generate and file fetching
4. Implement Download ZIP functionality
5. Test full generation flow for each runtime

**Phase 6: Polish & E2E Tests**
1. Set up Playwright + Docker configuration
2. Write E2E tests for core user flows
3. Add CSS styling for professional appearance
4. Test session persistence and cleanup scenarios
5. Documentation and final testing

## Dependencies

**New Go Dependencies:**
- `github.com/oklog/ulid` - ULID generation

**New Node Dependencies:**
- `mithril` (^2.2) - UI framework
- `vite` (^5.0) - Build tool (dev dependency)
- `@playwright/test` - E2E testing (dev dependency)

## Success Criteria

- Users can generate code for all 5 runtimes (Go, Java, Python, TypeScript, C#)
- Generated code matches output from CLI generation
- Files are organized in directory tree structure
- Syntax highlighting works for all supported languages
- ZIP download produces correct file structure
- Sessions persist across page reloads
- Temp files are cleaned up after 2 hours
- Clear error messages for invalid IDL
- E2E tests pass in Docker
- All web assets are embedded in Go binary (no runtime dependencies)
