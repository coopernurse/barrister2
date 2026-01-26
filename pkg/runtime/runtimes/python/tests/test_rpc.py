"""Tests for RPC error handling"""

import pytest
from pulserpc import RPCError


def test_rpc_error_creation():
    """Test creating an RPCError"""
    error = RPCError(-32603, "Internal error", {"detail": "Something went wrong"})
    assert error.code == -32603
    assert error.message == "Internal error"
    assert error.data == {"detail": "Something went wrong"}


def test_rpc_error_without_data():
    """Test creating an RPCError without data"""
    error = RPCError(-32600, "Invalid Request")
    assert error.code == -32600
    assert error.message == "Invalid Request"
    assert error.data is None


def test_rpc_error_string_representation():
    """Test RPCError string representation"""
    error = RPCError(-32601, "Method not found")
    assert "RPCError" in str(error)
    assert "-32601" in str(error)
    assert "Method not found" in str(error)

