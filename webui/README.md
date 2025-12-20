# Barrister Web UI

Universal client for discovering and calling Barrister RPC services.

## Development

```bash
# Install dependencies
make install

# Build
make build

# Development mode (watch)
make dev

# Lint
make lint

# Test
make test
```

## Building

The build process bundles the Mithril.js application and copies static files to the `dist/` directory, which is then embedded into the barrister binary.

