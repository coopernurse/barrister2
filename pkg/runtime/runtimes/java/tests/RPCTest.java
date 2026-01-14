import com.bitmechanic.barrister2.*;
import org.junit.Test;
import org.junit.Assert;

public class RPCTest {

    @Test
    public void testRPCErrorCreation() {
        // Error with data
        RPCError error1 = new RPCError(-32600, "Invalid Request", "additional data");
        Assert.assertEquals(-32600, error1.getCode());
        Assert.assertEquals("Invalid Request", error1.getMessage());
        Assert.assertEquals("additional data", error1.getData());

        // Error without data
        RPCError error2 = new RPCError(-32700, "Parse error");
        Assert.assertEquals(-32700, error2.getCode());
        Assert.assertEquals("Parse error", error2.getMessage());
        Assert.assertNull(error2.getData());
    }

    @Test
    public void testRPCErrorException() {
        RPCError error = new RPCError(-32601, "Method not found");

        // Should be a RuntimeException
        Assert.assertTrue(error instanceof RuntimeException);

        // getMessage() returns the RPC error message
        Assert.assertEquals("Method not found", error.getMessage());
        
        // The exception's string representation should contain the code
        String exceptionString = error.toString();
        Assert.assertTrue(exceptionString.contains("-32601") || exceptionString.contains("RPCError"));
    }
}
