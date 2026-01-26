using System;

namespace PulseRPC
{
    /// <summary>
    /// Exception class for JSON-RPC 2.0 errors
    /// </summary>
    public class RPCError : Exception
    {
        /// <summary>
        /// JSON-RPC error code
        /// </summary>
        public int Code { get; }

        /// <summary>
        /// Error message
        /// </summary>
        public new string Message { get; }

        /// <summary>
        /// Optional error data
        /// </summary>
        public new object? Data { get; }

        /// <summary>
        /// Creates a new RPCError instance
        /// </summary>
        public RPCError(int code, string message, object? data = null)
            : base($"RPCError {code}: {message}")
        {
            Code = code;
            Message = message;
            Data = data;
        }
    }
}

