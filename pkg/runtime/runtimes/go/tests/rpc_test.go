package tests

import (
	"testing"

	"github.com/coopernurse/barrister2/pkg/runtime/runtimes/go/barrister2"
)

func TestRPCError(t *testing.T) {
	err := &barrister2.RPCError{
		Code:    -32603,
		Message: "Internal error",
		Data:    nil,
	}

	if err.Error() == "" {
		t.Error("RPCError.Error() should return non-empty string")
	}

	if err.Code != -32603 {
		t.Errorf("Expected Code -32603, got %d", err.Code)
	}

	if err.Message != "Internal error" {
		t.Errorf("Expected Message 'Internal error', got '%s'", err.Message)
	}

	// Test with data
	errWithData := &barrister2.RPCError{
		Code:    -32602,
		Message: "Invalid params",
		Data:    "test data",
	}

	if errWithData.Data != "test data" {
		t.Errorf("Expected Data 'test data', got '%v'", errWithData.Data)
	}
}

