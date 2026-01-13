---
title: C# Quickstart
layout: default
---

# C# Quickstart

Build a complete Barrister2 RPC service in C# with our e-commerce checkout example.

## Prerequisites

- .NET 6.0 or later
- Barrister CLI installed ([Installation Guide](../../get-started/installation))

## 1. Define the Service (2 min)

Create `checkout.idl` with your service definition:

{% code_file ../../examples/checkout.idl %}

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
    static void Main()
    {
        var server = new BarristerServer(8080);
        var cartService = new CartServiceImpl();

        server.RegisterCatalogService(new CatalogServiceImpl());
        server.RegisterCartService(cartService);
        server.RegisterOrderService(new OrderServiceImpl(cartService._carts));

        Console.WriteLine("Server starting on http://localhost:8080");
        server.Start();
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
using Barrister2;
using Checkout;

class Program
{
    static void Main()
    {
        var transport = new HTTPTransport("http://localhost:8080");
        var catalog = new CatalogServiceClient(transport);
        var cart = new CartServiceClient(transport);
        var orders = new OrderServiceClient(transport);

        // List products
        var products = catalog.ListProducts();
        Console.WriteLine("=== Products ===");
        foreach (var p in products)
        {
            Console.WriteLine($"{p.Name} - ${p.Price}");
        }

        // Add to cart
        var result = cart.AddToCart(new AddToCartRequest
        {
            ProductId = products[0].ProductId,
            Quantity = 2
        });
        Console.WriteLine($"\nCart: {result.CartId}");

        // Create order
        var response = orders.CreateOrder(new CreateOrderRequest
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
        Console.WriteLine($"✓ Order created: {response.OrderId}");
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

## Working Example

Complete example in `docs/examples/checkout-csharp/`:

```bash
cd docs/examples/checkout-csharp
dotnet run --project TestServer.csproj  # Terminal 1
dotnet run --project TestClient.csproj  # Terminal 2
```
