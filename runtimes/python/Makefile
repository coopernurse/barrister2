.PHONY: test test-docker install clean

# Variables
PYTHON_IMAGE=python:3.11-slim
DOCKER_AVAILABLE := $(shell command -v docker >/dev/null 2>&1 && echo "yes" || echo "no")

# Test using local Python if available, otherwise Docker
test:
ifeq ($(DOCKER_AVAILABLE),yes)
	@echo "Using Docker for testing..."
	@$(MAKE) test-docker
else
	@echo "Using local Python for testing..."
	@python3 -m pytest tests/ -v
endif

# Test using Docker
test-docker:
	@echo "Testing Python runtime in Docker..."
	@docker run --rm -v $(PWD):/workspace -w /workspace \
		$(PYTHON_IMAGE) \
		/bin/bash -c "pip install -q pytest && python -m pytest tests/ -v"

# Install runtime in development mode
install:
	pip install -e .

# Clean Python cache files
clean:
	find . -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -r {} + 2>/dev/null || true


