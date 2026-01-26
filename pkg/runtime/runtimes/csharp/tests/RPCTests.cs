using System.Collections.Generic;
using Xunit;
using PulseRPC;

namespace PulseRPC.Tests
{
    public class RPCTests
    {
        [Fact]
        public void RPCError_Creation()
        {
            var error = new RPCError(-32603, "Internal error", new Dictionary<string, string> { { "detail", "Something went wrong" } });
            Assert.Equal(-32603, error.Code);
            Assert.Equal("Internal error", error.Message);
            Assert.NotNull(error.Data);
        }

        [Fact]
        public void RPCError_WithoutData()
        {
            var error = new RPCError(-32600, "Invalid Request");
            Assert.Equal(-32600, error.Code);
            Assert.Equal("Invalid Request", error.Message);
            Assert.Null(error.Data);
        }

        [Fact]
        public void RPCError_StringRepresentation()
        {
            var error = new RPCError(-32601, "Method not found");
            var str = error.ToString();
            Assert.Contains("RPCError", str);
            Assert.Contains("-32601", str);
            Assert.Contains("Method not found", str);
        }
    }
}

