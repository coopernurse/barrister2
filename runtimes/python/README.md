# Barrister Python Runtime

This directory contains the Python runtime library for Barrister-generated code.

## Structure

- `barrister2/` - Main runtime library package
  - `__init__.py` - Package exports
  - `rpc.py` - RPC error handling
  - `validation.py` - Type validation functions
  - `types.py` - Type helper functions
- `tests/` - Unit tests

## Installation

For development:
```bash
make install
```

Or:
```bash
pip install -e .
```

## Testing

Run tests locally (requires Python 3.7+):
```bash
make test
```

Run tests in Docker (no local Python required):
```bash
make test-docker
```

## Usage

Generated code imports from this library:
```python
from barrister2 import RPCError, validate_type
from barrister import ALL_STRUCTS, ALL_ENUMS
```

The runtime library provides:
- `RPCError` - Exception class for JSON-RPC errors
- `validate_type()` - Main validation function
- `validate_struct()`, `validate_enum()`, etc. - Specific validators
- Helper functions for working with type definitions

**Note:** The runtime library is automatically bundled into the output directory when code is generated, so no separate installation is required.

