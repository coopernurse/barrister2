# GitHub Actions Binary Release Design

**Date:** 2026-01-14
**Status:** Approved

## Overview

Implement GitHub Actions CI/CD to build and publish pre-built binaries for multiple platforms, enabling Method 2 (Download Pre-built Binary) in the installation documentation.

## Requirements

- Build 5 binary targets: linux-amd64, linux-arm64, darwin-amd64, darwin-arm64, windows-amd64
- Automate builds on version tags
- Store binaries in GitHub Releases for public download
- Compute SHA256 checksums for verification

## Architecture

### Triggers

```yaml
on:
  push:
    tags: ['v*']
  release:
    types: [published]
```

- **Tag push** (`v*`): Builds binaries, creates draft release with artifacts
- **Release published**: Attaches artifacts to a manually-created release

### Build Matrix

| Binary Name | GOOS | GOARCH |
|-------------|------|--------|
| barrister-linux-amd64 | linux | amd64 |
| barrister-linux-arm64 | linux | arm64 |
| barrister-darwin-amd64 | darwin | amd64 |
| barrister-darwin-arm64 | darwin | arm64 |
| barrister-windows-amd64 | windows | amd64 |

### Workflow Jobs

1. **build**: Matrix job building each target
   - Checks out code
   - Sets up Go 1.21+
   - Builds web UI (`make build-webui`)
   - Cross-compiles binary for target
   - Uploads as release artifact

2. **assemble**: Runs after all builds complete
   - Downloads all binaries
   - Computes SHA256 checksums into `barrister_checksums.txt`
   - Uses `softprops/action-gh-release` to attach artifacts to release

## Download URLs

After implementation, users can download from:
```
https://github.com/coopernurse/barrister2/releases/latest/download/barrister-linux-amd64
https://github.com/coopernurse/barrister2/releases/latest/download/barrister-linux-arm64
https://github.com/coopernurse/barrister2/releases/latest/download/barrister-darwin-amd64
https://github.com/coopernurse/barrister2/releases/latest/download/barrister-darwin-arm64
https://github.com/coopernurse/barrister2/releases/latest/download/barrister-windows-amd64
```

## Files Created

- `.github/workflows/build-binaries.yml`: Main CI/CD workflow

## Future Enhancements (Out of Scope)

- Windows `.zip` archive
- macOS code signing/notarization
- Homebrew tap (`brew install`)
- Docker multi-architecture images
