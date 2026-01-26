package main

import (
	"testing"

	"pulserpc-go-runtime/pulserpc"
)

func TestFindStruct(t *testing.T) {
	allStructs := pulserpc.StructMap{
		"TestStruct": pulserpc.StructDef{
			"fields": []interface{}{
				map[string]interface{}{
					"name": "field1",
					"type": map[string]interface{}{"builtIn": "string"},
				},
			},
		},
	}

	structDef := pulserpc.FindStruct("TestStruct", allStructs)
	if structDef == nil {
		t.Error("Expected to find TestStruct")
	}

	notFound := pulserpc.FindStruct("NotFound", allStructs)
	if notFound != nil {
		t.Error("Expected NotFound to return nil")
	}
}

func TestFindEnum(t *testing.T) {
	allEnums := pulserpc.EnumMap{
		"TestEnum": pulserpc.EnumDef{
			"values": []interface{}{
				map[string]interface{}{"name": "VALUE1"},
				map[string]interface{}{"name": "VALUE2"},
			},
		},
	}

	enumDef := pulserpc.FindEnum("TestEnum", allEnums)
	if enumDef == nil {
		t.Error("Expected to find TestEnum")
	}

	// Test qualified name
	enumDef2 := pulserpc.FindEnum("ns.TestEnum", allEnums)
	if enumDef2 == nil {
		t.Error("Expected to find TestEnum via qualified name")
	}

	notFound := pulserpc.FindEnum("NotFound", allEnums)
	if notFound != nil {
		t.Error("Expected NotFound to return nil")
	}
}

func TestGetStructFields(t *testing.T) {
	allStructs := pulserpc.StructMap{
		"Parent": pulserpc.StructDef{
			"fields": []interface{}{
				map[string]interface{}{
					"name": "parentField",
					"type": map[string]interface{}{"builtIn": "string"},
				},
			},
		},
		"Child": pulserpc.StructDef{
			"extends": "Parent",
			"fields": []interface{}{
				map[string]interface{}{
					"name": "childField",
					"type": map[string]interface{}{"builtIn": "int"},
				},
			},
		},
	}

	fields := pulserpc.GetStructFields("Child", allStructs)
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
