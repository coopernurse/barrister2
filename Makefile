.PHONY: build test cover lint quality clean install-tools test-runtime-python test-runtime-ts test-runtimes test-generator-python test-generator-ts test-generators build-webui lint-webui test-webui

# Variables
BINARY_NAME=barrister
TARGET_DIR=target
BINARY_PATH=$(TARGET_DIR)/$(BINARY_NAME)
COVERAGE_FILE=$(TARGET_DIR)/coverage.out
COVERAGE_HTML=$(TARGET_DIR)/coverage.html

# Default target
.DEFAULT_GOAL := build

# Build the web UI
build-webui:
	@echo "Building web UI..."
	@cd webui && $(MAKE) build

# Build the binary
build: build-webui
	go build -o $(BINARY_PATH) cmd/barrister/barrister.go
	@echo "Built successfully at $(BINARY_PATH)"

# Run tests
test:
	@echo "Running tests..."
	go test -v ./...

# Run tests with coverage
cover:
	@echo "Running tests with coverage..."
	@mkdir -p $(TARGET_DIR)
	go test -v -coverprofile=$(COVERAGE_FILE) ./...
	go tool cover -html=$(COVERAGE_FILE) -o $(COVERAGE_HTML)
	@echo "Coverage report generated at $(COVERAGE_HTML)"
	@go tool cover -func=$(COVERAGE_FILE) | tail -1

# Run linter
lint: install-tools
	@echo "Running linter..."
	@GOPATH=$$(go env GOPATH); \
	if command -v golangci-lint > /dev/null 2>&1; then \
		golangci-lint run ./...; \
	elif [ -f "$$GOPATH/bin/golangci-lint" ]; then \
		$$GOPATH/bin/golangci-lint run ./...; \
	else \
		echo "Error: golangci-lint not found. Run 'make install-tools' first."; \
		exit 1; \
	fi

# Run linter for webui
lint-webui:
	@echo "Running webui linter..."
	@cd webui && $(MAKE) lint

# Run tests for webui
test-webui:
	@echo "Running webui tests..."
	@cd webui && $(MAKE) test

# Run quality checks (lint + test + webui lint + webui test)
quality: lint test lint-webui test-webui
	@echo "Quality checks completed"

# Install required tools
install-tools:
	@echo "Checking for required tools..."
	@GOPATH=$$(go env GOPATH); \
	if [ ! -f "$$GOPATH/bin/golangci-lint" ]; then \
		echo "Installing golangci-lint..."; \
		go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest; \
		echo "golangci-lint installed to $$GOPATH/bin/golangci-lint"; \
		echo "Make sure $$GOPATH/bin is in your PATH"; \
	else \
		echo "golangci-lint already installed"; \
	fi

# Test Python runtime
test-runtime-python:
	@echo "Testing Python runtime..."
	@cd pkg/runtime/runtimes/python && $(MAKE) test

# Test TypeScript runtime
test-runtime-ts:
	@echo "Testing TypeScript runtime..."
	@cd pkg/runtime/runtimes/ts && $(MAKE) test

# Test all runtimes
test-runtimes: test-runtime-python test-runtime-ts
	@echo "All runtime tests passed"

# Test Python generator integration
test-generator-python:
	@echo "Testing Python generator integration..."
	@cd pkg/runtime/runtimes/python && $(MAKE) test-integration

# Test TypeScript generator integration
test-generator-ts:
	@echo "Testing TypeScript generator integration..."
	@cd pkg/runtime/runtimes/ts && $(MAKE) test-integration

# Test all generators
test-generators: test-generator-python test-generator-ts
	@echo "All generator tests passed"

# Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -rf $(TARGET_DIR)
	go clean ./...
	@cd webui && $(MAKE) clean || true

