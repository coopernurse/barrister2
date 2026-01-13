#!/usr/bin/env bash
# Integration test runner for Barrister2 documentation examples
# Tests all language examples to ensure code stays working
#
# Debug mode: Set DEBUG=1 to show all commands as they run
if [ "$DEBUG" = "1" ]; then
    set -x
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
FAILED_LANGUAGES=()

# Function to print colored output
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
print_error() { echo -e "${RED}[FAIL]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Function to wait for server to be ready
wait_for_server() {
    local url=$1
    local max_attempts=20
    local attempt=0

    print_info "Waiting for server at $url..."
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -X POST -H "Content-Type: application/json" -d '{}' "$url" > /dev/null 2>&1; then
            print_success "Server is ready!"
            return 0
        fi
        sleep 0.5
        attempt=$((attempt + 1))
    done
    print_error "Server failed to start within 10 seconds"
    return 1
}

# Function to kill background processes
cleanup() {
    print_info "Cleaning up background processes..."
    jobs -p | xargs -r kill 2>/dev/null || true
    sleep 1
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# ============================================================================
# Python Tests
# ============================================================================
test_python() {
    print_info "Testing Python example..."
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    cd "$DIR/docs/examples/checkout-python"

    # Start server in background
    print_info "Starting Python server..."
    python3 test_server.py > /tmp/python-server.log 2>&1 &
    SERVER_PID=$!

    # Wait for server
    if ! wait_for_server "http://localhost:8080"; then
        print_error "Python server failed to start"
        cat /tmp/python-server.log
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_LANGUAGES+=("Python")
        kill $SERVER_PID 2>/dev/null || true
        cd "$DIR"
        return 1
    fi

    # Run tests
    if python3 test_client.py > /tmp/python-client.log 2>&1; then
        print_success "Python tests passed!"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_error "Python tests failed"
        cat /tmp/python-client.log
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_LANGUAGES+=("Python")
    fi

    # Cleanup
    kill $SERVER_PID 2>/dev/null || true
    sleep 1
    cd "$DIR"
}

# ============================================================================
# Go Tests
# ============================================================================
test_go() {
    print_info "Testing Go example..."
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    cd "$DIR/docs/examples/checkout-go"

    # Build server using build tags to exclude client code
    print_info "Building Go server..."
    go build -tags test_server -o /tmp/test-server . > /tmp/go-build.log 2>&1
    if [ $? -ne 0 ]; then
        print_error "Go server build failed"
        cat /tmp/go-build.log
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_LANGUAGES+=("Go")
        cd "$DIR"
        return 1
    fi

    # Start server in background
    print_info "Starting Go server..."
    /tmp/test-server > /tmp/go-server.log 2>&1 &
    SERVER_PID=$!

    # Wait for server
    if ! wait_for_server "http://localhost:8080"; then
        print_error "Go server failed to start"
        cat /tmp/go-server.log
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_LANGUAGES+=("Go")
        kill $SERVER_PID 2>/dev/null || true
        cd "$DIR"
        return 1
    fi

    # Build client using build tags to exclude server code
    print_info "Building Go client..."
    go build -tags test_client -o /tmp/test-client . > /tmp/go-client-build.log 2>&1
    if /tmp/test-client > /tmp/go-client.log 2>&1; then
        print_success "Go tests passed!"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_error "Go tests failed"
        cat /tmp/go-client.log
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_LANGUAGES+=("Go")
    fi

    # Cleanup
    kill $SERVER_PID 2>/dev/null || true
    sleep 1
    cd "$DIR"
}

# ============================================================================
# Java Tests
# ============================================================================
test_java() {
    print_info "Testing Java example..."
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    cd "$DIR/docs/examples/checkout-java"

    # Check if Maven is available
    if ! command -v mvn &> /dev/null; then
        print_warning "Maven not found, skipping Java tests"
        cd "$DIR"
        return 0
    fi

    # Compile the project first
    print_info "Compiling Java project..."
    if ! mvn compile -q > /tmp/java-compile.log 2>&1; then
        print_error "Java compile failed"
        cat /tmp/java-compile.log
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_LANGUAGES+=("Java")
        cd "$DIR"
        return 1
    fi

    # Start server in background
    print_info "Starting Java server..."
    mvn exec:java -Dexec.mainClass="TestServer" > /tmp/java-server.log 2>&1 &
    SERVER_PID=$!

    # Wait for server
    if ! wait_for_server "http://localhost:8080"; then
        print_error "Java server failed to start"
        echo "=== Java server log ==="
        cat /tmp/java-server.log
        echo "=== End of log ==="
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_LANGUAGES+=("Java")
        kill $SERVER_PID 2>/dev/null || true
        cd "$DIR"
        return 1
    fi

    # Run tests
    if mvn exec:java -Dexec.mainClass="TestClient" > /tmp/java-client.log 2>&1; then
        print_success "Java tests passed!"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_error "Java tests failed"
        cat /tmp/java-client.log
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_LANGUAGES+=("Java")
    fi

    # Cleanup
    kill $SERVER_PID 2>/dev/null || true
    sleep 1
    cd "$DIR"
}

# ============================================================================
# TypeScript Tests
# ============================================================================
test_typescript() {
    print_info "Testing TypeScript example..."
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    cd "$DIR/docs/examples/checkout-typescript"

    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        print_warning "npm not found, skipping TypeScript tests"
        cd "$DIR"
        return 0
    fi

    # Build if needed
    if [ ! -d "dist" ] || [ ! -d "node_modules" ]; then
        print_info "Building TypeScript project..."
        npm install > /tmp/ts-install.log 2>&1
        npm run build > /tmp/ts-build.log 2>&1
    fi

    # Start server in background
    print_info "Starting TypeScript server..."
    node dist/test_server.js > /tmp/ts-server.log 2>&1 &
    SERVER_PID=$!

    # Wait for server
    if ! wait_for_server "http://localhost:8080"; then
        print_error "TypeScript server failed to start"
        cat /tmp/ts-server.log
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_LANGUAGES+=("TypeScript")
        kill $SERVER_PID 2>/dev/null || true
        cd "$DIR"
        return 1
    fi

    # Run tests
    if node dist/test_client.js > /tmp/ts-client.log 2>&1; then
        print_success "TypeScript tests passed!"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_error "TypeScript tests failed"
        cat /tmp/ts-client.log
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_LANGUAGES+=("TypeScript")
    fi

    # Cleanup
    kill $SERVER_PID 2>/dev/null || true
    sleep 1
    cd "$DIR"
}

# ============================================================================
# C# Tests
# ============================================================================
test_csharp() {
    print_info "Testing C# example..."
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    cd "$DIR/docs/examples/checkout-csharp"

    # Check if dotnet is available
    if ! command -v dotnet &> /dev/null; then
        print_warning "dotnet not found, skipping C# tests"
        cd "$DIR"
        return 0
    fi

    # Build server if needed
    if [ ! -d "bin" ]; then
        print_info "Building C# server..."
        if ! dotnet build TestServer.csproj > /tmp/csharp-build.log 2>&1; then
            print_error "C# server build failed"
            echo "=== Build log ==="
            cat /tmp/csharp-build.log
            echo "=== End of log ==="
            FAILED_TESTS=$((FAILED_TESTS + 1))
            FAILED_LANGUAGES+=("C#")
            cd "$DIR"
            return 1
        fi
    else
        print_info "Skipping C# server build (using cached bin/)"
    fi

    # Build client
    print_info "Building C# client..."
    if ! dotnet build TestClient.csproj > /tmp/csharp-client-build.log 2>&1; then
        print_error "C# client build failed"
        echo "=== Client build log ==="
        cat /tmp/csharp-client-build.log
        echo "=== End of log ==="
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_LANGUAGES+=("C#")
        cd "$DIR"
        return 1
    fi

    # Start server in background using the compiled DLL
    print_info "Starting C# server..."
    dotnet bin/Debug/net8.0/TestServer.dll > /tmp/csharp-server.log 2>&1 &
    SERVER_PID=$!

    # Give server a moment to start
    sleep 2

    # Check if process is still running
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        print_error "C# server process died immediately"
        echo "=== Server log ==="
        cat /tmp/csharp-server.log
        echo "=== End of log ==="
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_LANGUAGES+=("C#")
        cd "$DIR"
        return 1
    fi

    # Wait for server
    if ! wait_for_server "http://localhost:8080"; then
        print_error "C# server failed to start"
        echo "=== Server log ==="
        cat /tmp/csharp-server.log
        echo "=== End of log ==="
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_LANGUAGES+=("C#")
        kill $SERVER_PID 2>/dev/null || true
        cd "$DIR"
        return 1
    fi

    # Run tests using compiled DLL
    if dotnet bin/Debug/net8.0/TestClient.dll > /tmp/csharp-client.log 2>&1; then
        print_success "C# tests passed!"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_error "C# tests failed"
        cat /tmp/csharp-client.log
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_LANGUAGES+=("C#")
    fi

    # Cleanup
    pkill -f TestServer.dll 2>/dev/null || true
    sleep 1
    cd "$DIR"
}

# ============================================================================
# Main
# ============================================================================

# Get script directory and workspace root
# SCRIPT_DIR will be docs/examples, DIR will be workspace root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo ""
echo "=================================================="
echo "  Barrister2 Documentation Examples Test Suite"
echo "=================================================="
echo ""

# Parse arguments
TEST_ALL=true
TEST_PYTHON=false
TEST_GO=false
TEST_JAVA=false
TEST_TYPESCRIPT=false
TEST_CSHARP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --python)
            TEST_ALL=false
            TEST_PYTHON=true
            shift
            ;;
        --go)
            TEST_ALL=false
            TEST_GO=true
            shift
            ;;
        --java)
            TEST_ALL=false
            TEST_JAVA=true
            shift
            ;;
        --typescript|--ts)
            TEST_ALL=false
            TEST_TYPESCRIPT=true
            shift
            ;;
        --csharp|--cs)
            TEST_ALL=false
            TEST_CSHARP=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--python] [--go] [--java] [--typescript] [--csharp]"
            exit 1
            ;;
    esac
done

# Run tests
if [ "$TEST_ALL" = true ] || [ "$TEST_PYTHON" = true ]; then
    test_python
fi

if [ "$TEST_ALL" = true ] || [ "$TEST_GO" = true ]; then
    test_go
fi

if [ "$TEST_ALL" = true ] || [ "$TEST_JAVA" = true ]; then
    test_java
fi

if [ "$TEST_ALL" = true ] || [ "$TEST_TYPESCRIPT" = true ]; then
    test_typescript
fi

if [ "$TEST_ALL" = true ] || [ "$TEST_CSHARP" = true ]; then
    test_csharp
fi

# Print summary
echo ""
echo "=================================================="
echo "  Test Summary"
echo "=================================================="
echo "Total tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
    echo ""
    echo "Failed languages:"
    for lang in "${FAILED_LANGUAGES[@]}"; do
        echo -e "  ${RED}✗${NC} $lang"
    done
fi
echo "=================================================="
echo ""

if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
else
    print_success "All tests passed!"
    exit 0
fi
