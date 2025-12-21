package tests

import (
	"testing"

	"github.com/coopernurse/barrister2/pkg/runtime/runtimes/go/barrister2"
)

func TestFindStruct(t *testing.T) {
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

	structDef := barrister2.FindStruct("TestStruct", allStructs)
	if structDef == nil {
		t.Error("Expected to find TestStruct")
	}

	notFound := barrister2.FindStruct("NotFound", allStructs)
	if notFound != nil {
		t.Error("Expected NotFound to return nil")
	}
}

func TestFindEnum(t *testing.T) {
	allEnums := barrister2.EnumMap{
		"TestEnum": barrister2.EnumDef{
			"values": []interface{}{
				map[string]interface{}{"name": "VALUE1"},
				map[string]interface{}{"name": "VALUE2"},
			},
		},
	}

	enumDef := barrister2.FindEnum("TestEnum", allEnums)
	if enumDef == nil {
		t.Error("Expected to find TestEnum")
	}

	// Test qualified name
	enumDef2 := barrister2.FindEnum("ns.TestEnum", allEnums)
	if enumDef2 == nil {
		t.Error("Expected to find TestEnum via qualified name")
	}

	notFound := barrister2.FindEnum("NotFound", allEnums)
	if notFound != nil {
		t.Error("Expected NotFound to return nil")
	}
}

func TestGetStructFields(t *testing.T) {
	allStructs := barrister2.StructMap{
		"Parent": barrister2.StructDef{
			"fields": []interface{}{
				map[string]interface{}{
					"name": "parentField",
					"type": map[string]interface{}{"builtIn": "string"},
				},
			},
		},
		"Child": barrister2.StructDef{
			"extends": "Parent",
			"fields": []interface{}{
				map[string]interface{}{
					"name": "childField",
					"type": map[string]interface{}{"builtIn": "int"},
				},
			},
		},
	}

	fields := barrister2.GetStructFields("Child", allStructs)
	if len(fields) != 2 {
		t.Errorf("Expected 2 fields (parent + child), got %d", len(fields))
	}

	// Check parent field
	if fields[0]["name"] != "parentField" && fields[1]["name"] != "parentField" {
		t.Error("Expected to find parentField in fields")
	}

	// Check child field
	if fields[0]["name"] != "childField" && fields[1]["name"] != "childField" {
		t.Error("Expected to find childField in fields")
	}
}

