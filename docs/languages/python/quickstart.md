---
title: Python Quickstart
layout: default
---

# Python Quickstart

Build a complete Barrister2 RPC service in Python with our e-commerce checkout example.

## Prerequisites

- Python 3.8 or later
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

This IDL defines:
- **3 interfaces**: CatalogService, CartService, OrderService
- **7 structs**: Product, CartItem, Cart, Address, Order, AddToCartRequest, CreateOrderRequest, CheckoutResponse
- **2 enums**: OrderStatus, PaymentMethod
- **Custom error codes** (1001-1005): cart_not_found, cart_empty, payment_failed, out_of_stock, invalid_address

## 2. Generate Code (1 min)

Generate the Python code from your IDL:

```bash
barrister -plugin python-client-server checkout.idl
```

This creates:
- `checkout.py` - IDL metadata and helpers (structs are dicts, enums are strings)
- `server.py` - BarristerServer framework with abstract service classes
- `client.py` - HTTPTransport and service client classes
- `barrister2/` - Runtime library (RPCError, validation, types)
- `idl.json` - IDL metadata for introspection

Note: the Python generator only creates classes for interfaces (service stubs). Structs are plain dicts and enums are strings, so use maps and lists directly in your handlers and client code.

## 3. Implement the Server (10-15 min)

Create a file `my_server.py` that implements your service handlers:

```python
#!/usr/bin/env python3
from server import BarristerServer, CatalogService, CartService, OrderService
from barrister2 import RPCError
import random
import time

# In-memory storage
products_db = [
    {
        "productId": "prod001",
        "name": "Wireless Mouse",
        "description": "Ergonomic mouse",
        "price": 29.99,
        "stock": 50,
        "imageUrl": "https://example.com/mouse.jpg",
    },
    {
        "productId": "prod002",
        "name": "Mechanical Keyboard",
        "description": "RGB keyboard",
        "price": 89.99,
        "stock": 25,
        "imageUrl": "https://example.com/keyboard.jpg",
    },
]

carts_db = {}  # cart_id -> Cart
orders_db = {}  # order_id -> Order

class CatalogServiceImpl(CatalogService):
    def listProducts(self):
        return products_db

    def getProduct(self, productId):
        for p in products_db:
            if p["productId"] == productId:
                return p
        return None

class CartServiceImpl(CartService):
    def addToCart(self, request):
        cart_id = request.get("cartId") or f"cart_{random.randint(1000, 9999)}"

        if cart_id not in carts_db:
            carts_db[cart_id] = {"cartId": cart_id, "items": [], "subtotal": 0.0}

        cart = carts_db[cart_id]
        product = next(
            (p for p in products_db if p["productId"] == request.get("productId")), None
        )

        if not product:
            raise RPCError(-32602, f"Product '{request.get('productId')}' not found")

        # Add or update item
        for item in cart["items"]:
            if item["productId"] == request.get("productId"):
                item["quantity"] += request.get("quantity", 0)
                item["price"] = product["price"]
                break
        else:
            cart["items"].append(
                {
                    "productId": request.get("productId"),
                    "quantity": request.get("quantity", 0),
                    "price": product["price"],
                }
            )

        cart["subtotal"] = sum(
            item["price"] * item["quantity"] for item in cart["items"]
        )
        return cart

    def getCart(self, cartId):
        return carts_db.get(cartId)

    def clearCart(self, cartId):
        if cartId in carts_db:
            carts_db[cartId]["items"] = []
            carts_db[cartId]["subtotal"] = 0.0
            return True
        return False

class OrderServiceImpl(OrderService):
    def createOrder(self, request):
        # Validate cart exists
        if request.get("cartId") not in carts_db:
            raise RPCError(1001, "CartNotFound: Cart does not exist")

        cart = carts_db[request.get("cartId")]

        # Check if cart is empty
        if not cart["items"]:
            raise RPCError(1002, "CartEmpty: Cannot create order from empty cart")

        # Validate address
        addr = request.get("shippingAddress") or {}
        if not addr.get("street") or not addr.get("city") or not addr.get("zipCode"):
            raise RPCError(1005, "InvalidAddress: Shipping address validation failed")

        # Check stock
        for item in cart["items"]:
            product = next(
                (p for p in products_db if p["productId"] == item["productId"]), None
            )
            if product and product["stock"] < item["quantity"]:
                raise RPCError(1004, "OutOfStock: Insufficient inventory")

        # Simulate payment (fail 10% of the time for demo)
        if random.random() < 0.1:
            raise RPCError(1003, "PaymentFailed: Card declined by issuer")

        # Create order
        order_id = f"order_{random.randint(10000, 99999)}"
        order = {
            "orderId": order_id,
            "cart": cart,
            "shippingAddress": request.get("shippingAddress"),
            "paymentMethod": request.get("paymentMethod"),
            "status": "pending",
            "total": cart["subtotal"],
            "createdAt": int(time.time()),
        }
        orders_db[order_id] = order

        # Clear cart
        carts_db[request.get("cartId")]["items"] = []
        carts_db[request.get("cartId")]["subtotal"] = 0.0

        return {"orderId": order_id, "message": "Order created successfully"}

    def getOrder(self, orderId):
        return orders_db.get(orderId)

# Start server
if __name__ == "__main__":
    server = BarristerServer(host="0.0.0.0", port=8080)
    server.register("CatalogService", CatalogServiceImpl())
    server.register("CartService", CartServiceImpl())
    server.register("OrderService", OrderServiceImpl())
    server.serve_forever()
```

