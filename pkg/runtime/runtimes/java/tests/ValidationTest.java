import barrister2.*;
import org.junit.Test;
import org.junit.Assert;
import java.util.*;

public class ValidationTest {

    @Test
    public void testValidateString() {
        // Valid string
        Validation.validateString("hello");

        // Invalid - null
        try {
            Validation.validateString(null);
            Assert.fail("Expected IllegalArgumentException");
        } catch (IllegalArgumentException e) {
            Assert.assertTrue(e.getMessage().contains("Expected string"));
        }

        // Invalid - integer
        try {
            Validation.validateString(123);
            Assert.fail("Expected IllegalArgumentException");
        } catch (IllegalArgumentException e) {
            Assert.assertTrue(e.getMessage().contains("Expected string"));
        }
    }

    @Test
    public void testValidateInt() {
        // Valid int
        Validation.validateInt(42);

        // Invalid - string
        try {
            Validation.validateInt("not an int");
            Assert.fail("Expected IllegalArgumentException");
        } catch (IllegalArgumentException e) {
            Assert.assertTrue(e.getMessage().contains("Expected int"));
        }
    }

    @Test
    public void testValidateBool() {
        // Valid boolean
        Validation.validateBool(true);
        Validation.validateBool(false);

        // Invalid - string
        try {
            Validation.validateBool("true");
            Assert.fail("Expected IllegalArgumentException");
        } catch (IllegalArgumentException e) {
            Assert.assertTrue(e.getMessage().contains("Expected bool"));
        }
    }

    @Test
    public void testValidateArray() {
        List<String> stringArray = Arrays.asList("a", "b", "c");

        // Valid array of strings
        Validation.validateArray(stringArray, Validation::validateString);

        // Invalid - element validation fails
        List<Object> mixedArray = Arrays.asList("a", 123, "c");
        try {
            Validation.validateArray(mixedArray, Validation::validateString);
            Assert.fail("Expected IllegalArgumentException");
        } catch (IllegalArgumentException e) {
            Assert.assertTrue(e.getMessage().contains("validation failed"));
        }
    }

    @Test
    public void testValidateMap() {
        Map<String, String> stringMap = new HashMap<>();
        stringMap.put("key1", "value1");
        stringMap.put("key2", "value2");

        // Valid map of strings
        Validation.validateMap(stringMap, Validation::validateString);

        // Invalid - value validation fails
        Map<String, Object> mixedMap = new HashMap<>();
        mixedMap.put("key1", "value1");
        mixedMap.put("key2", 123);
        try {
            Validation.validateMap(mixedMap, Validation::validateString);
            Assert.fail("Expected IllegalArgumentException");
        } catch (IllegalArgumentException e) {
            Assert.assertTrue(e.getMessage().contains("validation failed"));
        }
    }

    @Test
    public void testValidateEnum() {
        List<String> allowedValues = Arrays.asList("RED", "GREEN", "BLUE");

        // Valid enum value
        Validation.validateEnum("RED", "Color", allowedValues);

        // Invalid - not in allowed values
        try {
            Validation.validateEnum("YELLOW", "Color", allowedValues);
            Assert.fail("Expected IllegalArgumentException");
        } catch (IllegalArgumentException e) {
            Assert.assertTrue(e.getMessage().contains("Invalid value"));
        }

        // Invalid - not a string
        try {
            Validation.validateEnum(123, "Color", allowedValues);
            Assert.fail("Expected IllegalArgumentException");
        } catch (IllegalArgumentException e) {
            Assert.assertTrue(e.getMessage().contains("Expected string"));
        }
    }
}
