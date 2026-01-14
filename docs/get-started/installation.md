---
title: Installation
parent: Get Started
nav_order: 1
layout: default
---

# Installing Barrister

Barrister can be installed in several ways depending on your workflow.

> **Recommended**: Use the Go install method if you're a Go developer. Use Docker if you want to try Barrister without installing Go.

## Prerequisites

- Go 1.21 or later (for Go install method)
- Docker (for Docker method)
- Make and Go (for building from source)

## Installation Methods

### Method 1: Go Install (Recommended for Go developers)

```bash
go install github.com/coopernurse/barrister2@latest
```

This installs the `barrister` binary in your `GOPATH/bin` directory. Make sure `$GOPATH/bin` or `$HOME/go/bin` is in your `PATH`.

### Method 2: Download Pre-built Binary

Download the latest release from the [GitHub Releases page](https://github.com/coopernurse/barrister2/releases).

```bash
# Example for Linux AMD64
wget https://github.com/coopernurse/barrister2/releases/latest/download/barrister-linux-amd64 -O barrister
chmod +x barrister
mv barrister /usr/local/bin/
```

### Method 3: Docker

Pull the latest Docker image:

```bash
docker pull ghcr.io/coopernurse/barrister2:latest
```

Run Barrister via Docker:

```bash
docker run --rm -v $(pwd):/work ghcr.io/coopernurse/barrister2:latest barrister --help
```

### Method 4: Build from Source

Clone and build:

```bash
git clone https://github.com/coopernurse/barrister2.git
cd barrister2
make build
```

The binary will be created at `./target/barrister`.

## Verify Installation

```bash
barrister --version
```

You should see: `Barrister v0.x.x`

## Troubleshooting

> **Need Help?** If you encounter issues not covered here, please [open an issue on GitHub](https://github.com/coopernurse/barrister2/issues).

### Command not found

If you get `barrister: command not found`:

1. Check your PATH: `echo $PATH`
2. Add Go bin to PATH (if using Go install):
   ```bash
   echo 'export PATH=$PATH:$(go env GOPATH)/bin' >> ~/.bashrc
   source ~/.bashrc
   ```

### Wrong Go version

Barrister requires Go 1.21 or later. Check your version:

```bash
go version
```

### Permission denied

> **Common Issue**: This usually happens when downloading pre-built binaries. Make sure to set executable permissions.

If you get permission errors, make the binary executable:

```bash
chmod +x barrister
```

## Next Steps

- [Quickstart Overview](quickstart-overview.html) - Learn what you'll build
- [IDL Syntax](../idl-guide/syntax.html) - IDL language reference
- [Language Quickstarts](../languages/go/quickstart.html) - Jump to your language
