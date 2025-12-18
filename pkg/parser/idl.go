package parser

import (
	"github.com/alecthomas/participle/v2/lexer"
)

// IDL represents the root structure containing all parsed IDL elements
type IDL struct {
	Interfaces []*Interface
	Structs    []*Struct
	Enums      []*Enum
}

// Interface represents a service interface with methods
type Interface struct {
	Pos       lexer.Position
	Name      string
	Namespace string
	Methods   []*Method
}

// Method represents an interface method with parameters and return type
type Method struct {
	Pos        lexer.Position
	Name       string
	Parameters []*Parameter
	ReturnType *Type
}

// Parameter represents a method parameter
type Parameter struct {
	Pos  lexer.Position
	Name string
	Type *Type
}

// Struct represents a struct definition with fields and optional extends
type Struct struct {
	Pos       lexer.Position
	Name      string
	Namespace string
	Extends   string // Empty if no extends, can be qualified (e.g., "inc.Response")
	Fields    []*Field
}

// Field represents a struct field with type, optional flag, and comments
type Field struct {
	Pos      lexer.Position
	Name     string
	Type     *Type
	Optional bool
}

// Enum represents an enum definition with values
type Enum struct {
	Pos       lexer.Position
	Name      string
	Namespace string
	Values    []string
}

// Type represents a type (built-in, array, map, or user-defined)
type Type struct {
	Pos lexer.Position

	// For built-in types: string, int, float, bool
	BuiltIn string

	// For arrays: []Type
	Array *Type

	// For maps: map[string]ValueType
	MapValue *Type

	// For user-defined types (interfaces, structs, enums)
	UserDefined string
}

// IsBuiltIn returns true if this is a built-in type
func (t *Type) IsBuiltIn() bool {
	return t.BuiltIn != ""
}

// IsArray returns true if this is an array type
func (t *Type) IsArray() bool {
	return t.Array != nil
}

// IsMap returns true if this is a map type
func (t *Type) IsMap() bool {
	return t.MapValue != nil
}

// IsUserDefined returns true if this is a user-defined type
func (t *Type) IsUserDefined() bool {
	return t.UserDefined != ""
}

// String returns a string representation of the type
func (t *Type) String() string {
	if t.IsBuiltIn() {
		return t.BuiltIn
	}
	if t.IsArray() {
		return "[]" + t.Array.String()
	}
	if t.IsMap() {
		return "map[string]" + t.MapValue.String()
	}
	if t.IsUserDefined() {
		return t.UserDefined
	}
	return "unknown"
}

