---
title: Syntax
parent: IDL Guide
nav_order: 1
layout: default
---

# PulseRPC IDL Syntax

The PulseRPC Interface Definition Language (IDL) lets you define your service contract in a language-agnostic way.

## Namespaces

Every IDL file must declare a namespace:

```idl
namespace myservice
```

The namespace becomes the package/module name in generated code.

## Comments

```idl
// Comments start with //

// Multi-line comments are supported                                                                                                                                                                                                        
// by stacking single-line comments                                                                                                                                                                                                         
// on consecutive lines
```

## Enums

Define a set of valid values:

```idl
enum Status {
    pending
    active
    closed
}
```

## Structs

Define data structures with fields:

```idl
struct User {
    userId    string
    email     string
    age       int
    active    bool
    createdAt int      [optional]
}
```

### Field Modifiers

- `[optional]` - Field can be null/omitted
- No modifier - Field is required

## Struct Inheritance

Extend existing structs:

```idl
struct BaseResponse {
    status string
    message string
}

struct UserResponse extends BaseResponse {
    user User
}
```

## Arrays

Define lists with `[]`:

```idl
struct Cart {
    items []CartItem
}
```

## Maps

Define key-value maps:

```idl
struct Metadata {
    tags map[string]string
}
```

## Interfaces

Define service interfaces:

```idl
interface UserService {
    // Returns a user by ID
    getUser(userId string) User

    // Creates a new user
    createUser(user User) UserResponse

    // Lists all users (optional return)
    listUsers() []User [optional]
}
```

### Interface Methods

- Methods define request and response types
- Return type can be marked `[optional]` to indicate null return

## Imports

Import other IDL files:

```idl
import "common.idl"
```

## Complete Example

```idl
namespace checkout

enum OrderStatus {
    pending
    paid
    shipped
    cancelled
}

struct Product {
    productId    string
    name         string
    price        float
    stock        int
}

interface CatalogService {
    listProducts() []Product
    getProduct(productId string) Product [optional]
}

interface OrderService {
    createOrder(request CreateOrderRequest) OrderResponse
    getOrder(orderId string) Order [optional]
}
```

## Next Steps

- [Types & Fields](types.html) - Built-in types and validation
- [Validation](validation.html) - How runtime validation works
- [Quickstart](../get-started/quickstart-overview.html) - Build a complete example
