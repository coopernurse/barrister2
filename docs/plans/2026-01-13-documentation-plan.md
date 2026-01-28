# PulseRPC Documentation Implementation Plan

**Date:** 2026-01-13
**Based on:** [2026-01-13-documentation-design.md](./2026-01-13-documentation-design.md)
**Status:** Ready for implementation

## Overview

This plan breaks down the implementation of the PulseRPC documentation site into concrete, executable tasks. Work proceeds in phases: foundation, content, examples, and polish.

## Phase 1: Jekyll Foundation (4 tasks)

### 1.1 Create Jekyll site structure

**Files to create:**
- `docs/_config.yml` - Jekyll configuration
- `docs/_layouts/default.html` - Main layout with header/nav/footer
- `docs/_includes/header.html` - Site header with navigation
- `docs/_includes/footer.html` - Site footer
- `docs/index.md` - Landing page with project overview
- `docs/assets/css/styles.css` - Custom styles

**Expected:**
- Running `bundle exec jekyll serve` in `/docs` serves site at http://localhost:4000
- Site has basic navigation structure

---

### 1.2 Implement Lunr.js search

**Files to create:**
- `docs/_includes/search.html` - Search input UI
- `docs/assets/js/search.js` - Lunr.js implementation with indexing
- Update `docs/_layouts/default.html` to include search

**Implementation approach:**
1. Add search input to header
2. Build Lunr index from all markdown files on page load
3. Configure search to return matching pages with snippets
4. Style search results dropdown

**Expected:**
- Typing in search box shows matching pages
- Search works on all markdown content
- Search results are clickable links

---

### 1.3 Create navigation structure

**Files to create:**
- Update `docs/_includes/header.html` with dropdown navigation
- Create placeholder pages for all sections:
  - `docs/get-started/installation.md`
  - `docs/get-started/quickstart-overview.md`
  - `docs/idl-guide/syntax.md`
  - `docs/idl-guide/types.md`
  - `docs/idl-guide/validation.md`
  - `docs/languages/go/install.md`
  - `docs/languages/go/quickstart.md`
  - `docs/languages/go/reference.md`
  - (Repeat for java, python, typescript, csharp)

**Expected:**
- Navigation menu with dropdowns works
- All pages are accessible via nav
- Each page has proper title/breadcrumbs

---

### 1.4 Create custom code_file plugin

**Files to create:**
- `docs/_plugins/code_file.rb` - Custom Liquid tag implementation

**Implementation:**
```ruby
module Jekyll
  class CodeFile < Liquid::Tag
    def initialize(tag_name, markup, tokens)
      super
      @path = markup.strip
    end

    def render(context)
      site = context.registers[:site]
      file_path = File.join(site.source, @path)
      if File.exist?(file_path)
        contents = File.read(file_path)
        syntax = file_path.split('.').last
        "```#{syntax}\n#{contents}\n```"
      else
        "_Error: File not found: #{@path}_"
      end
    end
  end
end

