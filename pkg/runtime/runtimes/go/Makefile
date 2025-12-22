.PHONY: test test-docker test-integration clean

# Variables
GO_IMAGE=golang:1.21-alpine
DOCKER_AVAILABLE := $(shell command -v docker >/dev/null 2>&1 && echo "yes" || echo "no")

# Test using local Go if available, otherwise Docker
test:
ifeq ($(DOCKER_AVAILABLE),yes)
	@echo "Using Docker for testing..."
	@$(MAKE) test-docker
else
	@echo "Using local Go for testing..."
	@cd tests && go test -v
endif

# Test using Docker
test-docker:
	@echo "Testing Go runtime in Docker..."
	@docker run --rm -v $(PWD):/workspace -w /workspace \
		$(GO_IMAGE) \
		sh -c "echo 'module barrister2-go-runtime' > go.mod && echo 'go 1.21.13' >> go.mod && echo 'replace barrister2-go-runtime/barrister2 => ./barrister2' >> go.mod && cd tests && go test -v; TEST_RESULT=\$$?; cd .. && rm -f go.mod; exit \$$TEST_RESULT"

# Test generator integration (requires Docker)
test-integration:
	@echo "Testing Go generator integration..."
	@DOCKER_AVAILABLE=$$(command -v docker >/dev/null 2>&1 && echo "yes" || echo "no"); \
	if [ "$$DOCKER_AVAILABLE" != "yes" ]; then \
		echo "Error: Docker is required for integration tests"; \
		exit 1; \
	fi
	@cd ../../../.. && $(MAKE) build-linux && docker run --rm \
		-v $$(pwd):/workspace \
		-w /workspace \
		-e GOTOOLCHAIN=auto \
		$(GO_IMAGE) \
		sh -c "bash tests/integration/test_generator_go.sh"

# Clean build artifacts
clean:
	go clean ./...
	find . -name "*.test" -delete 2>/dev/null || true

