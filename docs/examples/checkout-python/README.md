# Barrister2 E-Commerce Checkout Example - Python

A complete working example of a Barrister2 RPC service in Python.

## Files

- `checkout.idl` - Interface definition
- `server.py` - Server implementation (in-memory storage)
- `client.py` - Client demo
- Generated files (not included):
  - `checkout.py` - Type definitions
  - `server.py` (stub)
  - `client.py` (stub)
  - `barrister2/` - Runtime library

## Running

### Generate Code

```bash
barrister -runtime python-client-server checkout.idl
```

### Start Server

```bash
python3 server.py
```

Server runs on http://localhost:8080

### Run Client

```bash
python3 client.py
```

Expected output:
```
Barrister2 Checkout Client Demo
==================================================

Step 1: Listing all products...
Found 3 products:
  - Wireless Mouse ($29.99) - Stock: 50
  - Mechanical Keyboard ($89.99) - Stock: 25
  - USB-C Hub ($49.99) - Stock: 100

Step 2: Creating cart and adding items...
Cart created: cart_XXXX
Subtotal: $59.98

Step 3: Adding another item...
Updated cart subtotal: $149.97

Step 4: Creating order...
✓ Order created successfully!
  Order ID: order_XXXXX

Step 5: Testing error case (empty cart)...
✓ Got expected error:
  Error code: 1002 (expected: 1002)
  Message: CartEmpty: Cannot create order from empty cart
  ✓ Correct error code for empty cart!

Demo complete!
```

## Error Codes

The server implements custom error codes:

- `1001` - CartNotFound: Cart doesn't exist
- `1002` - CartEmpty: Cart has no items
- `1003` - PaymentFailed: Payment method rejected
- `1004` - OutOfStock: Insufficient inventory
- `1005` - InvalidAddress: Shipping address validation failed
