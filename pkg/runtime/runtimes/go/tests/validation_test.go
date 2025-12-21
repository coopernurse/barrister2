package tests

import (
	"testing"

	"github.com/coopernurse/barrister2/pkg/runtime/runtimes/go/barrister2"
)

func TestValidateString(t *testing.T) {
	if err := barrister2.ValidateString("test"); err != nil {
		t.Errorf("Expected nil error for string, got %v", err)
	}

	if err := barrister2.ValidateString(123); err == nil {
		t.Error("Expected error for non-string value")
	}
}

func TestValidateInt(t *testing.T) {
	if err := barrister2.ValidateInt(123); err != nil {
		t.Errorf("Expected nil error for int, got %v", err)
	}

	// JSON numbers are decoded as float64, so we accept them
	if err := barrister2.ValidateInt(123.0); err != nil {
		t.Errorf("Expected nil error for float64 representing int, got %v", err)
	}

	if err := barrister2.ValidateInt("123"); err == nil {
		t.Error("Expected error for non-int value")
	}
}

func TestValidateFloat(t *testing.T) {
	if err := barrister2.ValidateFloat(123.45); err != nil {
		t.Errorf("Expected nil error for float64, got %v", err)
	}

	if err := barrister2.ValidateFloat(123); err != nil {
		t.Errorf("Expected nil error for int, got %v", err)
	}

	if err := barrister2.ValidateFloat("123.45"); err == nil {
		t.Error("Expected error for non-float value")
	}
}

func TestValidateBool(t *testing.T) {
	if err := barrister2.ValidateBool(true); err != nil {
		t.Errorf("Expected nil error for bool, got %v", err)
	}

	if err := barrister2.ValidateBool(false); err != nil {
		t.Errorf("Expected nil error for bool, got %v", err)
	}

	if err := barrister2.ValidateBool("true"); err == nil {
		t.Error("Expected error for non-bool value")
	}
}

func TestValidateArray(t *testing.T) {
	typeDef := map[string]interface{}{
		"builtIn": "string",
	}
	allStructs := barrister2.StructMap{}
	allEnums := barrister2.EnumMap{}

	elementValidator := func(v interface{}) error {
		return barrister2.ValidateType(v, typeDef, allStructs, allEnums, false)
	}

	arr := []interface{}{"a", "b", "c"}
	if err := barrister2.ValidateArray(arr, elementValidator); err != nil {
		t.Errorf("Expected nil error for valid array, got %v", err)
	}

	invalidArr := []interface{}{"a", 123, "c"}
	if err := barrister2.ValidateArray(invalidArr, elementValidator); err == nil {
		t.Error("Expected error for invalid array element")
	}

	if err := barrister2.ValidateArray("not an array", elementValidator); err == nil {
		t.Error("Expected error for non-array value")
	}
}

func TestValidateMap(t *testing.T) {
	typeDef := map[string]interface{}{
		"builtIn": "int",
	}
	allStructs := barrister2.StructMap{}
	allEnums := barrister2.EnumMap{}

	valueValidator := func(v interface{}) error {
		return barrister2.ValidateType(v, typeDef, allStructs, allEnums, false)
	}

	m := map[string]interface{}{
		"key1": 1,
		"key2": 2,
	}
	if err := barrister2.ValidateMap(m, valueValidator); err != nil {
		t.Errorf("Expected nil error for valid map, got %v", err)
	}

	invalidMap := map[string]interface{}{
		"key1": "not an int",
	}
	if err := barrister2.ValidateMap(invalidMap, valueValidator); err == nil {
		t.Error("Expected error for invalid map value")
	}

	if err := barrister2.ValidateMap("not a map", valueValidator); err == nil {
		t.Error("Expected error for non-map value")
	}
}

