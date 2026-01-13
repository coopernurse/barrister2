# Barrister2 E-Commerce Checkout Example - C#

A complete working example of a Barrister2 RPC service in C#.

## Prerequisites

- .NET 6.0 or later

## Files

- `checkout.idl` - Interface definition
- Generated C# code:
  - `checkout.cs` - Type definitions
  - `Server.cs` - RPC server framework
  - `Client.cs` - RPC client framework
  - `TestServer.cs` - Example implementation
  - `TestClient.cs` - Example client
  - `TestServer.csproj` - Project file
  - `barrister2/` - Runtime library

## Running

### Generate Code

Code is already generated. To regenerate:

```bash
barrister -plugin csharp-client-server checkout.idl
```

### Start Server

```bash
dotnet run --project TestServer.csproj
```

Server runs on http://localhost:8080

### Run Client

```bash
dotnet run --project TestClient.csproj
```

Or if TestClient.csproj doesn't exist:

```bash
csc /reference:Server.cs /reference:checkout.cs TestClient.cs
TestClient.exe
```

## Implementation Pattern

The `TestServer.cs` shows the implementation pattern:

1. **Implement service interfaces** - Implement the generated service interfaces
2. **Register handlers** - Register your implementations with the Barrister server
3. **Start server** - Call `Start()` to begin accepting requests

```csharp
var server = new BarristerServer(8080);
server.RegisterCatalogService(new CatalogService());
server.RegisterCartService(new CartService());
server.RegisterOrderService(new OrderService());
server.Start();
```

## Error Codes

Custom error codes implemented:

- `1001` - CartNotFound: Cart doesn't exist
- `1002` - CartEmpty: Cart has no items
- `1003` - PaymentFailed: Payment method rejected
- `1004` - OutOfStock: Insufficient inventory
- `1005` - InvalidAddress: Shipping address validation failed

Return errors using `RPCException`:

```csharp
throw new RPCException(1002, "CartEmpty: Cannot create order from empty cart");
```