Liquid::Template.register_tag('code_file', Jekyll::CodeFile)
```

**Expected:**
- Using `{% code_file path/to/file.py %}` in markdown embeds file contents with syntax highlighting
- Missing files show helpful error message

---

## Phase 2: Example IDL (2 tasks)

### 2.1 Create checkout.pulse

**File to create:**
- `examples/checkout.pulse` (root level, shared reference)

**IDL contents** (from design):
- Namespace: `checkout`
- Enums: OrderStatus, PaymentMethod
- Structs: Product, CartItem, Cart, Address, Order, AddToCartRequest, CreateOrderRequest, CheckoutResponse
- Interfaces: CatalogService, CartService, OrderService
- Error codes: 1001-1005 documented

**Expected:**
- IDL compiles successfully with `./target/pulserpc checkout.pulse`
- Covers all IDL features: namespace, interface, struct, enum, optional fields, arrays, extends (if any)

---

### 2.2 Validate checkout.pulse with all runtimes

**Task:**
Generate code for all supported languages from checkout.pulse

**Commands to run:**
```bash
./target/pulserpc -runtime go-client-server examples/checkout.pulse
./target/pulserpc -runtime java-client-server examples/checkout.pulse
./target/pulserpc -runtime python-client-server examples/checkout.pulse
./target/pulserpc -runtime ts-client-server examples/checkout.pulse
./target/pulserpc -runtime csharp-client-server examples/checkout.pulse
```

**Expected:**
- All 5 languages generate successfully
- No syntax errors or validation errors
- Generated files compile/run in their respective environments

---

## Phase 3: Working Code Examples (5 tasks, one per language)

### 3.1 Python quickstart example

**Directory to create:**
- `docs/examples/checkout-python/`

**Files to create:**
- `checkout.pulse` - Copy from examples/checkout.pulse
- `server.py` - Full server implementation
- `client.py` - Full client implementation
- `README.md` - Brief instructions

**Server implementation (`server.py`):**
- Implements CatalogService, CartService, OrderService
- In-memory storage using dicts
- Error handling with codes 1001-1005
- Starts HTTP server on localhost:8080

**Client implementation (`client.py`):**
- Calls listProducts, addToCart, createOrder
- Demonstrates success case (valid order)
- Demonstrates error case (e.g., empty cart → error 1002)
- Prints readable output

**Expected:**
- Running `python3 server.py` starts server
- Running `python3 client.py` in another terminal produces expected output
- All three services work correctly
- Error codes are properly returned

---

### 3.2 Go quickstart example

**Directory to create:**
- `docs/examples/checkout-go/`

**Files to create:**
- `idl/checkout.pulse`
- `server/main.go`
- `server/go.mod`
- `client/main.go`
- `client/go.mod`
- `README.md`

**Implementation approach:**
- Generate code with pulserpc CLI
- Implement server handlers for all interfaces
- In-memory storage using maps with sync.Mutex
- Client demonstrates all service calls

**Expected:**
- `go run server/main.go` starts server
- `go run client/main.go` produces expected output
- Code passes `go vet` and `gofmt`

---

### 3.3 Java quickstart example

**Directory to create:**
- `docs/examples/checkout-java/`

**Files to create:**
- `checkout.pulse`
- `src/main/java/checkout/Server.java`
- `src/main/java/checkout/Client.java`
- `pom.xml` or `build.gradle`
- `README.md`

**Expected:**
- Compiles with `mvn compile` or `gradle build`
- `mvn exec:java -Dexec.mainClass="checkout.Server"` starts server
- `mvn exec:java -Dexec.mainClass="checkout.Client"` produces expected output

---

### 3.4 TypeScript quickstart example

**Directory to create:**
- `docs/examples/checkout-typescript/`

**Files to create:**
- `checkout.pulse`
- `server.ts`
- `client.ts`
- `package.json`
- `tsconfig.json`
- `README.md`

**Expected:**
- `npm install && npm run build` compiles
- `node dist/server.js` starts server
- `node dist/client.js` produces expected output

---

### 3.5 C# quickstart example

**Directory to create:**
- `docs/examples/checkout-csharp/`

**Files to create:**
- `checkout.pulse`
- `Server.cs`
- `Client.cs`
- `checkout.csproj`
- `README.md`

**Expected:**
- `dotnet build` compiles
- `dotnet run --project Server.csproj` starts server
- `dotnet run --project Client.csproj` produces expected output

---

## Phase 4: Documentation Content (10 tasks)

### 4.1 Write installation guide

**File to update:** `docs/get-started/installation.md`

**Content to include:**
1. Prerequisites (Go 1.21+, or pre-built binary)
2. Four installation methods:
   - Go install: `go install github.com/coopernurse/pulserpc@latest`
   - Download binary from Releases
   - Docker: `docker pull ghcr.io/coopernurse/pulserpc:latest`
   - Build from source: `make build`
3. Verification: `pulserpc --version`
4. Troubleshooting section

**Expected:**
- User can install PulseRPC using any of the 4 methods
- Instructions are clear and copy-pasteable
- Troubleshooting covers common issues (PATH, Go version, permissions)

---

### 4.2 Write quickstart overview

**File to update:** `docs/get-started/quickstart-overview.md`

**Content to include:**
1. What you'll build (e-commerce checkout API)
2. What you'll learn (IDL syntax, code gen, server impl, client usage)
3. Time estimate (25-35 min)
4. Links to language-specific quickstarts
5. Brief preview of the checkout.pulse

**Expected:**
- User understands what they'll build
- User can choose their language and jump in

---

### 4.3 Write IDL syntax guide

**File to update:** `docs/idl-guide/syntax.md`

**Content to include:**
1. Namespaces
2. Interfaces
3. Structs
4. Enums
5. Comments
6. Imports (if supported)
7. Complete example using checkout.pulse excerpts

**Expected:**
- Clear reference for IDL syntax
- Code snippets for each construct
- Links to quickstart for hands-on practice

---

### 4.4 Write IDL types guide

**File to update:** `docs/idl-guide/types.md`

**Content to include:**
1. Built-in types (string, int, float, bool)
2. Arrays: `[]Type`
3. Maps: `map[string]Type`
4. Optional fields: `[optional]`
5. Struct inheritance: `extends`

**Expected:**
- Comprehensive type reference
- Examples of each type
- Validation rules explained

---

### 4.5 Write validation guide

**File to update:** `docs/idl-guide/validation.md`

**Content to include:**
1. How runtime validation works
2. Required vs optional fields
3. Array/map constraints
4. Type coercion rules
5. Validation error examples

**Expected:**
- User understands when validation happens
- User knows how validation errors are reported

---

### 4.6 Write Python quickstart doc

**File to update:** `docs/languages/python/quickstart.md`

**Content structure:**
1. Prerequisites & Setup
2. Define the Service (show checkout.pulse)
3. Generate Code
4. Implement the Server (using `{% code_file examples/checkout-python/server.py %}`)
5. Implement the Client (using `{% code_file examples/checkout-python/client.py %}`)
6. Run It (terminal output examples)

**Expected:**
- User can follow along and build working example
- All code is embedded from source files (not copy-pasted in markdown)
- Instructions are clear and complete

---

### 4.7 Write Go quickstart doc

**File to update:** `docs/languages/go/quickstart.md`

**Same structure as Python**, using Go-specific examples.

---

### 4.8 Write Java quickstart doc

**File to update:** `docs/languages/java/quickstart.md`

**Same structure**, using Java-specific examples.

---

### 4.9 Write TypeScript quickstart doc

**File to update:** `docs/languages/typescript/quickstart.md`

**Same structure**, using TypeScript-specific examples.

---

### 4.10 Write C# quickstart doc

**File to update:** `docs/languages/csharp/quickstart.md`

**Same structure**, using C#-specific examples.

---

## Phase 5: Testing Infrastructure (6 tasks)

### 5.1 Create Python docs test

**File to create:** `tests/integration/test-docs-python.sh`

**Script contents:**
```bash
#!/bin/bash
set -e

