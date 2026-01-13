---
title: Java Reference
layout: default
---

# Java Reference

## Type Mappings

| IDL Type | Java Type | Example |
|----------|-----------|---------|
| `string` | `String` | `"hello"` |
| `int` | `Long` | `42L` |
| `float` | `Double` | `3.14` |
| `bool` | `Boolean` | `true`, `false` |
| `[]Type` | `List<Type>` | `Arrays.asList(1, 2, 3)` |
| `map[string]Type` | `Map<String, Type>` | `Collections.singletonMap("key", "value")` |
| `Enum` | `Enum` | `OrderStatus.PENDING` |
| `Struct` | Class with getters | `new Product(...)` |
| `T [optional]` | `Optional<T>` | `Optional.of(value)` |

## Generated Classes

Each struct in your IDL becomes a Java class with builder pattern or constructor:

```java
import checkout.*;

// Create instances using constructor
Product product = new Product(
    "prod001",
    "Wireless Mouse",
    "Ergonomic mouse",
    29.99,
    50,
    "https://example.com/mouse.jpg"  // optional field
);

Cart cart = new Cart(
    "cart_1234",
    new ArrayList<>(),
    0.0
);
```

## Optional Fields

Optional return types use `Optional<T>`:

```java
import java.util.Optional;

// Methods with optional return type
public Optional<Product> getProduct(String productId) {
    for (Product p : products) {
        if (p.getProductId().equals(productId)) {
            return Optional.of(p);
        }
    }
    return Optional.empty();  // Not found
}

// Client usage
Optional<Product> result = catalog.getProduct("prod001");
if (result.isPresent()) {
    Product product = result.get();
    System.out.println(product.getName());
}
```

## Enums

Enums use proper Java enum with constants:

```java
import checkout.*;

// Use enum constants
Order order = new Order(
    orderId,
    cart,
    shippingAddress,
    PaymentMethod.CREDIT_CARD,
    OrderStatus.PENDING,
    total,
    createdAt
);

// Compare enums
if (order.getStatus() == OrderStatus.PENDING) {
    System.out.println("Order is pending");
}
```

## Error Handling

Throw `RPCException` with custom codes:

```java
import com.bitmechanic.barrister2.RPCException;

// Standard JSON-RPC errors
throw new RPCException(-32602, "Invalid params");

// Custom application errors (use codes >= 1000)
throw new RPCException(1001, "CartNotFound: Cart does not exist");
throw new RPCException(1002, "CartEmpty: Cannot create order from empty cart");
```

Common error codes:
- `-32700`: Parse error
- `-32600`: Invalid request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error
- `1000+`: Custom application errors

## Server Implementation

Implement generated interfaces:

```java
import checkout.*;
import com.bitmechanic.barrister2.*;

class CatalogServiceImpl implements CatalogService {
    private List<Product> products = Arrays.asList(
        new Product("p1", "Item 1", "Description", 10.0, 5),
        new Product("p2", "Item 2", "Description", 20.0, 3)
    );

    public List<Product> listProducts() {
        return products;
    }

    public Optional<Product> getProduct(String productId) {
        return products.stream()
            .filter(p -> p.getProductId().equals(productId))
            .findFirst();
    }
}

// Start server
public static void main(String[] args) throws Exception {
    BarristerServer server = new BarristerServer(8080);
    server.registerCatalogService(new CatalogServiceImpl());
    server.start();
}
```

## Client Usage

```java
import checkout.*;
import com.bitmechanic.barrister2.*;

Transport transport = new HTTPTransport("http://localhost:8080");
CatalogServiceClient catalog = new CatalogServiceClient(transport);

// Method calls return Java objects
List<Product> products = catalog.listProducts();
for (Product p : products) {
    System.out.println(p.getName() + " - $" + p.getPrice());
}

// Optional methods return Optional
Optional<Product> result = catalog.getProduct("prod001");
result.ifPresent(product -> {
    System.out.println(product.getName());
});
```

## JSON Library Support

Barrister supports both Jackson and Gson. Configure in `pom.xml`:

```xml
<!-- Jackson (default) -->
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.15.0</version>
</dependency>

<!-- OR Gson -->
<dependency>
    <groupId>com.google.code.gson</groupId>
    <artifactId>gson</artifactId>
    <version>2.10.1</version>
</dependency>
```

## Validation

Barrister automatically validates:
- Required fields are present
- Types match IDL definition
- Enum values are valid

```java
// This will throw RPCException (-32602) if validation fails
Cart cart = cart.addToCart(new AddToCartRequest(
    null,  // cartId is optional
    "prod001",
    2
));
```

## Best Practices

1. **Use Optional correctly**: Return `Optional.of()` for values, `Optional.empty()` for null
2. **Stream for collections**: Use Java streams for filtering and mapping
3. **Immutable where possible**: Consider making generated classes immutable
4. **Use Jackson annotations**: Add `@JsonProperty` for custom field names
5. **Handle RPCException**: Catch and handle RPC errors appropriately

## Working with Nested Structs

```java
// Nested structs work naturally
Order order = new Order(
    "order_123",
    new Cart(
        "cart_123",
        Arrays.asList(new CartItem(...)),
        59.98
    ),
    new Address(
        "123 Main St",
        "San Francisco",
        "CA",
        "94105",
        "USA"
    ),
    PaymentMethod.CREDIT_CARD,
    OrderStatus.PENDING,
    59.98,
    System.currentTimeMillis() / 1000
);
```

## Maven Integration

Generated code includes `pom.xml` for building:

```bash
# Compile
mvn compile

# Run server
mvn exec:java -Dexec.mainClass="Server"

# Run client
mvn exec:java -Dexec.mainClass="Client"
```

## Using with Spring Boot

```java
@RestController
@RequestMapping("/api")
public class CheckoutController {
    private final CartService cartService;

    public CheckoutController(CartService cartService) {
        this.cartService = cartService;
    }

    @PostMapping("/cart")
    public Cart addToCart(@RequestBody AddToCartRequest request) {
        return cartService.addToCart(request);
    }
}
```
