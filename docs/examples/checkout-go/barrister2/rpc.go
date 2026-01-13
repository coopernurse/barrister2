package barrister2

import "fmt"

// RPCError represents a JSON-RPC 2.0 error
type RPCError struct {
	Code    int
	Message string
	Data    interface{}
}

// Error implements the error interface
func (e *RPCError) Error() string {
	if e.Data != nil {
		return fmt.Sprintf("RPCError %d: %s (data: %v)", e.Code, e.Message, e.Data)
	}
	return fmt.Sprintf("RPCError %d: %s", e.Code, e.Message)
}