cd docs/examples/checkout-python

# Start server in background
python3 server.py &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Run client
python3 client.py

# Clean up
kill $SERVER_PID
```

**Expected:**
- Script is executable (`chmod +x`)
- Running script successfully tests the Python example
- Exits with code 0 on success, non-zero on failure

---

### 5.2 Create Go docs test

**File to create:** `tests/integration/test-docs-go.sh`

**Script contents:**
```bash
#!/bin/bash
set -e

cd docs/examples/checkout-go/server
go run main.go &
SERVER_PID=$!

sleep 2

cd ../client
go run main.go

kill $SERVER_PID
```

**Expected:**
- Successfully tests Go example
- Clean shutdown of server

---

### 5.3 Create Java docs test

**File to create:** `tests/integration/test-docs-java.sh`

**Expected:**
- Uses Maven/Gradle to run server and client
- Tests Java example successfully

---

### 5.4 Create TypeScript docs test

**File to create:** `tests/integration/test-docs-typescript.sh`

**Expected:**
- Builds and runs TypeScript example
- Tests successfully

---

### 5.5 Create C# docs test

**File to create:** `tests/integration/test-docs-csharp.sh`

**Expected:**
- Uses `dotnet` CLI to test
- Tests successfully

---

### 5.6 Create master docs test script

**File to create:** `tests/integration/test-docs-all.sh`

**Script contents:**
```bash
#!/bin/bash
set -e

echo "Testing Python docs example..."
tests/integration/test-docs-python.sh

echo "Testing Go docs example..."
tests/integration/test-docs-go.sh

echo "Testing Java docs example..."
tests/integration/test-docs-java.sh

echo "Testing TypeScript docs example..."
tests/integration/test-docs-typescript.sh

echo "Testing C# docs example..."
tests/integration/test-docs-csharp.sh

