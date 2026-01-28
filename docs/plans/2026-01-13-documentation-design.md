# PulseRPC Documentation Design

**Date:** 2026-01-13
**Status:** Approved

## Overview

Create comprehensive documentation for PulseRPC hosted on GitHub Pages using Jekyll with Lunr.js search. The documentation will include installation instructions and language-specific quickstart guides demonstrating how to write clients and servers in all supported languages (Go, Java, Python, TypeScript, C#).

## Goals

1. **Lower onboarding friction** - New users can get started in 25-35 minutes
2. **Language-centric** - Polyglot developers can jump straight to their language
3. **Battle-tested examples** - All code in documentation is tested and guaranteed to work
4. **Searchable** - Lunr.js provides fast client-side search
5. **Maintainable** - Code examples live as source files, not embedded markdown

## Architecture

### Site Technology Stack

- **Static Site Generator:** Jekyll 4.x (GitHub Pages native)
- **Search:** Lunr.js (client-side JavaScript search)
- **Hosting:** GitHub Pages via `gh-pages` branch
- **Deployment:** GitHub Actions workflow

### Directory Structure

```
/docs/
├── index.md                           # Landing page
├── _config.yml                        # Jekyll configuration
├── _plugins/
│   └── code_file.rb                   # Custom Liquid tag
├── _includes/
│   └── search.html                    # Search UI component
├── _layouts/
│   └── default.html                   # Site layout with nav
├── assets/
│   ├── css/
│   │   └── styles.css                 # Custom styles
│   └── js/
│       └── search.js                  # Lunr.js implementation
├── examples/
│   ├── checkout-go/
│   │   ├── idl/
│   │   │   └── checkout.pulse
│   │   ├── server/
│   │   │   ├── main.go
│   │   │   └── go.mod
│   │   └── client/
│   │       └── main.go
│   ├── checkout-python/
│   │   ├── checkout.pulse
│   │   ├── server.py
│   │   └── client.py
│   ├── checkout-java/
│   ├── checkout-typescript/
│   └── checkout-csharp/
├── get-started/
│   ├── installation.md
│   └── quickstart-overview.md
├── idl-guide/
│   ├── syntax.md
│   ├── types.md
│   └── validation.md
└── languages/
    ├── go/
    │   ├── install.md
    │   ├── quickstart.md
    │   └── reference.md
    ├── java/
    ├── python/
    ├── typescript/
    └── csharp/
```

## The Quickstart Example: E-Commerce Checkout

### Why E-Commerce?

E-commerce checkout demonstrates realistic patterns while remaining accessible:
- **Domain familiarity** - Everyone understands shopping carts and orders
- **Rich data modeling** - Products, carts, orders, addresses, payments
- **Error scenarios** - Out of stock, payment failures, validation errors
- **Service boundaries** - Clean separation between catalog, cart, and order concerns

### The IDL: `checkout.pulse`

```idl
namespace checkout

// Enums
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

// Core entities
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
    orderId      string
    cart         Cart
    shippingAddress Address
    paymentMethod PaymentMethod
    status       OrderStatus
    total        float
    createdAt    int
}

// Request/Response
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

// Interfaces
interface CatalogService {
    listProducts() []Product
    getProduct(productId string) Product [optional]
}

interface CartService {
    addToCart(request AddToCartRequest) Cart
    getCart(cartId string) Cart [optional]
    clearCart(cartId string) bool
}

interface OrderService {
    createOrder(request CreateOrderRequest) CheckoutResponse
    getOrder(orderId string) Order [optional]
}
```

### Error Handling

The quickstart demonstrates PulseRPC's error handling mechanism:

```json
// Example payment failure
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": 1003,
    "message": "PaymentFailed: Card declined",
    "data": {
      "details": "Insufficient funds"
    }
  }
}
```

Error codes are explicitly documented (1001-1005) showing how applications use custom RPC error codes.

## Quickstart Structure

Each language quickstart (`/languages/{lang}/quickstart.md`) follows a consistent flow:

### 1. Prerequisites & Setup (5 min)
- Language/version requirements
- Install PulseRPC CLI
- Install language dependencies
- Initialize project

### 2. Define the Service (2 min)
- Present the complete `checkout.pulse`
- Brief explanations of key concepts
- Link to full IDL reference

### 3. Generate Code (1 min)
```bash
pulserpc -package checkout -runtime python-client-server checkout.pulse
```
- Explain generated files (`idl.{ext}`, `server.{ext}`, `client.{ext}`, `pulserpc/`)

### 4. Implement the Server (10-15 min)
- Complete working server implementation
- In-memory storage (dicts/maps)
- Error handling with custom codes
- Start HTTP server

### 5. Implement the Client (5-10 min)
- Complete working client
- Demonstrate all service calls
- Show success and error cases

### 6. Run It (2 min)
- Terminal A: Start server
- Terminal B: Run client
- Expected output

**Total time: 25-35 minutes**

## Documentation Navigation

```
├── Get Started
│   ├── Installation
│   └── Quickstart Overview
├── IDL Guide
│   ├── Syntax
│   ├── Types & Fields
│   └── Validation
├── Languages
│   ├── Go
│   │   ├── Install
│   │   ├── Quickstart
│   │   └── Reference
│   ├── Java
│   ├── Python
│   ├── TypeScript
│   └── C#
└── About
    ├── Project Info
    └── Contributing
```

## Code Testing Strategy

### The Problem

Documentation code rots - examples get out of sync with API changes, typos creep in, and what worked once stops working.

### The Solution

**Store source files, embed in documentation:**

1. Working code lives in `/docs/examples/checkout-{lang}/`
2. Integration tests validate the code actually runs
3. Custom Jekyll tag embeds source files into markdown
4. CI prevents broken docs from publishing

### Custom Jekyll Tag

Create `_plugins/code_file.rb`:

```ruby
module Jekyll
  class CodeFile < Liquid::Tag
    def initialize(tag_name, markup, tokens)
      super
      @path = markup.strip
    end

    def render(context)
      site = context.registers[:site]
      file_path = File.join(site.source, 'docs', @path)
      if File.exist?(file_path)
        contents = File.read(file_path)
        "```\n#{contents}\n```"
      else
        "Error: File not found: #{@path}"
      end
    end
  end
end

Liquid::Template.register_tag('code_file', Jekyll::CodeFile)
```

### Usage in Markdown

```markdown
### 4. Implement the Server

Save this as `server.py`:

{% code_file examples/checkout-python/server.py %}
```

### Testing

Each language has a test: `/tests/integration/test-docs-{lang}.sh`

```bash
#!/bin/bash
cd docs/examples/checkout-python
python3 server.py &
SERVER_PID=$!
sleep 2
python3 client.py
EXIT_CODE=$?
kill $SERVER_PID
exit $EXIT_CODE
```

CI runs these tests on every PR. If tests fail, docs don't deploy.

## Installation Documentation

### Multiple Install Methods

| Method | Steps | Best For |
|--------|-------|----------|
| **Go Install** | `go install github.com/coopernurse/pulserpc@latest` | Go developers, want latest |
| **Download Binary** | Download from Releases, add to PATH | Quick setup, no Go needed |
| **Docker** | `docker pull ghcr.io/coopernurse/pulserpc:latest` | Containerized workflows |
| **Build from Source** | `git clone && make build` | Contributing, custom builds |

### Language-Specific Prerequisites

Each language has an `install.md` covering:
- Runtime version requirements
- Package manager setup
- Development environment tips

## Jekyll Configuration

### `_config.yml`

```yaml
title: PulseRPC RPC
description: IDL-based JSON-RPC code generation
lang: en
baseurl: /pulserpc

markdown: kramdown
highlighter: rouge
plugins:
  - jekyll-seo-tag
  - jekyll-sitemap

exclude:
  - Gemfile
  - Gemfile.lock
  - node_modules
  - vendor/bundle

collections:
  pages:
    output: true
    permalink: /:path/
```

### GitHub Actions Workflow

`.github/workflows/docs.yml`:

```yaml
name: Docs

on:
  push:
    branches: [main]
    paths: [docs/**]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
      - name: Test Go example
        run: tests/integration/test-docs-go.sh
      - name: Test Python example
        run: tests/integration/test-docs-python.sh
      # ... other languages
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/_site
```

## Success Criteria

1. ✅ New users can install PulseRPC in <5 minutes
2. ✅ Developers can build a working RPC service in their language in <35 minutes
3. ✅ All code examples are tested and guaranteed to work
4. ✅ Documentation is searchable via Lunr.js
5. ✅ Site is hosted on GitHub Pages with automated deployment
6. ✅ CI prevents broken documentation from being published

## Future Enhancements

Out of scope for this initial work but worth considering:

- API reference generated from IDL comments
- Interactive playground embedded in docs
- Migration guide from gRPC/Thrift/etc.
- Performance best practices guide
- Security considerations
- Deployment patterns (Kubernetes, serverless, etc.)
