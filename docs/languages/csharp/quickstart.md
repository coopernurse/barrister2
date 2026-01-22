---
title: C# Quickstart
layout: default
---

# C# Quickstart

Build a complete Barrister2 RPC service in C# with our e-commerce checkout example.

## Prerequisites

- .NET 8.0 or later
- Barrister CLI installed ([Installation Guide](../../get-started/installation))

## 1. Define the Service (2 min)

Create `checkout.idl` with your service definition:

```idl
namespace checkout

// Enums for order status and payment methods

enum OrderStatus {
    pending
    paid
    shipped
    delivered
    cancelled
}

enum PaymentMethod {
    credit_card
    debit_card
    paypal
    apple_pay
}

// Core domain entities

struct Product {
    productId    string
    name         string
    description  string
    price        float
    stock        int
    imageUrl     string  [optional]
}

struct CartItem {
    productId    string
    quantity     int
    price        float
}

struct Cart {
    cartId       string
    items        []CartItem
    subtotal     float
}

struct Address {
    street       string
    city         string
    state        string
    zipCode      string
    country      string
}

struct Order {
    orderId           string
    cart              Cart
    shippingAddress   Address
    paymentMethod     PaymentMethod
    status            OrderStatus
    total             float
    createdAt         int
}

// Request/Response structures

struct AddToCartRequest {
    cartId       string  [optional]
    productId    string
    quantity     int
}

struct CreateOrderRequest {
    cartId              string
    shippingAddress     Address
    paymentMethod       PaymentMethod
}

struct CheckoutResponse {
    orderId      string
    message      string  [optional]
}

// Error Codes for createOrder:
//   1001 - CartNotFound: Cart doesn't exist
//   1002 - CartEmpty: Cart has no items
//   1003 - PaymentFailed: Payment method rejected
//   1004 - OutOfStock: Insufficient inventory
//   1005 - InvalidAddress: Shipping address validation failed

// Service interfaces

interface CatalogService {
    // Returns a list of all available products
    listProducts() []Product

    // Returns details for a specific product, or null if not found
    getProduct(productId string) Product  [optional]
}

interface CartService {
    // Adds an item to the cart (creates cart if cartId not provided)
    addToCart(request AddToCartRequest) Cart

    // Returns the cart contents, or null if cart doesn't exist
    getCart(cartId string) Cart  [optional]

    // Removes all items from the cart, returns true if successful
    clearCart(cartId string) bool
}

interface OrderService {
    // Converts a cart to an order
    createOrder(request CreateOrderRequest) CheckoutResponse

    // Returns the order details, or null if order doesn't exist
    getOrder(orderId string) Order  [optional]
}
```

## 2. Generate Code (1 min)

Generate the C# code from your IDL:

```bash
barrister -plugin csharp-client-server checkout.idl
```

This creates:
- `checkout.cs` - Type definitions
- `Server.cs` - RPC server framework
- `Client.cs` - RPC client framework
- `barrister2/` - Runtime library
- `idl.json` - IDL metadata

## 3. Implement the Server (10-15 min)

Create `MyServer.cs` that implements your service handlers:

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using Barrister2;
using Checkout;

class CatalogServiceImpl : ICatalogService
{
    private static readonly List<Product> Products = new List<Product>
    {
        new Product("prod001", "Wireless Mouse", "Ergonomic mouse", 29.99, 50, "https://example.com/mouse.jpg"),
        new Product("prod002", "Mechanical Keyboard", "RGB keyboard", 89.99, 25, "https://example.com/keyboard.jpg")
    };

    public List<Product> ListProducts()
    {
        return Products;
    }

    public Product GetProduct(string productId)
    {
        return Products.FirstOrDefault(p => p.ProductId == productId);
    }
}

class CartServiceImpl : ICartService
{
    private readonly Dictionary<string, Cart> _carts = new Dictionary<string, Cart>();

