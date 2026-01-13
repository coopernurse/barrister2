# Barrister2 E-Commerce Checkout Example - TypeScript

A complete working example of a Barrister2 RPC service in TypeScript.

## Prerequisites

- Node.js 18 or later
- TypeScript 5.0 or later

## Files

- `checkout.idl` - Interface definition
- Generated TypeScript code:
  - `checkout.ts` - Type definitions
  - `server.ts` - RPC server framework
  - `client.ts` - RPC client framework
  - `test_server.ts` - Example implementation
  - `test_client.ts` - Example client
  - `barrister2/` - Runtime library
- `package.json` - NPM configuration
- `tsconfig.json` - TypeScript configuration

## Running

### Generate Code

Code is already generated. To regenerate:

```bash
barrister -plugin ts-client-server checkout.idl
```

### Build

```bash
npm install
npm run build
```

### Start Server

```bash
npm start
```

Server runs on http://localhost:8080

### Run Client

```bash
npm run client
```

## Implementation Pattern

The `test_server.ts` shows the implementation pattern:

1. **Implement service interfaces** - Extend the generated service classes
2. **Register handlers** - Register your implementations with the Barrister server
3. **Start server** - Call `start()` to begin accepting requests

```typescript
const server = new BarristerServer(8080);
server.registerCatalogService(new CatalogService());
server.registerCartService(new CartService());
server.registerOrderService(new OrderService());
server.start();
```

## Error Codes

Custom error codes implemented:

- `1001` - CartNotFound: Cart doesn't exist
- `1002` - CartEmpty: Cart has no items
- `1003` - PaymentFailed: Payment method rejected
- `1004` - OutOfStock: Insufficient inventory
- `1005` - InvalidAddress: Shipping address validation failed

Return errors using `RPCError`:

```typescript
throw new RPCError(1002, "CartEmpty: Cannot create order from empty cart");
```
