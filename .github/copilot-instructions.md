# Barrister RPC - AI Coding Guide

## Project Overview

Barrister is a JSON-RPC 2.0 system with IDL-based type definitions, validation, and multi-language code generation. The codebase comprises a Go CLI that parses `.idl` files and generates client/server code for Python, TypeScript, C#, Java, and Go.

**Core Architecture:**
```
IDL File → Go Parser → Plugin System → Generated Code (client.*, server.*, idl.*)
                                     ↓
                       Embedded Runtime Libraries (copied to output)
```

## Essential Components

### 1. IDL Parser (`pkg/parser/`)
- Uses `alecthomas/participle` for parsing
- Grammar defined in [parser.go](pkg/parser/parser.go) via struct tags
- Supports: interfaces, structs (with inheritance via `extends`), enums, namespaces, optional fields
- Built-in types: `string`, `int`, `float`, `bool`, plus arrays `[]Type` and maps `map[string]Type`
- All IDL files **must** declare a namespace (validated in [validator.go](pkg/parser/validator.go))

### 2. Plugin System (`pkg/generator/`)
- Each language has a plugin implementing the `Plugin` interface ([plugin.go](pkg/generator/plugin.go))
- Plugins register via `generator.Register()` in `cmd/barrister/barrister.go`
- **Key pattern:** Plugins generate 3 files + copy embedded runtime:
  - `idl.{ext}` - Type definitions as data structures
  - `server.{ext}` - HTTP server with interface stubs
  - `client.{ext}` - Client with transport abstraction
  - Runtime library copied from `pkg/runtime/runtimes/{lang}/barrister2/`

### 3. Runtime Libraries (`pkg/runtime/runtimes/`)
- **Embedded at compile time** via Go `embed` directive in [pkg/runtime/embed.go](pkg/runtime/embed.go)
- Each runtime provides:
  - Type validation (structs, enums, arrays, maps, optional fields, inheritance)
  - RPC error handling (`RPCError` exception/error class)
  - Type helper utilities (finding structs/enums, resolving inheritance)
- **Critical separation:** Runtime code is generic and reusable; generated code is IDL-specific
- See [RUNTIME_IMPLEMENTATION_GUIDE.md](docs/RUNTIME_IMPLEMENTATION_GUIDE.md) for detailed requirements

### 4. Web UI (`webui/`)
- Mithril.js SPA for testing RPC services
- Build with `cd webui && make build` (creates `dist/` for embedding)
- Embedded into Go binary via [pkg/webui/embed.go](pkg/webui/embed.go)
- Launch with `barrister -ui -ui-port 8080`

## Key Development Workflows

### Building
```bash
make build                    # Build binary + webui → target/barrister
make build-linux              # Cross-compile for Docker (AMD64)
```

### Testing Hierarchy
1. **Unit tests:** `make test` - Tests parser and generator logic
2. **Runtime tests:** `make test-runtimes` - Tests each language's validation/RPC code in isolation
3. **Integration tests:** `make test-generators` - End-to-end: generate code → start Docker server → run client tests
   - Uses [examples/conform.idl](examples/conform.idl) which exercises all IDL features
   - See [tests/integration/README.md](tests/integration/README.md)

### Running Integration Tests
```bash
make test-generator-python    # Single language
make test-generators          # All languages
```

**Test flow:**
1. Generate code with `-test-server` flag (creates `test_server.*` and `test_client.*`)
2. Start server in Docker container
3. Run client tests that validate all interface methods
4. Reports pass/fail (exit code 0 = success)

### Testing Web UI Locally
```bash
# Start test servers for all runtimes (runs on ports 9000-9004)
make start-test-servers
make status-test-servers

# Then launch UI
target/barrister -ui -ui-port 8080
# Open http://localhost:8080

# Clean up
make stop-test-servers
```

## Code Generation Patterns

### Namespace Handling
- Types are grouped by namespace using `GroupTypesByNamespace()` ([namespace.go](pkg/generator/namespace.go))
- Returns `map[string]*NamespaceTypes` with structs/enums/interfaces per namespace
- Qualified names like `inc.Status` resolve via `GetNamespaceFromType()` and `GetBaseName()`

### Type Reference Resolution
- All generators build `structMap` and `enumMap` for O(1) lookups
- Handle type references in: method params/returns, struct fields, array elements, map values
- **Always respect namespaces** when generating type references

### Testing Flag Pattern
When `-test-server` flag is set:
- Generate `test_server.{ext}` with concrete implementations of all interface methods
- Generate `test_client.{ext}` that calls all methods and validates responses
- Implementations mirror [examples/conform.idl](examples/conform.idl) expectations

## Critical Conventions

1. **Makefile delegation:** Root [Makefile](Makefile) delegates to runtime-specific Makefiles via `cd pkg/runtime/runtimes/{lang} && $(MAKE)`
2. **Output directory:** `-dir` flag controls where generated code goes (defaults to `./generated`)
3. **CLI structure:** `barrister [flags] <idl-file>` or `barrister -ui` for web mode
4. **Error handling:** Parser uses `ValidationErrors` to collect multiple errors before failing
5. **Optional fields:** Marked with `[optional]` in IDL, validated to allow null/None/nil
6. **Struct inheritance:** `extends` keyword requires validating parent type exists and is a struct

## Common Pitfalls

- **Don't forget namespace declarations** - validator enforces this for non-empty IDL files
- **Embed directives are finicky** - paths in `//go:embed` must be relative to the .go file
- **Integration tests need Docker** - they use language-specific images (python:3.11-slim, node:18-slim, etc.)
- **Generated code imports runtime** - ensure relative paths match (e.g., `from barrister2 import ...`)
- **Web UI requires build** - changes to `webui/src/` need `cd webui && make build` before `make build`

## Adding New Language Support

1. Create runtime library in `pkg/runtime/runtimes/{lang}/barrister2/`
2. Add embed directive in [pkg/runtime/embed.go](pkg/runtime/embed.go)
3. Implement plugin in `pkg/generator/{lang}_client_server.go`
4. Register plugin in [cmd/barrister/barrister.go](cmd/barrister/barrister.go)
5. Add integration tests in `tests/integration/test_generator_{lang}.sh`
6. Add to `RUNTIMES` array in [scripts/test-servers.sh](scripts/test-servers.sh)

Follow the structure in [RUNTIME_IMPLEMENTATION_GUIDE.md](docs/RUNTIME_IMPLEMENTATION_GUIDE.md) - it provides detailed requirements for validation, RPC handling, and generated code structure.
