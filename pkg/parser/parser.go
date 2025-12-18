package parser

import (
	"fmt"

	"github.com/alecthomas/participle/v2"
	"github.com/alecthomas/participle/v2/lexer"
)

var (
	idlLexer = lexer.MustSimple([]lexer.SimpleRule{
		{"Comment", `//[^\n]*`},
		{"Whitespace", `[ \t\r\n]+`},
		{"Optional", `\[optional\]`},
		{"Interface", `interface`},
		{"Struct", `struct`},
		{"Enum", `enum`},
		{"Extends", `extends`},
		{"Map", `map`},
		{"String", `string`},
		{"Float", `float`},
		{"Bool", `bool`},
		{"Int", `int`},
		{"Ident", `[a-zA-Z][a-zA-Z0-9_]*`},
		{"Punct", `[{}[\]();,]`},
	})

	typeParser = participle.MustBuild[TypeExpr](
		participle.Lexer(idlLexer),
		participle.Elide("Whitespace", "Comment"),
		participle.UseLookahead(2),
	)

	parser = participle.MustBuild[IDLFile](
		participle.Lexer(idlLexer),
		participle.Elide("Whitespace", "Comment"),
		participle.UseLookahead(2),
	)
)

// IDLFile is the root grammar structure
type IDLFile struct {
	Pos      lexer.Position
	Elements []*IDLElement `parser:"@@*"`
}

// IDLElement represents any top-level IDL element
type IDLElement struct {
	Pos       lexer.Position
	Interface *InterfaceDef `parser:"  'interface' @@"`
	Struct    *StructDef     `parser:"| 'struct' @@"`
	Enum      *EnumDef       `parser:"| 'enum' @@"`
}

// InterfaceDef represents an interface definition
type InterfaceDef struct {
	Pos     lexer.Position
	Name    string       `parser:"@Ident '{'"`
	Methods []*MethodDef `parser:"@@* '}'"`
}

// MethodDef represents a method definition
type MethodDef struct {
	Pos        lexer.Position
	Name       string          `parser:"@Ident '('"`
	Parameters []*ParameterDef `parser:"( @@ (',' @@)* )? ')'"`
	ReturnType *TypeExpr       `parser:"@@"`
}

// ParameterDef represents a parameter definition
type ParameterDef struct {
	Pos  lexer.Position
	Name string   `parser:"@Ident"`
	Type *TypeExpr `parser:"@@"`
}

// StructDef represents a struct definition
type StructDef struct {
	Pos     lexer.Position
	Name    string      `parser:"@Ident"`
	Extends *string     `parser:"( 'extends' @Ident )?"`
	Fields  []*FieldDef `parser:"'{' @@* '}'"`
}

// FieldDef represents a field definition
type FieldDef struct {
	Pos      lexer.Position
	Name     string    `parser:"@Ident"`
	Type     *TypeExpr `parser:"@@"`
	Optional bool      `parser:"( @Optional )?"`
}

// EnumDef represents an enum definition
type EnumDef struct {
	Pos    lexer.Position
	Name   string   `parser:"@Ident '{'"`
	Values []string `parser:"@Ident* '}'"`
}

// TypeExpr represents a type expression
type TypeExpr struct {
	Pos         lexer.Position
	BuiltIn     *string        `parser:"( @String | @Int | @Float | @Bool )"`
	Array       *ArrayType     `parser:"| @@"`
	MapType     *MapTypeExpr   `parser:"| @@"`
	UserDefined *string        `parser:"| @Ident"`
}

// ArrayType represents []Type - we'll parse element type separately to avoid recursion
type ArrayType struct {
	Pos         lexer.Position
	// Store raw tokens for element type, will parse in post-processing
	ElementTypeRaw string `parser:"'[' ']' @(String|Int|Float|Bool|Ident)"`
}

// MapTypeExpr represents map[string]ValueType - we'll parse value type separately  
type MapTypeExpr struct {
	Pos        lexer.Position
	// Store raw token for value type, will parse in post-processing
	ValueTypeRaw string `parser:"@Map '[' @String ']' @(String|Int|Float|Bool|Ident)"`
}

