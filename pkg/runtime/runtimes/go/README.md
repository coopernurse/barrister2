# Barrister Go Runtime

This directory contains the Go runtime library for Barrister-generated code.

## Structure

- `barrister2/` - Main runtime library package
  - `rpc.go` - RPC error handling
  - `validation.go` - Type validation functions
  - `types.go` - Type helper functions
- `tests/` - Unit tests

## Testing

Run tests locally (requires Go 1.21+):
```bash
make test
```

Run tests in Docker (no local Go required):
```bash
make test-docker
```

## Usage

Generated code imports from this library:
```go
import "github.com/coopernurse/barrister2/pkg/runtime/runtimes/go/barrister2"
```

The runtime library provides:
- `RPCError` - Error type for JSON-RPC errors
- `ValidateType()` - Main validation function
- `ValidateStruct()`, `ValidateEnum()`, etc. - Specific validators
- Helper functions for working with type definitions (`FindStruct`, `FindEnum`, `GetStructFields`)

## Generated Code

The Go generator creates:

1. **Namespace files** (`{namespace}.go`):
   - Native Go structs with JSON tags
   - Native Go enum types (string constants)
   - `ALL_STRUCTS` and `ALL_ENUMS` maps for runtime validation

2. **`server.go`**:
   - HTTP server using `net/http`
   - Interface stubs as Go interfaces
   - `BarristerServer` struct with `Register()` method
   - Request handling (JSON-RPC 2.0, batch requests, notifications)

3. **`client.go`**:
   - `Transport` interface
   - `HTTPTransport` struct with configurable headers
   - Client structs per interface (`{Interface}Client`)

## Example

```go
// Server
server := NewBarristerServer("localhost", 8080)
server.Register("MyInterface", &MyInterfaceImpl{})
server.ServeForever()

// Client
transport := NewHTTPTransport("http://localhost:8080", nil)
client := NewMyInterfaceClient(transport)
result, err := client.MyMethod(param1, param2)
```

**Note:** The runtime library is automatically bundled into the output directory when code is generated, so no separate installation is required.

