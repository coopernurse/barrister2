---
title: Java Quickstart
layout: default
---

# Java Quickstart

Build a complete Barrister2 RPC service in Java with our e-commerce checkout example.

## Prerequisites

- Java 11 or later
- Maven 3.6 or later
- Barrister CLI installed ([Installation Guide](../../get-started/installation))

## 1. Define the Service (2 min)

Create `checkout.idl` with your service definition:

{% code_file ../../examples/checkout.idl %}

## 2. Generate Code (1 min)

Generate the Java code from your IDL:

```bash
barrister -plugin java-client-server -base-package checkout checkout.idl
```

This creates:
- `src/main/java/checkout/` - Type definitions
- `Server.java` - RPC server framework
- `Client.java` - RPC client framework
- `pom.xml` - Maven configuration
- `com/bitmechanic/barrister2/` - Runtime library
- `idl.json` - IDL metadata

## 3. Implement the Server (10-15 min)

Create `MyServer.java` that implements your service handlers:

```java
import checkout.*;
import com.bitmechanic.barrister2.*;
import java.util.*;

public class MyServer {
    static List<Product> products = Arrays.asList(
        new Product("prod001", "Wireless Mouse", "Ergonomic mouse", 29.99, 50, "https://example.com/mouse.jpg"),
        new Product("prod002", "Mechanical Keyboard", "RGB keyboard", 89.99, 25, "https://example.com/keyboard.jpg")
    );

    static Map<String, Cart> carts = new HashMap<>();
    static Map<String, Order> orders = new HashMap<>();

    static class CatalogServiceImpl implements CatalogService {
        public List<Product> listProducts() {
            return products;
        }

        public Optional<Product> getProduct(String productId) {
            return products.stream()
                .filter(p -> p.getProductId().equals(productId))
                .findFirst();
        }
    }

    static class CartServiceImpl implements CartService {
        public Cart addToCart(AddToCartRequest request) {
            String cartId = request.getCartId();
            if (cartId == null || cartId.isEmpty()) {
                cartId = "cart_" + (int)(Math.random() * 9000 + 1000);
            }

            Cart cart = carts.get(cartId);
            if (cart == null) {
                cart = new Cart(cartId, new ArrayList<>(), 0.0);
                carts.put(cartId, cart);
            }

            Product product = products.stream()
                .filter(p -> p.getProductId().equals(request.getProductId()))
                .findFirst().orElseThrow(() -> new RPCException(-32602, "Product not found"));

            cart.getItems().add(new CartItem(request.getProductId(), request.getQuantity(), product.getPrice()));
            cart.setSubtotal(cart.getItems().stream().mapToDouble(i -> i.getPrice() * i.getQuantity()).sum());

            return cart;
        }

        public Optional<Cart> getCart(String cartId) {
            return Optional.ofNullable(carts.get(cartId));
        }

        public boolean clearCart(String cartId) {
            Cart cart = carts.get(cartId);
            if (cart != null) {
                cart.getItems().clear();
                cart.setSubtotal(0.0);
                return true;
            }
            return false;
        }
    }

    static class OrderServiceImpl implements OrderService {
        public CheckoutResponse createOrder(CreateOrderRequest request) {
            Cart cart = carts.get(request.getCartId());
            if (cart == null) {
                throw new RPCException(1001, "CartNotFound: Cart does not exist");
            }

            if (cart.getItems().isEmpty()) {
                throw new RPCException(1002, "CartEmpty: Cannot create order from empty cart");
            }

            String orderId = "order_" + (int)(Math.random() * 90000 + 10000);
            Order order = new Order(
                orderId,
                cart,
                request.getShippingAddress(),
                request.getPaymentMethod(),
                OrderStatus.PENDING,
                cart.getSubtotal(),
                System.currentTimeMillis() / 1000
            );
            orders.put(orderId, order);

            return new CheckoutResponse(orderId, "Order created successfully");
        }

        public Optional<Order> getOrder(String orderId) {
            return Optional.ofNullable(orders.get(orderId));
        }
    }

    public static void main(String[] args) throws Exception {
        BarristerServer server = new BarristerServer(8080);
        server.registerCatalogService(new CatalogServiceImpl());
        server.registerCartService(new CartServiceImpl());
        server.registerOrderService(new OrderServiceImpl());
        server.start();
    }
}
```

Start your server:

```bash
mvn exec:java -Dexec.mainClass="MyServer"
```

## 4. Implement the Client (5-10 min)

Create `MyClient.java` to call your service:

```java
import checkout.*;
import com.bitmechanic.barrister2.*;

public class MyClient {
    public static void main(String[] args) {
        Transport transport = new HTTPTransport("http://localhost:8080");
        CatalogServiceClient catalog = new CatalogServiceClient(transport);
        CartServiceClient cart = new CartServiceClient(transport);
        OrderServiceClient orders = new OrderServiceClient(transport);

        // List products
        List<Product> products = catalog.listProducts();
        System.out.println("=== Products ===");
        for (Product p : products) {
            System.out.println(p.getName() + " - $" + p.getPrice());
        }

        // Add to cart
        Cart result = cart.addToCart(new AddToCartRequest(
            null,
            products.get(0).getProductId(),
            2
        ));
        System.out.println("\nCart: " + result.getCartId());

        // Create order
        CheckoutResponse response = orders.createOrder(new CreateOrderRequest(
            result.getCartId(),
            new Address("123 Main St", "San Francisco", "CA", "94105", "USA"),
            PaymentMethod.CREDIT_CARD
        ));
        System.out.println("✓ Order created: " + response.getOrderId());
    }
}
```

Run your client:

```bash
mvn compile exec:java -Dexec.mainClass="MyClient"
```

## Error Codes

Throw `RPCException` with custom error codes:

```java
throw new RPCException(1002, "CartEmpty: Cannot create order from empty cart");
```

| Code | Name |
|------|------|
| 1001 | CartNotFound |
| 1002 | CartEmpty |
| 1003 | PaymentFailed |
| 1004 | OutOfStock |
| 1005 | InvalidAddress |

## Next Steps

- [Java Reference](reference.html) - Type mappings and Jackson/GSon support
- [IDL Syntax](../../idl-guide/syntax.html) - Full IDL reference

## Working Example

Complete example in `docs/examples/checkout-java/`:

```bash
cd docs/examples/checkout-java
mvn exec:java -Dexec.mainClass="Server"      # Terminal 1
mvn exec:java -Dexec.mainClass="TestClient"   # Terminal 2
```