// ParseIDL parses an IDL file string and returns the parsed IDL structure
func ParseIDL(input string) (*IDL, error) {
	file, err := parser.ParseString("", input)
	if err != nil {
		return nil, fmt.Errorf("parse error: %w", err)
	}

	idl := &IDL{
		Interfaces: make([]*Interface, 0),
		Structs:    make([]*Struct, 0),
		Enums:      make([]*Enum, 0),
	}

	for _, elem := range file.Elements {
		if elem.Interface != nil {
			iface := &Interface{
				Name:    elem.Interface.Name,
				Methods: make([]*Method, 0),
			}
			for _, m := range elem.Interface.Methods {
				method := &Method{
					Name:       m.Name,
					Parameters: make([]*Parameter, 0),
					ReturnType: convertTypeExpr(m.ReturnType),
				}
				for _, p := range m.Parameters {
					method.Parameters = append(method.Parameters, &Parameter{
						Name: p.Name,
						Type: convertTypeExpr(p.Type),
					})
				}
				iface.Methods = append(iface.Methods, method)
			}
			idl.Interfaces = append(idl.Interfaces, iface)
		} else if elem.Struct != nil {
			s := &Struct{
				Name:    elem.Struct.Name,
				Extends: "",
				Fields:  make([]*Field, 0),
			}
			if elem.Struct.Extends != nil {
				s.Extends = *elem.Struct.Extends
			}
			for _, f := range elem.Struct.Fields {
				s.Fields = append(s.Fields, &Field{
					Name:     f.Name,
					Type:     convertTypeExpr(f.Type),
					Optional: f.Optional,
				})
			}
			idl.Structs = append(idl.Structs, s)
		} else if elem.Enum != nil {
			idl.Enums = append(idl.Enums, &Enum{
				Name:   elem.Enum.Name,
				Values: elem.Enum.Values,
			})
		}
	}

	return idl, nil
}

// convertTypeExpr converts a TypeExpr from the grammar to a Type in the IDL structure
func convertTypeExpr(expr *TypeExpr) *Type {
	if expr == nil {
		return nil
	}

	t := &Type{}

	if expr.BuiltIn != nil {
		t.BuiltIn = *expr.BuiltIn
		return t
	}

	if expr.Array != nil {
		// Parse the element type from the raw string
		elemType, err := typeParser.ParseString("", expr.Array.ElementTypeRaw)
		if err != nil {
			// If parsing fails, treat as user-defined type
			t.Array = &Type{UserDefined: expr.Array.ElementTypeRaw}
			return t
		}
		t.Array = convertTypeExpr(elemType)
		return t
	}

	if expr.MapType != nil {
		// Parse the value type from the raw string
		valueType, err := typeParser.ParseString("", expr.MapType.ValueTypeRaw)
		if err != nil {
			// If parsing fails, treat as user-defined type
			t.MapValue = &Type{UserDefined: expr.MapType.ValueTypeRaw}
			return t
		}
		t.MapValue = convertTypeExpr(valueType)
		return t
	}

	if expr.UserDefined != nil {
		t.UserDefined = *expr.UserDefined
		return t
	}

	return t
}

// validateIdentifier checks if an identifier matches the rules
func validateIdentifier(ident string) bool {
	if len(ident) == 0 {
		return false
	}
	if !((ident[0] >= 'a' && ident[0] <= 'z') || (ident[0] >= 'A' && ident[0] <= 'Z')) {
		return false
	}
	for i := 1; i < len(ident); i++ {
		c := ident[i]
		if !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_') {
			return false
		}
	}
	return true
}

// GetLineNumber returns the line number from a position string
func getLineNumber(pos lexer.Position) int {
	return pos.Line
}

// GetColumnNumber returns the column number from a position string
func getColumnNumber(pos lexer.Position) int {
	return pos.Column
}

