# Barrister C# Runtime

This directory contains the C# runtime library for Barrister, targeting .NET 8.0.

## Requirements

- .NET 8.0 SDK or later

## Structure

```
csharp/
├── barrister2/          # Runtime library source files
│   ├── RPCError.cs      # JSON-RPC error exception class
│   ├── Validation.cs    # Type validation functions
│   └── Types.cs         # Type helper utilities
├── tests/               # Unit tests
│   ├── ValidationTests.cs
│   ├── TypesTests.cs
│   └── RPCTests.cs
└── barrister2.csproj    # Project file for runtime library
```

## Building and Testing

### Local Testing

If you have .NET SDK installed locally:

```bash
make test
```

### Docker Testing

To test using Docker (recommended):

```bash
make test-docker
```

This uses the official Microsoft .NET SDK 8.0 Docker image (`mcr.microsoft.com/dotnet/sdk:8.0`).

## Runtime Library

The runtime library provides:

- **RPCError**: Exception class for JSON-RPC 2.0 errors
- **Validation**: Type validation functions for all Barrister types (built-ins, arrays, maps, enums, structs)
- **Types**: Helper functions for working with type definitions (finding structs/enums, resolving inheritance)

## Generated Code

When you generate C# code from an IDL, the generator creates:

- **Namespace files** (e.g., `conform.cs`): IDL-specific type definitions as static dictionaries
- **Server.cs**: HTTP server using ASP.NET Core with interface stubs
- **Client.cs**: Client classes with HTTP transport
- **idl.json**: JSON representation of the IDL

## Usage Example

### Generated Server

```csharp
using Server;

var server = new BarristerServer();
server.Register("MyInterface", new MyInterfaceImpl());
await server.RunAsync("localhost", 8080);
```

### Generated Client

```csharp
using Client;

var transport = new HttpTransport("http://localhost:8080");
var client = new MyInterfaceClient(transport);
var result = await client.MyMethodAsync("param1", 42);
```

## Docker Image

The C# runtime uses the official Microsoft .NET SDK Docker image:

- **Image**: `mcr.microsoft.com/dotnet/sdk:8.0`
- **Version**: .NET 8.0 (LTS - Long Term Support)

This ensures consistent testing across different platforms and environments.

## Notes

- The runtime targets .NET 8.0 which is the current LTS version
- All code uses standard library only (no third-party dependencies)
- The server implementation uses ASP.NET Core Minimal APIs
- The client uses `HttpClient` from `System.Net.Http`

