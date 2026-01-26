#!/usr/bin/env bash
set -euo pipefail

# Integration test: generate Java project and compile with Maven

tmpdir=$(mktemp -d /tmp/pulserpc-java-XXXX)
cleanup() { rm -rf "$tmpdir"; }
trap cleanup EXIT

echo "Generating Java project in $tmpdir"

# Use the CLI to generate Java code for examples/book.idl
go run ./cmd/pulserpc --plugin java-client-server -dir "$tmpdir" -base-package com.example -json-lib jackson -generate-test-files=true examples/book.idl

echo "Running mvn package in $tmpdir"
pushd "$tmpdir" > /dev/null

# Run Maven package (skip tests)
mvn -q -DskipTests package

echo "Maven build succeeded"
popd > /dev/null

exit 0