echo "All docs examples passed!"
```

**Expected:**
- Running this script tests all language examples
- CI can call this single script to validate all docs

---

## Phase 6: Deployment (3 tasks)

### 6.1 Create GitHub Actions workflow

**File to create:** `.github/workflows/docs.yml`

**Workflow contents:**
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
        with:
          go-version: '1.21'

      - name: Install PulseRPC
        run: make build

      - name: Test Python docs
        run: tests/integration/test-docs-python.sh

      - name: Test Go docs
        run: tests/integration/test-docs-go.sh

      - name: Test Java docs
        run: tests/integration/test-docs-java.sh

      - name: Test TypeScript docs
        run: tests/integration/test-docs-typescript.sh

      - name: Test C# docs
        run: tests/integration/test-docs-csharp.sh

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.0'
          bundler-cache: true
          working-directory: docs

      - name: Build Jekyll site
        run: |
          cd docs
          bundle install
          bundle exec jekyll build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/_site
```

**Expected:**
- Pushing to `main` triggers the workflow
- All docs examples are tested
- Jekyll site builds successfully
- Site deploys to GitHub Pages

---

### 6.2 Configure GitHub Pages

**Manual steps:**
1. Go to repo Settings → Pages
2. Source: Deploy from a branch
3. Branch: `gh-pages`
4. Folder: `/root`

**Expected:**
- GitHub Pages is configured
- After workflow runs, site is accessible at `https://bitmechanic.github.io/pulserpc/`

---

### 6.3 Add custom domain (optional)

**If using custom domain:**
1. Add `CNAME` file to `docs/` with domain
2. Configure DNS records
3. Enable HTTPS in GitHub Pages settings

**Expected:**
- Site accessible via custom domain
- HTTPS enabled

---

## Phase 7: Language Reference Pages (5 tasks)

### 4.7 Write Go reference

**File to update:** `docs/languages/go/reference.md`

**Content:**
- Language-specific conventions
- Type mappings (IDL → Go)
- Package structure
- Error handling patterns
- Common pitfalls

**Expected:**
- Comprehensive reference for Go developers
- Links to quickstart for examples

---

### 4.8 Write Java reference

**File to update:** `docs/languages/java/reference.md`

**Content:**
- Type mappings (IDL → Java)
- Jackson vs Gson support
- Package structure
- Exception handling

**Expected:**
- Comprehensive reference for Java developers

---

### 4.9 Write Python reference

**File to update:** `docs/languages/python/reference.md`

**Content:**
- Type mappings (IDL → Python)
- Type hints usage
- Import conventions
- Exception handling

**Expected:**
- Comprehensive reference for Python developers

---

### 4.10 Write TypeScript reference

**File to update:** `docs/languages/typescript/reference.md`

**Content:**
- Type mappings (IDL → TypeScript)
- Node.js vs browser usage
- Build tooling (tsc, webpack, etc.)
- Async patterns

**Expected:**
- Comprehensive reference for TypeScript developers

---

### 4.11 Write C# reference

**File to update:** `docs/languages/csharp/reference.md`

**Content:**
- Type mappings (IDL → C#)
- .NET version support
- NuGet package usage
- Async/await patterns

**Expected:**
- Comprehensive reference for C# developers

---

## Task Summary

**Total tasks:** 40
**Estimated complexity:** High (multiple languages, testing infrastructure, deployment)

**Phases:**
1. Jekyll Foundation - 4 tasks
2. Example IDL - 2 tasks
3. Code Examples - 5 tasks (one per language)
4. Documentation Content - 10 tasks
5. Testing Infrastructure - 6 tasks
6. Deployment - 3 tasks
7. Language Reference - 5 tasks

**Critical path:**
1. Jekyll Foundation
2. Example IDL
3. One working code example (e.g., Python)
4. Python quickstart doc
5. Testing infrastructure
6. Deployment

**Can be done in parallel:**
- All 5 language code examples
- All 5 language quickstart docs
- IDL guide pages (syntax, types, validation)

## Success Criteria

1. ✅ Documentation site builds locally with `bundle exec jekyll serve`
2. ✅ All code examples run successfully via test scripts
3. ✅ Quickstart guides are complete and copy-pasteable
4. ✅ Search works via Lunr.js
5. ✅ Site deploys to GitHub Pages via GitHub Actions
6. ✅ CI tests all examples and prevents broken docs
7. ✅ All 5 supported languages have complete quickstarts

## Rollout Plan

1. **Week 1:** Phase 1 (Jekyll Foundation) + Phase 2 (IDL)
2. **Week 2:** Phase 3 (Python example only) + Phase 4 (Python doc)
3. **Week 3:** Remaining 4 language examples + docs
4. **Week 4:** Phase 5 (Testing) + Phase 6 (Deployment) + Phase 7 (Reference pages)
