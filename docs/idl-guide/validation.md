---
title: Runtime Validation
layout: default
---

# Runtime Validation

Barrister runtimes automatically validate request and response data against your IDL definitions.

## When Validation Happens

Validation occurs at **two points**:

1. **Client-side** - Before sending requests
2. **Server-side** - Before and after processing requests

## Required vs Optional Fields

```idl
struct User {
    userId    string        // Required
    email     string        // Required
    phone     string [optional]  // Optional
}
```

**Validation rules:**
- ✅ `{"userId": "123", "email": "user@example.com"}` - Valid (phone omitted)
- ✅ `{"userId": "123", "email": "user@example.com", "phone": null}` - Valid (phone is null)
- ❌ `{"userId": "123"}` - Invalid (email is required)
- ❌ `{"userId": 123, "email": "user@example.com"}` - Invalid (userId wrong type)

## Type Validation

### String

```idl
name string
```

✅ `"John Doe"`
❌ `123`
❌ `null` (unless marked optional)

### Int

```idl
age int
```

✅ `42`
❌ `"42"` (string, not int)
❌ `3.14` (float, not int)

### Float

```idl
price float
```

✅ `19.99`
✅ `20` (int coerces to float)
❌ `"19.99"`

### Bool

```idl
active bool
```

✅ `true`
✅ `false`
❌ `"true"`
❌ `1`

## Array Validation

```idl
struct Cart {
    items []CartItem
}
```

✅ `{"items": []}` - Empty array valid
✅ `{"items": [{"productId": "1", "quantity": 2}]}` - Valid item
❌ `{"items": null}` - Null array invalid (unless optional)
❌ `{"items": [{"productId": 1}]}` - Wrong type inside array

## Map Validation

```idl
metadata map[string]string
```

✅ `{"metadata": {"key": "value"}}`
✅ `{"metadata": {}}` - Empty map valid
❌ `{"metadata": {"key": 123}}` - Value type mismatch
❌ `{"metadata": []}` - Array, not map

## Nested Validation

Validation is recursive:

```idl
struct Order {
    cart  Cart
    user  User [optional]
}
```

Validates `Cart` and `User` structures recursively.

## Validation Errors

When validation fails, Barrister returns an RPC error:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "field": "email",
      "message": "Required field 'email' is missing"
    }
  }
}
```

## Custom Validation

For business logic validation, return error codes:

```idl
// Error codes:
//   1001 - CartNotFound
//   1002 - CartEmpty
//   1003 - PaymentFailed

interface OrderService {
    createOrder(request CreateOrderRequest) CheckoutResponse
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": 1002,
    "message": "CartEmpty: Cannot create order from empty cart"
  }
}
```

## Best Practices

1. **Validate early** - Client-side validation provides fast feedback
2. **Validate server-side** - Never trust client input
3. **Use optional fields** - Make fields optional only if truly nullable
4. **Custom error codes** - Use error codes for business logic failures
5. **Clear error messages** - Include helpful context in error messages

## Next Steps

- [IDL Syntax](syntax.html) - Define your IDL
- [Quickstart](../get-started/quickstart-overview.html) - See validation in action
