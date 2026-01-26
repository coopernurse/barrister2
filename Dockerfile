# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /src

# Optimize layer caching - copy deps first
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" \
    -o /pulserpc ./cmd/pulse/pulse.go

# Final stage - scratch image (empty, no OS)
FROM scratch

# Copy the binary from builder
COPY --from=builder /pulserpc /pulserpc

# Non-root user for security
USER 1000:1000

# Expose default HTTP port
EXPOSE 8080

# Set the entrypoint
ENTRYPOINT ["/pulserpc"]