Start your server:

```bash
python3 my_server.py
```

Server runs on http://localhost:8080

## 4. Implement the Client (5-10 min)

Create `my_client.py` to call your service:

```python
#!/usr/bin/env python3
from client import HTTPTransport, CatalogServiceClient, CartServiceClient, OrderServiceClient
from barrister2 import RPCError

# Connect to server
transport = HTTPTransport("http://localhost:8080")
catalog = CatalogServiceClient(transport)
cart = CartServiceClient(transport)
orders = OrderServiceClient(transport)

# List products
print("=== Products ===")
products = catalog.listProducts()
for p in products:
    print(f"{p['name']} - ${p['price']:.2f}")

# Create cart and add items
print("\n=== Creating Cart ===")
cart_data = cart.addToCart({
    'productId': products[0]['productId'],
    'quantity': 2
})
my_cart = cart_data
print(f"Cart: {my_cart['cartId']}, Subtotal: ${my_cart['subtotal']:.2f}")

# Add another item
cart_data = cart.addToCart({
    'cartId': my_cart['cartId'],
    'productId': products[1]['productId'],
    'quantity': 1
})
my_cart = cart_data
print(f"Updated Subtotal: ${my_cart['subtotal']:.2f}")

# Create order
print("\n=== Creating Order ===")
try:
    response_data = orders.createOrder({
        'cartId': my_cart['cartId'],
        'shippingAddress': {
            'street': '123 Main St',
            'city': 'San Francisco',
            'state': 'CA',
            'zipCode': '94105',
            'country': 'USA'
        },
        'paymentMethod': 'credit_card'
    })
    response = response_data
    print(f"✓ Order created: {response['orderId']}")
except RPCError as e:
    print(f"✗ Error {e.code}: {e.message}")

# Test error case: empty cart
print("\n=== Testing Error Case ===")
cart.clearCart(my_cart['cartId'])
try:
    orders.createOrder({
        'cartId': my_cart['cartId'],
        'shippingAddress': {
            'street': '123 Main St',
            'city': 'San Francisco',
            'state': 'CA',
            'zipCode': '94105',
            'country': 'USA'
        },
        'paymentMethod': 'credit_card'
    })
    print("✗ Should have failed!")
except RPCError as e:
    print(f"✓ Got expected error: {e.code} - {e.message}")
```

Run your client:

```bash
python3 my_client.py
```

## 5. Expected Output

```
=== Products ===
Wireless Mouse - $29.99
Mechanical Keyboard - $89.99

=== Creating Cart ===
Cart: cart_XXXX, Subtotal: $59.98

=== Creating Order ===
✓ Order created: order_XXXXX

=== Testing Error Case ===
✓ Got expected error: 1002 - CartEmpty: Cannot create order from empty cart
```

## Error Codes

Your service implements these custom error codes:

| Code | Name | When Returned |
|------|------|---------------|
| 1001 | CartNotFound | Cart doesn't exist |
| 1002 | CartEmpty | Cart has no items |
| 1003 | PaymentFailed | Payment method rejected |
| 1004 | OutOfStock | Insufficient inventory |
| 1005 | InvalidAddress | Address validation failed |

Raise errors with `RPCError(code, message)`:

```python
raise RPCError(1002, "CartEmpty: Cannot create order from empty cart")
```

## Next Steps

- [Python Reference](reference.html) - Type mappings, patterns, best practices
- [IDL Syntax](../../idl-guide/syntax.html) - Full IDL language reference
- [Validation](../../idl-guide/validation.html) - How runtime validation works
