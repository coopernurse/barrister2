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

{% code_file ../../examples/checkout.idl %}

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
- `checkout.py` - Type definitions for all your structs and enums
- `server.py` - BarristerServer framework with abstract service classes
- `client.py` - HTTPTransport and service client classes
- `barrister2/` - Runtime library (RPCError, validation, types)
- `idl.json` - IDL metadata for introspection

## 3. Implement the Server (10-15 min)

Create a file `my_server.py` that implements your service handlers:

```python
#!/usr/bin/env python3
from server import BarristerServer, CatalogService, CartService, OrderService
from checkout import *
from barrister2 import RPCError
import random
import time

# In-memory storage
products_db = [
    Product(productId="prod001", name="Wireless Mouse", description="Ergonomic mouse",
             price=29.99, stock=50, imageUrl="https://example.com/mouse.jpg"),
    Product(productId="prod002", name="Mechanical Keyboard", description="RGB keyboard",
             price=89.99, stock=25, imageUrl="https://example.com/keyboard.jpg"),
]

carts_db = {}  # cart_id -> Cart
orders_db = {}  # order_id -> Order

class CatalogServiceImpl(CatalogService):
    def listProducts(self):
        return products_db

    def getProduct(self, productId):
        for p in products_db:
            if p.productId == productId:
                return p
        return None

class CartServiceImpl(CartService):
    def addToCart(self, request):
        cart_id = request.cartId if request.cartId else f"cart_{random.randint(1000, 9999)}"

        if cart_id not in carts_db:
            carts_db[cart_id] = Cart(cartId=cart_id, items=[], subtotal=0.0)

        cart = carts_db[cart_id]
        product = next((p for p in products_db if p.productId == request.productId), None)

        if not product:
            raise RPCError(-32602, f"Product '{request.productId}' not found")

        # Add or update item
        for item in cart.items:
            if item.productId == request.productId:
                item.quantity += request.quantity
                item.price = product.price
                break
        else:
            cart.items.append(CartItem(productId=request.productId,
                                       quantity=request.quantity,
                                       price=product.price))

        cart.subtotal = sum(item.price * item.quantity for item in cart.items)
        return cart

    def getCart(self, cartId):
        return carts_db.get(cartId)

    def clearCart(self, cartId):
        if cartId in carts_db:
            carts_db[cartId].items = []
            carts_db[cartId].subtotal = 0.0
            return True
        return False

class OrderServiceImpl(OrderService):
    def createOrder(self, request):
        # Validate cart exists
        if request.cartId not in carts_db:
            raise RPCError(1001, "CartNotFound: Cart does not exist")

        cart = carts_db[request.cartId]

        # Check if cart is empty
        if not cart.items:
            raise RPCError(1002, "CartEmpty: Cannot create order from empty cart")

        # Validate address
        addr = request.shippingAddress
        if not addr.street or not addr.city or not addr.zipCode:
            raise RPCError(1005, "InvalidAddress: Shipping address validation failed")

        # Check stock
        for item in cart.items:
            product = next((p for p in products_db if p.productId == item.productId), None)
            if product and product.stock < item.quantity:
                raise RPCError(1004, "OutOfStock: Insufficient inventory")

        # Simulate payment (fail 10% of the time for demo)
        if random.random() < 0.1:
            raise RPCError(1003, "PaymentFailed: Card declined by issuer")

        # Create order
        order_id = f"order_{random.randint(10000, 99999)}"
        order = Order(
            orderId=order_id,
            cart=cart,
            shippingAddress=request.shippingAddress,
            paymentMethod=request.paymentMethod,
            status=OrderStatus.pending,
            total=cart.subtotal,
            createdAt=int(time.time())
        )
        orders_db[order_id] = order

        # Clear cart
        carts_db[request.cartId].items = []
        carts_db[request.cartId].subtotal = 0.0

        return CheckoutResponse(orderId=order_id, message="Order created successfully")

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
from checkout import *

# Connect to server
transport = HTTPTransport("http://localhost:8080")
catalog = CatalogServiceClient(transport)
cart = CartServiceClient(transport)
orders = OrderServiceClient(transport)

# List products
print("=== Products ===")
products = [Product(**p) for p in catalog.listProducts()]
for p in products:
    print(f"{p.name} - ${p.price:.2f}")

# Create cart and add items
print("\n=== Creating Cart ===")
cart_data = cart.addToCart({
    'productId': products[0].productId,
    'quantity': 2
})
my_cart = Cart(**cart_data)
print(f"Cart: {my_cart.cartId}, Subtotal: ${my_cart.subtotal:.2f}")

# Add another item
cart_data = cart.addToCart({
    'cartId': my_cart.cartId,
    'productId': products[1].productId,
    'quantity': 1
})
my_cart = Cart(**cart_data)
print(f"Updated Subtotal: ${my_cart.subtotal:.2f}")

# Create order
print("\n=== Creating Order ===")
try:
    response_data = orders.createOrder({
        'cartId': my_cart.cartId,
        'shippingAddress': {
            'street': '123 Main St',
            'city': 'San Francisco',
            'state': 'CA',
            'zipCode': '94105',
            'country': 'USA'
        },
        'paymentMethod': 'credit_card'
    })
    response = CheckoutResponse(**response_data)
    print(f"✓ Order created: {response.orderId}")
except RPCError as e:
    print(f"✗ Error {e.code}: {e.message}")

# Test error case: empty cart
print("\n=== Testing Error Case ===")
cart.clearCart(my_cart.cartId)
try:
    orders.createOrder({
        'cartId': my_cart.cartId,
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

## Working Example

The complete working example is available in `docs/examples/checkout-python/`:

```bash
cd docs/examples/checkout-python
python3 server.py  # Terminal 1
python3 client.py # Terminal 2
```
