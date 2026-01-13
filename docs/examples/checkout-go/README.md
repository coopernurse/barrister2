# Barrister2 E-Commerce Checkout Example - Go

A complete working example of a Barrister2 RPC service in Go.

## Directory Structure

```
checkout-go/
├── idl/
│   └── checkout.idl      # Interface definition
├── server/
│   └── test_server.go    # Server implementation example
├── client/
│   └── test_client.go    # Client implementation example
├── checkout.go           # Generated type definitions
├── server.go             # Generated server framework
├── client.go             # Generated client framework
├── go.mod                # Go module definition
├── barrister2/           # Runtime library
└── idl.json              # IDL metadata
```

## Running

### Prerequisites

- Go 1.21 or later

### Generate Code

Code is already generated. To regenerate:

```bash
cd idl
barrister -plugin go-client-server checkout.idl
```

### Start Server

```bash
cd server
go run test_server.go
```

Server runs on http://localhost:8080

### Run Client

```bash
cd client
go run test_client.go
```

## Implementation Pattern

The `test_server.go` shows the implementation pattern:

1. **Implement service interfaces** - Extend the generated abstract service classes
2. **Register handlers** - Register your implementations with the Barrister server
3. **Start server** - Call `serve_forever()` to start accepting requests

```go
server := barrister.NewServer("0.0.0.0", 8080)
server.RegisterCatalogService(&CatalogServiceImpl{})
server.RegisterCartService(&CartServiceImpl{})
server.RegisterOrderService(&OrderServiceImpl{})
server.ServeForever()
```

## Error Codes

Custom error codes implemented:

- `1001` - CartNotFound: Cart doesn't exist
- `1002` - CartEmpty: Cart has no items
- `1003` - PaymentFailed: Payment method rejected
- `1004` - OutOfStock: Insufficient inventory
- `1005` - InvalidAddress: Shipping address validation failed

Return errors using `barrister.RPCError`:

```go
return barrister.NewRPCError(1002, "CartEmpty: Cannot create order from empty cart")
```
