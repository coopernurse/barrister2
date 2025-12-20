.PHONY: build test lint clean dev install

# Variables
NPM = npm
DIST_DIR = dist
SRC_DIR = src
STATIC_DIR = static

# Default target
.DEFAULT_GOAL := build

# Install dependencies
install:
	$(NPM) install

# Build the web UI
build: install
	@echo "Building web UI..."
	@mkdir -p $(DIST_DIR)
	$(NPM) run build
	@cp -r $(STATIC_DIR)/* $(DIST_DIR)/
	@mkdir -p ../pkg/webui/dist
	@cp -r $(DIST_DIR)/* ../pkg/webui/dist/
	@echo "Build complete. Files in $(DIST_DIR)/"

# Run linter
lint: install
	@echo "Running linter..."
	$(NPM) run lint

# Run tests
test: install
	@echo "Running tests..."
	$(NPM) run test

# Run tests with coverage
cover: install
	@echo "Running tests with coverage..."
	$(NPM) run test:coverage
	@echo "Coverage report generated in coverage/ directory"

# Development mode with watch
dev: install
	@echo "Starting dev mode (watch)..."
	$(NPM) run dev

# Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -rf $(DIST_DIR)
	rm -rf ../pkg/webui/dist
	rm -rf node_modules

