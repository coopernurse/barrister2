---
title: TypeScript Quickstart
layout: default
---

# TypeScript Quickstart

Build a complete Barrister2 RPC service in TypeScript with our e-commerce checkout example.

## Prerequisites

- Node.js 18 or later
- TypeScript 5.0 or later
- Barrister CLI installed ([Installation Guide](../../get-started/installation))

## 1. Define the Service (2 min)

Create `checkout.idl` with your service definition:

{% code_file ../../examples/checkout.idl %}

## 2. Generate Code (1 min)

Generate the TypeScript code from your IDL:

```bash
barrister -plugin ts-client-server checkout.idl
```

This creates:
- `checkout.ts` - Type definitions
- `server.ts` - Barrister server framework
- `client.ts` - HTTP client framework
- `barrister2/` - Runtime library
- `idl.json` - IDL metadata

## 3. Implement the Server (10-15 min)

Create `my_server.ts` that implements your service handlers:

```typescript
import { BarristerServer, CatalogService, CartService, OrderService } from './server';
import * as checkout from './checkout';
import { RPCError } from './barrister2/rpc';

const products: checkout.Product[] = [
  new checkout.Product({
    productId: 'prod001',
    name: 'Wireless Mouse',
    description: 'Ergonomic mouse',
    price: 29.99,
    stock: 50,
    imageUrl: 'https://example.com/mouse.jpg'
  }),
  new checkout.Product({
    productId: 'prod002',
    name: 'Mechanical Keyboard',
    description: 'RGB keyboard',
    price: 89.99,
    stock: 25,
    imageUrl: 'https://example.com/keyboard.jpg'
  })
];

const carts = new Map<string, checkout.Cart>();
const orders = new Map<string, checkout.Order>();

class CatalogServiceImpl extends CatalogService {
  listProducts(): checkout.Product[] {
    return products;
  }

  getProduct(productId: string): checkout.Product | null {
    return products.find(p => p.productId === productId) || null;
  }
}

class CartServiceImpl extends CartService {
  addToCart(request: checkout.AddToCartRequest): checkout.Cart {
    let cartId = request.cartId || `cart_${Math.floor(Math.random() * 9000 + 1000)}`;

    let cart = carts.get(cartId);
    if (!cart) {
      cart = new checkout.Cart({
        cartId,
        items: [],
        subtotal: 0
      });
      carts.set(cartId, cart);
    }

    const product = products.find(p => p.productId === request.productId);
    if (!product) {
      throw new RPCException(-32602, 'Product not found');
    }

    cart.items.push(new checkout.CartItem({
      productId: request.productId,
      quantity: request.quantity,
      price: product.price
    }));

    cart.subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return cart;
  }

  getCart(cartId: string): checkout.Cart | null {
    return carts.get(cartId) || null;
  }

  clearCart(cartId: string): boolean {
    const cart = carts.get(cartId);
    if (cart) {
      cart.items = [];
      cart.subtotal = 0;
      return true;
    }
    return false;
  }
}

class OrderServiceImpl extends OrderService {
  createOrder(request: checkout.CreateOrderRequest): checkout.CheckoutResponse {
    const cart = carts.get(request.cartId);
    if (!cart) {
      throw new RPCException(1001, 'CartNotFound: Cart does not exist');
    }

    if (!cart.items || cart.items.length === 0) {
      throw new RPCException(1002, 'CartEmpty: Cannot create order from empty cart');
    }

    const orderId = `order_${Math.floor(Math.random() * 90000 + 10000)}`;
    const order = new checkout.Order({
      orderId,
      cart,
      shippingAddress: request.shippingAddress,
      paymentMethod: request.paymentMethod,
      status: checkout.OrderStatus.pending,
      total: cart.subtotal,
      createdAt: Math.floor(Date.now() / 1000)
    });

    orders.set(orderId, cart);
    return new checkout.CheckoutResponse({ orderId, message: 'Order created successfully' });
  }

  getOrder(orderId: string): checkout.Order | null {
    return orders.get(orderId) || null;
  }
}

// Start server
const server = new BarristerServer(8080);
server.registerCatalogService(new CatalogServiceImpl());
server.registerCartService(new CartServiceImpl());
server.registerOrderService(new OrderServiceImpl());
server.start();
```

Build and start your server:

```bash
npm run build
npm start
```

## 4. Implement the Client (5-10 min)

Create `my_client.ts` to call your service:

```typescript
import { HTTPTransport } from './client';
import * as checkout from './checkout';
import { CatalogServiceClient, CartServiceClient, OrderServiceClient } from './checkout';

const transport = new HTTPTransport('http://localhost:8080');
const catalog = new CatalogServiceClient(transport);
const cart = new CartServiceClient(transport);
const orders = new OrderServiceClient(transport);

// List products
const products = catalog.listProducts();
console.log('=== Products ===');
for (const p of products) {
  console.log(`${p.name} - $${p.price}`);
}

// Add to cart
const result = cart.addToCart({
  cartId: null,
  productId: products[0].productId,
  quantity: 2
});
console.log(`\nCart: ${result.cartId}`);

// Create order
const response = orders.createOrder({
  cartId: result.cartId,
  shippingAddress: {
    street: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94105',
    country: 'USA'
  },
  paymentMethod: checkout.PaymentMethod.credit_card
});
console.log(`✓ Order created: ${response.orderId}`);
```

Build and run your client:

```bash
npm run build
node dist/client.js
```

## Error Codes

Throw `RPCException` with custom error codes:

```typescript
throw new RPCException(1002, 'CartEmpty: Cannot create order from empty cart');
```

| Code | Name |
|------|------|
| 1001 | CartNotFound |
| 1002 | CartEmpty |
| 1003 | PaymentFailed |
| 1004 | OutOfStock |
| 1005 | InvalidAddress |

## Next Steps

- [TypeScript Reference](reference.html) - Type mappings and async patterns
- [IDL Syntax](../../idl-guide/syntax.html) - Full IDL reference

## Working Example

Complete example in `docs/examples/checkout-typescript/`:

```bash
cd docs/examples/checkout-typescript
npm install && npm run build
node dist/server.js      # Terminal 1
node dist/test_client.js # Terminal 2
```
