# Java Runtime Tests
# Requires: openjdk-17-jdk (or similar), maven

.PHONY: test clean

# Test target - run all tests
test: test-validation test-types test-rpc test-json

# Test individual components
test-validation:
	@echo "Testing Java Validation..."
	@mvn clean test -Dtest=ValidationTest

test-types:
	@echo "Testing Java Types..."
	@mvn clean test -Dtest=TypesTest

test-rpc:
	@echo "Testing Java RPC..."
	@mvn clean test -Dtest=RPCTest

test-json:
	@echo "Testing Java JSON parsers..."
	@mvn clean test -Dtest=JsonParserTest

# Integration test - requires generated test server
test-integration:
	@echo "Running Java integration test..."
	# Build and start test server
	@mvn compile exec:java -Dexec.mainClass="TestServer" &
	@sleep 2
	# Run test client
	@mvn compile exec:java -Dexec.mainClass="TestClient"
	# Cleanup
	@pkill -f TestServer || true

# Clean target
clean:
	@mvn clean
	@rm -rf target/
	@rm -f *.class
