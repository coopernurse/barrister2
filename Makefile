.PHONY: build test cover lint quality clean install-tools

# Variables
BINARY_NAME=barrister
TARGET_DIR=target
BINARY_PATH=$(TARGET_DIR)/$(BINARY_NAME)
COVERAGE_FILE=$(TARGET_DIR)/coverage.out
COVERAGE_HTML=$(TARGET_DIR)/coverage.html

# Default target
.DEFAULT_GOAL := build

# Build the binary
build:
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

# Run quality checks (lint + test)
quality: lint test
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

# Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -rf $(TARGET_DIR)
	go clean ./...

