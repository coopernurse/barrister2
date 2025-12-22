import barrister2.*;
import org.junit.Test;
import org.junit.Assert;
import java.util.*;

public class TypesTest {

    @Test
    public void testFindStruct() {
        Map<String, Map<String, Object>> allStructs = new HashMap<>();

        Map<String, Object> personStruct = new HashMap<>();
        personStruct.put("fields", Arrays.asList(
            Map.of("name", "name", "type", Map.of("builtIn", "string")),
            Map.of("name", "age", "type", Map.of("builtIn", "int"))
        ));
        allStructs.put("Person", personStruct);

        // Found
        Map<String, Object> result = Types.findStruct("Person", allStructs);
        Assert.assertNotNull(result);
        Assert.assertEquals(personStruct, result);

        // Not found
        Map<String, Object> notFound = Types.findStruct("NonExistent", allStructs);
        Assert.assertNull(notFound);
    }

    @Test
    public void testFindEnum() {
        Map<String, Map<String, Object>> allEnums = new HashMap<>();

        Map<String, Object> colorEnum = new HashMap<>();
        colorEnum.put("values", Arrays.asList(
            Map.of("name", "RED"),
            Map.of("name", "GREEN"),
            Map.of("name", "BLUE")
        ));
        allEnums.put("Color", colorEnum);

        // Found
        Map<String, Object> result = Types.findEnum("Color", allEnums);
        Assert.assertNotNull(result);
        Assert.assertEquals(colorEnum, result);

        // Not found
        Map<String, Object> notFound = Types.findEnum("NonExistent", allEnums);
        Assert.assertNull(notFound);
    }

    @Test
    public void testGetStructFields() {
        Map<String, Map<String, Object>> allStructs = new HashMap<>();

        // Base struct
        Map<String, Object> baseStruct = new HashMap<>();
        baseStruct.put("fields", Arrays.asList(
            Map.of("name", "id", "type", Map.of("builtIn", "int"))
        ));
        allStructs.put("Base", baseStruct);

        // Derived struct
        Map<String, Object> derivedStruct = new HashMap<>();
        derivedStruct.put("extends", "Base");
        derivedStruct.put("fields", Arrays.asList(
            Map.of("name", "name", "type", Map.of("builtIn", "string"))
        ));
        allStructs.put("Person", derivedStruct);

        List<Map<String, Object>> fields = Types.getStructFields("Person", allStructs);

        // Should have fields from both base and derived class
        Assert.assertEquals(2, fields.size());

        // Check field names (order may vary due to inheritance resolution)
        Set<String> fieldNames = new HashSet<>();
        for (Map<String, Object> field : fields) {
            fieldNames.add((String) field.get("name"));
        }
        Assert.assertTrue(fieldNames.contains("id"));
        Assert.assertTrue(fieldNames.contains("name"));
    }
}
