# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Barrister2** is a JSON-RPC 2.0 Remote Procedure Call (RPC) system with IDL (Interface Definition Language)-based type definitions, validation, and multi-language code generation.

**Core Architecture:**
```
IDL File → Go Parser → Plugin System → Generated Code (client.*, server.*, idl.*)
                                     ↓
                       Embedded Runtime Libraries (copied to output)
```

## Common Commands

```bash
# Build
make build                    # Build binary + webui → target/barrister
make build-linux              # Cross-compile for Docker (AMD64)

# Testing
make test                     # Go unit tests (parser, generator)
make cover                    # Tests with coverage report
make test-runtimes            # Test all language runtime libraries
make test-generators          # End-to-end integration tests (all languages)
make test-generator-python    # Test specific language generator
make test-generator-ts
make test-generator-java
make test-generator-csharp
make test-generator-go

# Linting
make lint                     # golangci-lint on Go code
make lint-webui               # ESLint on webui JavaScript

# Web UI
make start-test-servers       # Start test servers on ports 9000-9004
make stop-test-servers
make status-test-servers

# Web UI development
cd pkg/webui && npm install
npm run dev                   # Vite dev server
npm run build                 # Build for production
npm run lint                  # ESLint
```

**Start Web UI:**
```bash
./target/barrister -ui -ui-port 8080
# Open http://localhost:8080
```

## Key Components

### IDL Parser (`pkg/parser/`)
- Uses `alecthomas/participle` for parsing; grammar in [parser.go](pkg/parser/parser.go) via struct tags
- Supports: interfaces, structs (with `extends` inheritance), enums, namespaces, optional fields
- Built-in types: `string`, `int`, `float`, `bool`, arrays `[]Type`, maps `map[string]Type`
- All IDL files **must** declare a namespace

### Plugin System (`pkg/generator/`)
- Each language has a plugin implementing `Plugin` interface ([plugin.go](pkg/generator/plugin.go))
- Plugins register via `generator.Register()` in [cmd/barrister/barrister.go](cmd/barrister/barrister.go)
- Generates 3 files + copies embedded runtime:
  - `idl.{ext}` - Type definitions
  - `server.{ext}` - HTTP server with interface stubs
  - `client.{ext}` - Client with transport abstraction
  - Runtime from `pkg/runtime/runtimes/{lang}/barrister2/`

### Runtime Libraries (`pkg/runtime/runtimes/`)
- Embedded at compile time via Go `embed` directive ([pkg/runtime/embed.go](pkg/runtime/embed.go))
- Each runtime provides: type validation, RPC error handling (`RPCError`), type helper utilities
- See [RUNTIME_IMPLEMENTATION_GUIDE.md](docs/RUNTIME_IMPLEMENTATION_GUIDE.md)

### Web UI (`pkg/webui/`)
- Mithril.js SPA for testing RPC services
- Built assets embedded into binary via [pkg/webui/embed.go](pkg/webui/embed.go)

## Supported Languages

- **Go** (`go-client-server`)
- **Java** (`java-client-server`)
- **Python** (`python-client-server`)
- **TypeScript** (`ts-client-server`)
- **C#** (`csharp-client-server`)

## Critical Conventions

1. **Makefile delegation:** Root Makefile delegates to runtime-specific Makefiles via `cd pkg/runtime/runtimes/{lang} && $(MAKE)`
2. **CLI structure:** `barrister [flags] <idl-file>` or `barrister -ui` for web mode
3. **Optional fields:** Marked with `[optional]` in IDL; validated to allow null
4. **Struct inheritance:** `extends` keyword requires validating parent type exists and is a struct
5. **Integration tests need Docker** - use language-specific images

## Common Pitfalls

- **Namespace declarations required** - validator enforces this for non-empty IDL files
- **Embed directives are finicky** - paths in `//go:embed` must be relative to the .go file
- **Generated code imports runtime** - ensure relative paths match (e.g., `from barrister2 import ...`)
- **Web UI requires build** - changes to `webui/src/` need `cd webui && make build` before `make build`

## Integration Test Flow

1. Generate code with `-generate-test-files` flag (creates `test_server.*` and `test_client.*` - default is false)
2. Start server in Docker container
3. Run client tests validating all interface methods
4. Uses [examples/conform.idl](examples/conform.idl) which exercises all IDL features

## Adding New Language Support

1. Create runtime library in `pkg/runtime/runtimes/{lang}/barrister2/`
2. Add embed directive in `pkg/runtime/embed.go`
3. Implement plugin in `pkg/generator/{lang}_client_server.go`
4. Register plugin in `cmd/barrister/barrister.go`
5. Add integration tests in `tests/integration/test_generator_{lang}.sh`
6. Add to `RUNTIMES` array in `scripts/test-servers.sh`

See [RUNTIME_IMPLEMENTATION_GUIDE.md](docs/RUNTIME_IMPLEMENTATION_GUIDE.md) for detailed requirements.

# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

Always use the `--no-daemon` flag when running `bd`

## Quick Reference

```bash
bd --no-daemon ready              # Find available work
bd --no-daemon show <id>          # View issue details
bd --no-daemon update <id> --status in_progress  # Claim work
bd --no-daemon close <id>         # Complete work
bd --no-daemon sync               # Sync with git
```