    public Cart AddToCart(AddToCartRequest request)
    {
        var cartId = request.CartId ?? $"cart_{new Random().Next(1000, 9999)}";

        if (!_carts.TryGetValue(cartId, out var cart))
        {
            cart = new Cart { CartId = cartId, Items = new List<CartItem>(), Subtotal = 0 };
            _carts[cartId] = cart;
        }

        var product = Products.FirstOrDefault(p => p.ProductId == request.ProductId);
        if (product == null)
            throw new RPCException(-32602, "Product not found");

        cart.Items.Add(new CartItem(request.ProductId, request.Quantity, product.Price));
        cart.Subtotal = cart.Items.Sum(i => i.Price * i.Quantity);

        return cart;
    }

    public Cart GetCart(string cartId)
    {
        return _carts.TryGetValue(cartId, out var cart) ? cart : null;
    }

    public bool ClearCart(string cartId)
    {
        if (_carts.TryGetValue(cartId, out var cart))
        {
            cart.Items.Clear();
            cart.Subtotal = 0;
            return true;
        }
        return false;
    }
}

class OrderServiceImpl : IOrderService
{
    private readonly Dictionary<string, Cart> _carts;
    private readonly Dictionary<string, Order> _orders = new Dictionary<string, Order>();

    public OrderServiceImpl(Dictionary<string, Cart> carts)
    {
        _carts = carts;
    }

    public CheckoutResponse CreateOrder(CreateOrderRequest request)
    {
        if (!_carts.TryGetValue(request.CartId, out var cart))
            throw new RPCException(1001, "CartNotFound: Cart does not exist");

        if (cart.Items.Count == 0)
            throw new RPCException(1002, "CartEmpty: Cannot create order from empty cart");

        var orderId = $"order_{new Random().Next(10000, 99999)}";
        var order = new Order
        {
            OrderId = orderId,
            Cart = cart,
            ShippingAddress = request.ShippingAddress,
            PaymentMethod = request.PaymentMethod,
            Status = OrderStatus.Pending,
            Total = cart.Subtotal,
            CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        };

        _orders[orderId] = order;
        return new CheckoutResponse { OrderId = orderId };
    }

    public Order GetOrder(string orderId)
    {
        return _orders.TryGetValue(orderId, out var order) ? order : null;
    }
}

class Program
{
    static async Task Main(string[] args)
    {
        var server = new BarristerServer();
        var cartService = new CartServiceImpl();

        server.RegisterCatalogService(new CatalogServiceImpl());
        server.RegisterCartService(cartService);
        server.RegisterOrderService(new OrderServiceImpl(cartService._carts));

        Console.WriteLine("Server starting on http://localhost:8080");
        await server.RunAsync("localhost", 8080);
    }
}
```

Start your server:

```bash
dotnet run
```

## 4. Implement the Client (5-10 min)

Create `MyClient.cs` to call your service:

```csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using Barrister2;
using Checkout;

class Program
{
    static async Task Main(string[] args)
    {
        var transport = new HttpTransport("http://localhost:8080");
        var catalogClient = new CatalogServiceClient(transport);
        var cartClient = new CartServiceClient(transport);
        var ordersClient = new OrderServiceClient(transport);

        // The client classes implement the interfaces, so you can use them
        // with dependency injection or directly
        ICatalogService catalog = catalogClient;

        // List products (sync)
        var products = catalog.ListProducts();
        Console.WriteLine("=== Products ===");
        foreach (var p in products)
        {
            Console.WriteLine($"{p.Name} - ${p.Price}");
        }

        // Add to cart (sync)
        var result = cartClient.AddToCart(new AddToCartRequest
        {
            ProductId = products[0].ProductId,
            Quantity = 2
        });
        Console.WriteLine($"\nCart: {result.CartId}");

        // Create order (sync)
        var response = ordersClient.CreateOrder(new CreateOrderRequest
        {
            CartId = result.CartId,
            ShippingAddress = new Address
            {
                Street = "123 Main St",
                City = "San Francisco",
                State = "CA",
                ZipCode = "94105",
                Country = "USA"
            },
            PaymentMethod = PaymentMethod.CreditCard
        });
        Console.WriteLine($"Order created: {response.OrderId}");
    }
}
```

Run your client:

```bash
dotnet run
```

## Error Codes

Throw `RPCException` with custom error codes:

```csharp
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

- [C# Reference](reference.html) - Type mappings and async/await patterns
- [IDL Syntax](../../idl-guide/syntax.html) - Full IDL reference
