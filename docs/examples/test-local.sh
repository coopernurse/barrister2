#!/usr/bin/env bash
# Local test runner for Barrister2 documentation examples using Docker
# This allows you to test the examples locally without installing language runtimes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
print_error() { echo -e "${RED}[FAIL]${NC} $1"; }

# Get script directory and workspace root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    echo "Please install Docker to use this test script"
    exit 1
fi

# Parse arguments
LANG_TO_TEST=""
if [ $# -gt 0 ]; then
    LANG_TO_TEST="$1"
fi

# Function to test Python
test_python() {
    print_info "Testing Python with Docker..."
    docker run --rm -v "$DIR/docs/examples/checkout-python:/workspace" \
        -w /workspace python:3.11 \
        bash -c "
            pip install requests 2>&1 > /dev/null
            python3 test_server.py > /tmp/server.log 2>&1 &
            SERVER_PID=\$!
            sleep 2
            if ! kill -0 \$SERVER_PID 2>/dev/null; then
                echo 'Server died:'
                cat /tmp/server.log
                exit 1
            fi
            python3 test_client.py
            kill \$SERVER_PID 2>/dev/null || true
        "
}

# Function to test Go
test_go() {
    print_info "Testing Go with Docker..."
    docker run --rm -v "$DIR/docs/examples/checkout-go:/workspace" \
        -w /workspace golang:1.21 \
        bash -c "
            go build -tags test_server -o /tmp/test-server . 2>&1
            /tmp/test-server > /tmp/server.log 2>&1 &
            SERVER_PID=\$!
            sleep 2
            if ! kill -0 \$SERVER_PID 2>/dev/null; then
                echo 'Server died:'
                cat /tmp/server.log
                exit 1
            fi
            go build -tags test_client -o /tmp/test-client . 2>&1
            /tmp/test-client
            kill \$SERVER_PID 2>/dev/null || true
        "
}

# Function to test Java
test_java() {
    print_info "Testing Java with Docker..."
    docker run --rm -v "$DIR/docs/examples/checkout-java:/workspace" \
        -w /workspace eclipse-temurin:11 \
        bash -c "
            apt-get update -qq && apt-get install -y -qq maven 2>&1 > /dev/null
            mvn compile -q 2>&1 > /dev/null
            JAVA_CP=\"target/classes:\$(mvn dependency:build-classpath -q -DincludeScope=runtime -Dmdep.outputFile=/dev/stdout 2>/dev/null)\"
            java -cp \"\$JAVA_CP\" TestServer > /tmp/server.log 2>&1 &
            SERVER_PID=\$!
            sleep 3
            if ! kill -0 \$SERVER_PID 2>/dev/null; then
                echo 'Server died:'
                cat /tmp/server.log
                exit 1
            fi
            # Health check with proper JSON-RPC request
            for i in {1..10}; do
                if curl -s -X POST -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"method\":\"barrister-idl\",\"id\":1}' http://localhost:8080 > /dev/null 2>&1; then
                    break
                fi
                sleep 0.5
            done
            java -cp \"\$JAVA_CP\" TestClient
            kill \$SERVER_PID 2>/dev/null || true
        "
}

# Function to test TypeScript
test_typescript() {
    print_info "Testing TypeScript with Docker..."
    docker run --rm -v "$DIR/docs/examples/checkout-typescript:/workspace" \
        -w /workspace node:20 \
        bash -c "
            npm install 2>&1 > /dev/null
            npm run build 2>&1 > /dev/null
            node dist/test_server.js > /tmp/server.log 2>&1 &
            SERVER_PID=\$!
            sleep 2
            if ! kill -0 \$SERVER_PID 2>/dev/null; then
                echo 'Server died:'
                cat /tmp/server.log
                exit 1
            fi
            node dist/test_client.js
            kill \$SERVER_PID 2>/dev/null || true
        "
}

# Function to test C#
test_csharp() {
    print_info "Testing C# with Docker..."
    docker run --rm -v "$DIR/docs/examples/checkout-csharp:/workspace" \
        -w /workspace mcr.microsoft.com/dotnet/sdk:8.0 \
        bash -c "
            dotnet build TestServer.csproj 2>&1 > /dev/null
            dotnet build TestClient.csproj 2>&1 > /dev/null
            dotnet bin/Debug/net8.0/TestServer.dll > /tmp/server.log 2>&1 &
            SERVER_PID=\$!
            sleep 3
            if ! kill -0 \$SERVER_PID 2>/dev/null; then
                echo 'Server died:'
                cat /tmp/server.log
                exit 1
            fi
            # Health check
            for i in {1..10}; do
                if curl -s -X POST -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"method\":\"barrister-idl\",\"id\":1}' http://localhost:8080 > /dev/null 2>&1; then
                    break
                fi
                sleep 0.5
            done
            dotnet bin/Debug/net8.0/TestClient.dll
            kill \$SERVER_PID 2>/dev/null || true
        "
}

# Function to test a single language
test_language() {
    local lang=$1
    local lang_lower=$(echo "$lang" | tr '[:upper:]' '[:lower:]')

    case "$lang_lower" in
        python) test_python ;;
        go) test_go ;;
        java) test_java ;;
        typescript|ts) test_typescript ;;
        csharp|cs) test_csharp ;;
        *)
            print_error "Unknown language: $lang"
            echo "Usage: $0 [python|go|java|typescript|csharp]"
            exit 1
            ;;
    esac
}

# Main
echo ""
echo "=================================================="
echo "  Barrister2 Local Test Runner (Docker)"
echo "=================================================="
echo ""

if [ -n "$LANG_TO_TEST" ]; then
    # Test single language
    if test_language "$LANG_TO_TEST"; then
        print_success "$LANG_TO_TEST tests passed!"
        exit 0
    else
        print_error "$LANG_TO_TEST tests failed!"
        exit 1
    fi
else
    # Test all languages
    FAILED=0
    for lang in python go java typescript csharp; do
        if ! test_language "$lang"; then
            FAILED=1
        fi
    done

    echo ""
    if [ $FAILED -eq 0 ]; then
        print_success "All tests passed!"
        exit 0
    else
        print_error "Some tests failed"
        exit 1
    fi
fi
