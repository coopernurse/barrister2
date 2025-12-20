.PHONY: test test-docker test-integration clean

# Variables
CSHARP_IMAGE=mcr.microsoft.com/dotnet/sdk:8.0
DOCKER_AVAILABLE := $(shell command -v docker >/dev/null 2>&1 && echo "yes" || echo "no")

# Test using local .NET if available, otherwise Docker
test:
ifeq ($(DOCKER_AVAILABLE),yes)
	@echo "Using Docker for testing..."
	@$(MAKE) test-docker
else
	@echo "Using local .NET for testing..."
	@dotnet test tests/barrister2.Tests.csproj
endif

# Test using Docker
test-docker:
	@echo "Testing C# runtime in Docker..."
	@docker run --rm -v $(PWD):/workspace -w /workspace \
		$(CSHARP_IMAGE) \
		/bin/bash -c "dotnet test tests/barrister2.Tests.csproj"

# Test generator integration (requires Docker)
test-integration:
	@echo "Testing C# generator integration..."
	@DOCKER_AVAILABLE=$$(command -v docker >/dev/null 2>&1 && echo "yes" || echo "no"); \
	if [ "$$DOCKER_AVAILABLE" != "yes" ]; then \
		echo "Error: Docker is required for integration tests"; \
		exit 1; \
	fi
	@cd ../../../.. && $(MAKE) build-linux && docker run --rm \
		-v $$(pwd):/workspace \
		-w /workspace \
		-e GOTOOLCHAIN=auto \
		golang:1.23 \
		/bin/bash -c "apt-get update -qq && apt-get install -y -qq wget curl >/dev/null 2>&1 && wget https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb -O /tmp/packages-microsoft-prod.deb >/dev/null 2>&1 && dpkg -i /tmp/packages-microsoft-prod.deb >/dev/null 2>&1 && apt-get update -qq >/dev/null 2>&1 && apt-get install -y -qq dotnet-sdk-8.0 >/dev/null 2>&1 && bash tests/integration/test_generator_csharp.sh"

# Clean build artifacts
clean:
	find . -type d -name bin -exec rm -r {} + 2>/dev/null || true
	find . -type d -name obj -exec rm -r {} + 2>/dev/null || true

