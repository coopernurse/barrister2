---
title: Home
layout: default
---

# Barrister2 RPC

Barrister is a remote procedure call system similar to gRPC that uses JSON-RPC encoded messages but adds an interface definition system so that the message payloads can be easily documented (for humans) and validated (by computers).

## Features

- **IDL-based code generation** - Define your service once, generate clients and servers in multiple languages
- **Type-safe RPC** - Automatic validation of request/response types
- **Multi-language support** - Go, Java, Python, TypeScript, C#
- **JSON-RPC 2.0** - Standard protocol with broad language support
- **Web UI Playground** - Experiment with IDL definitions and generate code in your browser

## Quick Start

1. [Install Barrister](get-started/installation)
2. [Write an IDL file](idl-guide/syntax)
3. [Generate code](get-started/quickstart-overview)
4. [Implement your service](languages/go/quickstart)

## Documentation

- [Get Started](get-started/installation) - Installation and quickstart guide
- [IDL Guide](idl-guide/syntax) - Interface Definition Language reference
- [Languages](languages/go/quickstart) - Language-specific quickstarts and reference

## Example

A simple IDL file:

```idl
namespace checkout

interface CatalogService {
    listProducts() []Product
    getProduct(productId string) Product [optional]
}

struct Product {
    productId    string
    name         string
    price        float
    stock        int
}
```

Generate code and implement your service in minutes!

---

Ready to get started? Check out the [installation guide](get-started/installation) or jump to a [language quickstart](languages/go/quickstart).