func TestValidateEnum(t *testing.T) {
	allowedValues := []string{"VALUE1", "VALUE2", "VALUE3"}

	if err := barrister2.ValidateEnum("VALUE1", "TestEnum", allowedValues); err != nil {
		t.Errorf("Expected nil error for valid enum value, got %v", err)
	}

	if err := barrister2.ValidateEnum("INVALID", "TestEnum", allowedValues); err == nil {
		t.Error("Expected error for invalid enum value")
	}

	if err := barrister2.ValidateEnum(123, "TestEnum", allowedValues); err == nil {
		t.Error("Expected error for non-string enum value")
	}
}

func TestValidateStruct(t *testing.T) {
	allStructs := barrister2.StructMap{
		"TestStruct": barrister2.StructDef{
			"fields": []interface{}{
				map[string]interface{}{
					"name": "field1",
					"type": map[string]interface{}{"builtIn": "string"},
				},
				map[string]interface{}{
					"name":     "field2",
					"type":     map[string]interface{}{"builtIn": "int"},
					"optional": true,
				},
			},
		},
	}
	allEnums := barrister2.EnumMap{}

	structDef := allStructs["TestStruct"]
	value := map[string]interface{}{
		"field1": "test",
		"field2": 123,
	}

	if err := barrister2.ValidateStruct(value, "TestStruct", structDef, allStructs, allEnums); err != nil {
		t.Errorf("Expected nil error for valid struct, got %v", err)
	}

	// Missing required field
	invalidValue := map[string]interface{}{
		"field2": 123,
	}
	if err := barrister2.ValidateStruct(invalidValue, "TestStruct", structDef, allStructs, allEnums); err == nil {
		t.Error("Expected error for missing required field")
	}

	// Invalid field type
	invalidTypeValue := map[string]interface{}{
		"field1": 123, // should be string
	}
	if err := barrister2.ValidateStruct(invalidTypeValue, "TestStruct", structDef, allStructs, allEnums); err == nil {
		t.Error("Expected error for invalid field type")
	}
}

func TestValidateType(t *testing.T) {
	allStructs := barrister2.StructMap{
		"TestStruct": barrister2.StructDef{
			"fields": []interface{}{
				map[string]interface{}{
					"name": "field1",
					"type": map[string]interface{}{"builtIn": "string"},
				},
			},
		},
	}
	allEnums := barrister2.EnumMap{
		"TestEnum": barrister2.EnumDef{
			"values": []interface{}{
				map[string]interface{}{"name": "VALUE1"},
			},
		},
	}

	// Test built-in types
	stringType := map[string]interface{}{"builtIn": "string"}
	if err := barrister2.ValidateType("test", stringType, allStructs, allEnums, false); err != nil {
		t.Errorf("Expected nil error for string, got %v", err)
	}

	// Test optional
	if err := barrister2.ValidateType(nil, stringType, allStructs, allEnums, true); err != nil {
		t.Errorf("Expected nil error for optional nil, got %v", err)
	}

	// Test array
	arrayType := map[string]interface{}{
		"array": map[string]interface{}{"builtIn": "string"},
	}
	if err := barrister2.ValidateType([]interface{}{"a", "b"}, arrayType, allStructs, allEnums, false); err != nil {
		t.Errorf("Expected nil error for array, got %v", err)
	}

	// Test map
	mapType := map[string]interface{}{
		"mapValue": map[string]interface{}{"builtIn": "int"},
	}
	if err := barrister2.ValidateType(map[string]interface{}{"key": 1}, mapType, allStructs, allEnums, false); err != nil {
		t.Errorf("Expected nil error for map, got %v", err)
	}

	// Test struct
	structType := map[string]interface{}{
		"userDefined": "TestStruct",
	}
	structValue := map[string]interface{}{
		"field1": "test",
	}
	if err := barrister2.ValidateType(structValue, structType, allStructs, allEnums, false); err != nil {
		t.Errorf("Expected nil error for struct, got %v", err)
	}

	// Test enum
	enumType := map[string]interface{}{
		"userDefined": "TestEnum",
	}
	if err := barrister2.ValidateType("VALUE1", enumType, allStructs, allEnums, false); err != nil {
		t.Errorf("Expected nil error for enum, got %v", err)
	}
}

