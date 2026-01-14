---
title: Quickstart
parent: Go
grand_parent: Language Guides
nav_order: 2
layout: default
---

# Go Quickstart

Build a complete Barrister2 RPC service in Go with our e-commerce checkout example.

> **Time Estimate**: 25-30 minutes
> This quickstart takes about 30 minutes to complete and covers all the essentials.

## Prerequisites

- Go 1.21 or later
- Barrister CLI installed ([Installation Guide](../../get-started/installation))

> **Note**: Make sure your Go version is 1.21 or later. Check with `go version`.

## 1. Define the Service (2 min)

Create `checkout.idl` with your service definition:

{% code_file ../../examples/checkout.idl %}

## 2. Generate Code (1 min)

Generate the Go code from your IDL:

```bash
barrister -plugin go-client-server checkout.idl
```

This creates:
- `checkout.go` - Type definitions
- `server.go` - Barrister server framework
- `client.go` - HTTP client framework
- `barrister2/` - Runtime library
- `go.mod` - Go module file
- `idl.json` - IDL metadata

## 3. Implement the Server (10-15 min)

Create `main.go` that implements your service handlers:

```go
package main

import (
    "fmt"
    "math/rand"
    "time"

    "barrister2"
    "checkout"
)

var products = []*checkout.Product{
    {ProductId: "prod001", Name: "Wireless Mouse", Description: "Ergonomic mouse",
     Price: 29.99, Stock: 50, ImageUrl: "https://example.com/mouse.jpg"},
    {ProductId: "prod002", Name: "Mechanical Keyboard", Description: "RGB keyboard",
     Price: 89.99, Stock: 25, ImageUrl: "https://example.com/keyboard.jpg"},
}

type CatalogService struct{}

func (s *CatalogService) ListProducts() []*checkout.Product {
    return products
}

func (s *CatalogService) GetProduct(productId string) (*checkout.Product, error) {
    for _, p := range products {
        if p.ProductId == productId {
            return p, nil
        }
    }
    return nil, nil
}

type CartService struct {
    carts map[string]*checkout.Cart
}

func NewCartService() *CartService {
    return &CartService{
        carts: make(map[string]*checkout.Cart),
    }
}

func (s *CartService) AddToCart(request *checkout.AddToCartRequest) (*checkout.Cart, error) {
    cartId := request.CartId
    if cartId == "" {
        cartId = fmt.Sprintf("cart_%d", rand.Intn(9000)+1000)
    }

    cart, ok := s.carts[cartId]
    if !ok {
        cart = &checkout.Cart{CartId: cartId, Items: []*checkout.CartItem{}, Subtotal: 0}
        s.carts[cartId] = cart
    }

    // Find product
    var product *checkout.Product
    for _, p := range products {
        if p.ProductId == request.ProductId {
            product = p
            break
        }
    }

    // Add item
    cart.Items = append(cart.Items, &checkout.CartItem{
        ProductId: request.ProductId,
        Quantity:  request.Quantity,
        Price:     product.Price,
    })

    // Recalculate subtotal
    var subtotal float64
    for _, item := range cart.Items {
        subtotal += item.Price * float64(item.Quantity)
    }
    cart.Subtotal = subtotal

    return cart, nil
}

func (s *CartService) GetCart(cartId string) (*checkout.Cart, error) {
    return s.carts[cartId], nil
}

func (s *CartService) ClearCart(cartId string) (bool, error) {
    if cart, ok := s.carts[cartId]; ok {
        cart.Items = []*checkout.CartItem{}
        cart.Subtotal = 0
        return true, nil
    }
    return false, nil
}

type OrderService struct {
    carts  map[string]*checkout.Cart
    orders map[string]*checkout.Order
}

func NewOrderService(cartService *CartService) *OrderService {
    return &OrderService{
        carts:  cartService.carts,
        orders: make(map[string]*checkout.Order),
    }
}

func (s *OrderService) CreateOrder(request *checkout.CreateOrderRequest) (*checkout.CheckoutResponse, error) {
    cart, ok := s.carts[request.CartId]
    if !ok {
        return nil, barrister2.NewRPCError(1001, "CartNotFound: Cart does not exist")
    }

    if len(cart.Items) == 0 {
        return nil, barrister2.NewRPCError(1002, "CartEmpty: Cannot create order from empty cart")
    }

    // Create order
    orderId := fmt.Sprintf("order_%d", rand.Intn(90000)+10000)
    order := &checkout.Order{
        OrderId:         orderId,
        Cart:            cart,
        ShippingAddress: request.ShippingAddress,
        PaymentMethod:   request.PaymentMethod,
        Status:          checkout.OrderStatus_Pending,
        Total:           cart.Subtotal,
        CreatedAt:       time.Now().Unix(),
    }
    s.orders[orderId] = order

    return &checkout.CheckoutResponse{OrderId: orderId}, nil
}

func (s *OrderService) GetOrder(orderId string) (*checkout.Order, error) {
    return s.orders[orderId], nil
}

func main() {
    server := barrister2.NewServer("0.0.0.0", 8080)
    cartSvc := NewCartService()

    server.RegisterCatalogService(&CatalogService{})
    server.RegisterCartService(cartSvc)
    server.RegisterOrderService(NewOrderService(cartSvc))

    fmt.Println("Server starting on http://localhost:8080")
    server.ServeForever()
}
```

Start your server:

```bash
go run main.go
```

## 4. Implement the Client (5-10 min)

Create `client.go` to call your service:

```go
package main

import (
    "fmt"
    "barrister2"
    "checkout"
)

func main() {
    transport := barrister2.NewHTTPTransport("http://localhost:8080")
    catalog := checkout.NewCatalogServiceClient(transport)
    cart := checkout.NewCartServiceClient(transport)
    orders := checkout.NewOrderServiceClient(transport)

    // List products
    products, _ := catalog.ListProducts()
    fmt.Println("=== Products ===")
    for _, p := range products {
        fmt.Printf("%s - $%.2f\n", p.Name, p.Price)
    }

    // Add to cart
    result, _ := cart.AddToCart(&checkout.AddToCartRequest{
        ProductId: products[0].ProductId,
        Quantity:  2,
    })
    fmt.Printf("\nCart: %s, Subtotal: $%.2f\n", result.CartId, result.Subtotal)

    // Create order
    response, _ := orders.CreateOrder(&checkout.CreateOrderRequest{
        CartId: result.CartId,
        ShippingAddress: &checkout.Address{
            Street:  "123 Main St",
            City:    "San Francisco",
            State:   "CA",
            ZipCode: "94105",
            Country: "USA",
        },
        PaymentMethod: checkout.PaymentMethod_CreditCard,
    })
    fmt.Printf("✓ Order created: %s\n", response.OrderId)
}
```

Run your client:

```bash
go run client.go
```

## Error Codes

Return errors using `barrister2.NewRPCError()`:

```go
return nil, barrister2.NewRPCError(1002, "CartEmpty: Cannot create order from empty cart")
```

| Code | Name |
|------|------|
| 1001 | CartNotFound |
| 1002 | CartEmpty |
| 1003 | PaymentFailed |
| 1004 | OutOfStock |
| 1005 | InvalidAddress |

## Next Steps

- [Go Reference](reference.html) - Type mappings and patterns
- [IDL Syntax](../../idl-guide/syntax.html) - Full IDL reference

## Working Example

Complete example in `docs/examples/checkout-go/`:

```bash
cd docs/examples/checkout-go/server
go run test_server.go  # Terminal 1
cd ../client
go run test_client.go  # Terminal 2
```
