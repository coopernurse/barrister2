# Docker Image Release Design

**Date:** 2026-01-14
**Status:** Approved

## Overview

Extend the existing GitHub Actions workflow to build and publish Docker images to GitHub Container Registry (ghcr.io), enabling Method 3 (Docker) in the installation documentation.

## Requirements

- Build Docker images for linux-amd64 and linux-arm64
- Push multi-arch manifest to ghcr.io
- Create version tags (v1.0.0) and latest tag
- Use GITHUB_TOKEN for registry authentication (no extra secrets)

## Architecture

### Tags

On version tag `v1.0.0`:
- `ghcr.io/coopernurse/barrister2:v1.0.0` - Version-specific tag
- `ghcr.io/coopernurse/barrister2:latest` - Always points to latest release

### Dockerfile

Minimal scratch image:

```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" \
    -o /barrister ./cmd/barrister/barrister.go

FROM scratch
COPY --from=builder /barrister /barrister
EXPOSE 8080
ENTRYPOINT ["/barrister"]
```

### Workflow Integration

New `docker` job runs in parallel with `build` matrix:

```
v* tag push
    ↓
[build-linux-amd64]  [build-linux-arm64]  [docker-amd64]  [docker-arm64]
         ↓                    ↓                    ↓               ↓
         └────────────────────┴────────────────────┴───────────────┘
                                   ↓
                          [docker-manifest]
                                   ↓
                          Create draft release
```

### Docker Job Steps

1. **Set up Docker Buildx**
   ```yaml
   - name: Set up Docker Buildx
     uses: docker/setup-buildx-action@v3
   ```

2. **Log into ghcr.io**
   ```yaml
   - name: Log into ghcr.io
     uses: docker/login-action@v3
     with:
       registry: ghcr.io
       username: ${{ github.actor }}
       password: ${{ secrets.GITHUB_TOKEN }}
   ```

3. **Extract metadata**
   ```yaml
   - name: Extract metadata
     id: meta
     uses: docker/metadata-action@v5
     with:
       images: ghcr.io/${{ github.repository }}
       tags: |
         type=sha
         type=ref,event=tag
         type=raw,value=latest,enable={{is_default_branch}}
   ```

4. **Build and push (per architecture)**
   ```yaml
   - name: Build and push (linux-amd64)
     uses: docker/build-push-action@v5
     with:
       context: .
       push: true
       platforms: linux/amd64
       tags: ghcr.io/${{ github.repository }}:${{ matrix.tag }}
       build-args: |
         GOOS=linux
         GOARCH=amd64
   ```

5. **Create and push manifest**
   ```yaml
   - name: Create and push manifest
     run: |
       docker manifest create ghcr.io/${{ github.repository }}:${{ steps.meta.outputs.version }} \
         ghcr.io/${{ github.repository }}-amd64:${{ steps.meta.outputs.version }} \
         ghcr.io/${{ github.repository }}-arm64:${{ steps.meta.outputs.version }}
       docker manifest push ghcr.io/${{ github.repository }}:${{ steps.meta.outputs.version }}
   ```

## Files Created

- `Dockerfile`: Multi-stage build for minimal image
- `.github/workflows/build-binaries.yml` (modified): Add docker job

## Security

- Uses `GITHUB_TOKEN` for authentication (no additional secrets required)
- ghcr.io automatically makes images public when repository is public
