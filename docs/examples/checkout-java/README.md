# Barrister2 E-Commerce Checkout Example - Java

A complete working example of a Barrister2 RPC service in Java.

## Prerequisites

- Java 11 or later
- Maven 3.6 or later

## Files

- `checkout.idl` - Interface definition
- Generated Java code:
  - `src/main/java/checkout/` - Type definitions
  - `Server.java` - RPC server framework
  - `Client.java` - RPC client framework
  - `TestServer.java` - Example implementation
  - `TestClient.java` - Example client
  - `pom.xml` - Maven build configuration
  - `com/coopernurse/barrister2/` - Runtime library

## Running

### Generate Code

Code is already generated. To regenerate:

```bash
barrister -plugin java-client-server -base-package com.example.myapp checkout.idl
```

### Start Server

```bash
mvn exec:java -Dexec.mainClass="com.example.myapp.Server"
```

Server runs on http://localhost:8080

### Run Client

```bash
mvn exec:java -Dexec.mainClass="com.example.myapp.TestClient"
```

## Implementation Pattern

The `TestServer.java` shows the implementation pattern:

1. **Implement service interfaces** - Implement the generated service interfaces
2. **Register handlers** - Register your implementations with the Barrister server
3. **Start server** - Call `start()` to begin accepting requests

```java
BarristerServer server = new BarristerServer(8080);
server.registerCatalogService(new CatalogServiceImpl());
server.registerCartService(new CartServiceImpl());
server.registerOrderService(new OrderServiceImpl());
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

```java
throw new RPCError(1002, "CartEmpty: Cannot create order from empty cart");
```
