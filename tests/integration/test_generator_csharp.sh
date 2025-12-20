#!/bin/bash
# Test harness for C# generator integration tests
# This script generates code, starts a test server, runs client tests, and reports results

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_IDL="$PROJECT_ROOT/examples/conform.idl"
TEST_IDL_INC="$PROJECT_ROOT/examples/conform-inc.idl"
OUTPUT_DIR="/tmp/barrister_test_csharp_$$"
BINARY_PATH="$PROJECT_ROOT/target/barrister-amd64"
SERVER_PORT=8080
SERVER_URL="http://localhost:$SERVER_PORT"
TIMEOUT=30

# Cleanup function
cleanup() {
    echo -e "${YELLOW}Cleaning up...${NC}"
    if [ -n "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
    rm -rf "$OUTPUT_DIR"
}

trap cleanup EXIT

echo -e "${GREEN}=== Barrister C# Generator Integration Test ===${NC}"
echo ""

# Step 1: Build the barrister binary (if needed)
# Prefer using pre-built binary if it exists, otherwise build it
if [ -f "$BINARY_PATH" ] && [ -x "$BINARY_PATH" ]; then
    echo -e "${GREEN}Using pre-built barrister binary at $BINARY_PATH${NC}"
elif command -v go >/dev/null 2>&1; then
    # We're in a container with Go - build the binary
    echo -e "${YELLOW}Building barrister binary in container...${NC}"
    cd "$PROJECT_ROOT"
    go build -o "$BINARY_PATH" cmd/barrister/barrister.go
    if [ ! -f "$BINARY_PATH" ]; then
        echo -e "${RED}ERROR: Failed to build barrister binary${NC}"
        exit 1
    fi
elif [ ! -f "$BINARY_PATH" ]; then
    # No Go and no binary - try to build on host (for local testing)
    echo -e "${YELLOW}Building barrister binary on host...${NC}"
    cd "$PROJECT_ROOT"
    if command -v make >/dev/null 2>&1; then
        make build-linux
    else
        echo -e "${RED}ERROR: Cannot build binary - Go not available and binary doesn't exist${NC}"
        exit 1
    fi
fi

if [ ! -f "$BINARY_PATH" ]; then
    echo -e "${RED}ERROR: Barrister binary not found at $BINARY_PATH${NC}"
    exit 1
fi

# Step 2: Create output directory
echo -e "${YELLOW}Creating output directory: $OUTPUT_DIR${NC}"
mkdir -p "$OUTPUT_DIR"

# Step 3: Generate code with test-server flag
echo -e "${YELLOW}Generating code from $TEST_IDL...${NC}"
if ! "$BINARY_PATH" -plugin csharp-client-server -test-server -dir "$OUTPUT_DIR" "$TEST_IDL"; then
    echo -e "${RED}ERROR: Code generation failed${NC}"
    exit 1
fi

# Verify generated files exist
if [ ! -f "$OUTPUT_DIR/TestServer.cs" ] || [ ! -f "$OUTPUT_DIR/TestClient.cs" ]; then
    echo -e "${RED}ERROR: Test files not generated${NC}"
    ls -la "$OUTPUT_DIR" || true
    exit 1
fi

echo -e "${GREEN}Code generation successful${NC}"
echo ""

# Step 4: Create .csproj file for the test server
echo -e "${YELLOW}Creating TestServer.csproj...${NC}"
cat > "$OUTPUT_DIR/TestServer.csproj" << 'EOF'
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

  <ItemGroup>
    <Compile Remove="TestClient.cs" />
    <Compile Remove="Client.cs" />
  </ItemGroup>

</Project>
EOF

# Step 5: Build the test server
echo -e "${YELLOW}Building test server...${NC}"
cd "$OUTPUT_DIR"
if ! dotnet build TestServer.csproj > build.log 2>&1; then
    echo -e "${RED}ERROR: Failed to build test server${NC}"
    echo "Build log:"
    cat build.log
    exit 1
fi

# Step 6: Start test server in background
echo -e "${YELLOW}Starting test server on port $SERVER_PORT...${NC}"
dotnet run --project TestServer.csproj --no-build > server.log 2>&1 &
SERVER_PID=$!

# Step 7: Wait for server to be ready
echo -e "${YELLOW}Waiting for server to be ready...${NC}"
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $TIMEOUT ]; do
    if curl -s -X POST "$SERVER_URL" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"barrister-idl","id":1}' > /dev/null 2>&1; then
        echo -e "${GREEN}Server is ready${NC}"
        break
    fi
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
done

if [ $WAIT_COUNT -ge $TIMEOUT ]; then
    echo -e "${RED}ERROR: Server did not become ready within $TIMEOUT seconds${NC}"
    echo "Server log:"
    cat server.log
    exit 1
fi

echo ""

# Step 8: Create .csproj file for the test client
echo -e "${YELLOW}Creating TestClient.csproj...${NC}"
cat > "$OUTPUT_DIR/TestClient.csproj" << 'EOF'
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

  <ItemGroup>
    <FrameworkReference Include="Microsoft.AspNetCore.App" />
    <Compile Remove="TestServer.cs" />
    <Compile Remove="Server.cs" />
  </ItemGroup>

</Project>
EOF

# Step 9: Build and run test client
echo -e "${YELLOW}Building and running test client...${NC}"
if dotnet run --project TestClient.csproj "$SERVER_URL"; then
    echo ""
    echo -e "${GREEN}=== All tests passed! ===${NC}"
    exit 0
else
    CLIENT_EXIT_CODE=$?
    echo ""
    echo -e "${RED}=== Tests failed with exit code $CLIENT_EXIT_CODE ===${NC}"
    echo "Server log:"
    cat server.log
    exit $CLIENT_EXIT_CODE
fi

