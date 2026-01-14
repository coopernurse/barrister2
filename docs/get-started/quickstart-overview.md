---
title: Quickstart Overview
parent: Get Started
nav_order: 2
layout: default
---

# Quickstart Overview

In this quickstart, you'll build a working **e-commerce checkout API** using Barrister.

## What You'll Build

A complete RPC service with:
- **3 interfaces**: CatalogService (product listing), CartService (shopping cart), OrderService (order management)
- **5 enums/structs**: Product, Cart, Order, Address, PaymentMethod
- **Custom error codes**: cart_not_found (1001), cart_empty (1002), payment_failed (1003), out_of_stock (1004), invalid_address (1005)

## What You'll Learn

1. **IDL syntax** - Define your service interface with the Barrister IDL
2. **Code generation** - Generate type-safe client and server code
3. **Server implementation** - Implement service handlers with error handling
4. **Client usage** - Call RPC methods from a client application

## Time Estimate

**25-35 minutes** to complete the full quickstart in your language.

## Choose Your Language

Select your preferred language to continue:

| Language | Quickstart | Reference |
|----------|-----------|----------|
| [Go](../languages/go/quickstart.html) | [Guide](../languages/go/quickstart.html) | [Reference](../languages/go/reference.html) |
| [Java](../languages/java/quickstart.html) | [Guide](../languages/java/quickstart.html) | [Reference](../languages/java/reference.html) |
| [Python](../languages/python/quickstart.html) | [Guide](../languages/python/quickstart.html) | [Reference](../languages/python/reference.html) |
| [TypeScript](../languages/typescript/quickstart.html) | [Guide](../languages/typescript/quickstart.html) | [Reference](../languages/typescript/reference.html) |
| [C#](../languages/csharp/quickstart.html) | [Guide](../languages/csharp/quickstart.html) | [Reference](../languages/csharp/reference.html) |

## Preview: The IDL

Here's a sneak peek at the `checkout.idl` file you'll work with:

```idl
namespace checkout

enum OrderStatus {
    pending
    paid
    shipped
    delivered
    cancelled
}

interface CatalogService {
    listProducts() []Product
    getProduct(productId string) Product [optional]
}

interface CartService {
    addToCart(request AddToCartRequest) Cart
    getCart(cartId string) Cart [optional]
    clearCart(cartId string) bool
}

struct Product {
    productId    string
    name         string
    price        float
    stock        int
}
```

## Quickstart Steps

Each language quickstart follows the same structure:

1. **Prerequisites & Setup** (5 min) - Install dependencies
2. **Define the Service** (2 min) - Write the IDL file
3. **Generate Code** (1 min) - Run the Barrister generator
4. **Implement the Server** (10-15 min) - Write service handlers
5. **Implement the Client** (5-10 min) - Call your service
6. **Run It** (2 min) - Start server and client

Ready? Jump to your [language](../languages/go/quickstart.html)!
