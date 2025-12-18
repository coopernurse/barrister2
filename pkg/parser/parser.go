package parser

import (
	"fmt"
	"strings"

	"github.com/alecthomas/participle/v2"
	"github.com/alecthomas/participle/v2/lexer"
)

var (
	idlLexer = lexer.MustSimple([]lexer.SimpleRule{
		{Name: "Comment", Pattern: `//[^\n]*`},
		{Name: "Whitespace", Pattern: `[ \t\r\n]+`},
		{Name: "Optional", Pattern: `\[optional\]`},
		{Name: "Interface", Pattern: `interface`},
		{Name: "Struct", Pattern: `struct`},
		{Name: "Enum", Pattern: `enum`},
		{Name: "Extends", Pattern: `extends`},
		{Name: "Map", Pattern: `map`},
		{Name: "String", Pattern: `string`},
		{Name: "Float", Pattern: `float`},
		{Name: "Bool", Pattern: `bool`},
		{Name: "Int", Pattern: `int`},
		{Name: "Ident", Pattern: `[a-zA-Z][a-zA-Z0-9_]*`},
		{Name: "Punct", Pattern: `[{}[\]();,]`},
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
	Struct    *StructDef    `parser:"| 'struct' @@"`
	Enum      *EnumDef      `parser:"| 'enum' @@"`
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
	Name string    `parser:"@Ident"`
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
	BuiltIn     *string      `parser:"( @String | @Int | @Float | @Bool )"`
	Array       *ArrayType   `parser:"| @@"`
	MapType     *MapTypeExpr `parser:"| @@"`
	UserDefined *string      `parser:"| @Ident"`
}

// ArrayType represents []Type - uses TextUnmarshaler for recursive parsing
type ArrayType struct {
	Pos          lexer.Position
	ArrayMarkers string `parser:"'[' ']'"`
	ElementStart string `parser:"@(String|Int|Float|Bool|Ident|Map)"`
	ElementType  *TypeExpr
	// For nested arrays, we'll handle in post-processing
}

// MapTypeExpr represents map[string]ValueType - matches map pattern, value type parsed in post-processing
type MapTypeExpr struct {
	Pos        lexer.Position
	MapPattern string `parser:"@Map '[' @String ']'"`
	ValueStart string `parser:"@(String|Int|Float|Bool|Ident|Map|'[')"`
	ValueType  *TypeExpr
}

// extractTypeExpression extracts a complete type expression from input starting at offset
func extractTypeExpression(input string, startOffset int) string {
	if startOffset >= len(input) {
		return ""
	}

	remaining := input[startOffset:]
	depth := 0
	inBrackets := false
	endIdx := 0

	for i, r := range remaining {
		if r == '[' {
			depth++
			inBrackets = true
		} else if r == ']' {
			depth--
			if depth == 0 && inBrackets {
				inBrackets = false
			}
		} else if (r == ' ' || r == '\t' || r == '\n' || r == '\r') && depth == 0 && !inBrackets {
			// Check if next is [optional] or a field name
			rest := remaining[i:]
			if strings.HasPrefix(strings.TrimSpace(rest), "[optional]") {
				endIdx = i
				break
			}
			// Check if we've hit a new field (identifier at start of line after whitespace)
			trimmed := strings.TrimSpace(rest)
			if len(trimmed) > 0 {
				firstChar := trimmed[0]
				if (firstChar >= 'a' && firstChar <= 'z') || (firstChar >= 'A' && firstChar <= 'Z') {
					// Might be a new field, but could also be part of the type
					// Only end if we're sure (after some whitespace and it looks like a field)
					if i > 0 && (remaining[i-1] == ' ' || remaining[i-1] == '\t') {
						// Check if it's followed by a type (has a space and then a type keyword)
						parts := strings.Fields(trimmed)
						if len(parts) >= 2 {
							// Likely a new field: "fieldName typeName"
							endIdx = i
							break
						}
					}
				}
			}
		}
		endIdx = i + 1
	}

	if endIdx == 0 {
		endIdx = len(remaining)
	}

	return strings.TrimSpace(remaining[:endIdx])
}

// parseNestedTypes post-processes the AST to parse nested types recursively
func parseNestedTypes(expr *TypeExpr, input string) error {
	if expr == nil {
		return nil
	}

	if expr.Array != nil && expr.Array.ElementType == nil {
		// Extract the type expression after [] from the input
		pos := expr.Array.Pos
		if pos.Offset+2 < len(input) {
			// Always extract the full type expression to handle nested types
			// ElementStart might just be the first token (e.g., "[" for nested arrays)
			typeStr := extractTypeExpression(input, pos.Offset+2)
			if typeStr != "" {
				elemType, err := typeParser.ParseString("", typeStr)
				if err == nil {
					expr.Array.ElementType = elemType
					// Recursively parse nested types
					if err := parseNestedTypes(elemType, input); err != nil {
						return err
					}
				} else if expr.Array.ElementStart != "" && expr.Array.ElementStart != "[" && expr.Array.ElementStart != "map" {
					// Fallback for simple types: use ElementStart directly
					elemType, err := typeParser.ParseString("", expr.Array.ElementStart)
					if err == nil {
						expr.Array.ElementType = elemType
					} else {
						// Final fallback: treat as user-defined type
						expr.Array.ElementType = &TypeExpr{
							Pos:         expr.Array.Pos,
							UserDefined: &expr.Array.ElementStart,
						}
					}
				}
			} else if expr.Array.ElementStart != "" && expr.Array.ElementStart != "[" && expr.Array.ElementStart != "map" {
				// No extracted type, use ElementStart
				elemType, err := typeParser.ParseString("", expr.Array.ElementStart)
				if err == nil {
					expr.Array.ElementType = elemType
				} else {
					expr.Array.ElementType = &TypeExpr{
						Pos:         expr.Array.Pos,
						UserDefined: &expr.Array.ElementStart,
					}
				}
			}
		}
	}

	if expr.MapType != nil && expr.MapType.ValueType == nil {
		// Extract the value type after map[string] from the input
		pos := expr.MapType.Pos
		if pos.Offset < len(input) {
			remaining := input[pos.Offset:]
			mapPrefix := "map[string]"
			if strings.HasPrefix(remaining, mapPrefix) {
				// Always extract the full type expression to handle nested types
				typeStr := extractTypeExpression(input, pos.Offset+len(mapPrefix))
				if typeStr != "" {
					valueType, err := typeParser.ParseString("", typeStr)
					if err == nil {
						expr.MapType.ValueType = valueType
						// Recursively parse nested types
						if err := parseNestedTypes(valueType, input); err != nil {
							return err
						}
					} else if expr.MapType.ValueStart != "" && expr.MapType.ValueStart != "[" && expr.MapType.ValueStart != "map" {
						// Fallback for simple types: use ValueStart directly
						valueType, err := typeParser.ParseString("", expr.MapType.ValueStart)
						if err == nil {
							expr.MapType.ValueType = valueType
						} else {
							// Final fallback: treat as user-defined type
							expr.MapType.ValueType = &TypeExpr{
								Pos:         expr.MapType.Pos,
								UserDefined: &expr.MapType.ValueStart,
							}
						}
					}
				} else if expr.MapType.ValueStart != "" && expr.MapType.ValueStart != "[" && expr.MapType.ValueStart != "map" {
					// No extracted type, use ValueStart
					valueType, err := typeParser.ParseString("", expr.MapType.ValueStart)
					if err == nil {
						expr.MapType.ValueType = valueType
					} else {
						expr.MapType.ValueType = &TypeExpr{
							Pos:         expr.MapType.Pos,
							UserDefined: &expr.MapType.ValueStart,
						}
					}
				}
			}
		}
	}

	return nil
}

// ParseIDL parses an IDL file string and returns the parsed IDL structure
func ParseIDL(input string) (*IDL, error) {
	file, err := parser.ParseString("", input)
	if err != nil {
		return nil, fmt.Errorf("parse error: %w", err)
	}

	// Post-process to parse nested types recursively
	var processTypeExpr = func(expr *TypeExpr) error {
		if expr == nil {
			return nil
		}
		return parseNestedTypes(expr, input)
	}

	for _, elem := range file.Elements {
		if elem.Interface != nil {
			for _, m := range elem.Interface.Methods {
				if err := processTypeExpr(m.ReturnType); err != nil {
					return nil, fmt.Errorf("error processing return type: %w", err)
				}
				for _, p := range m.Parameters {
					if err := processTypeExpr(p.Type); err != nil {
						return nil, fmt.Errorf("error processing parameter type: %w", err)
					}
				}
			}
		} else if elem.Struct != nil {
			for _, f := range elem.Struct.Fields {
				if err := processTypeExpr(f.Type); err != nil {
					return nil, fmt.Errorf("error processing field type: %w", err)
				}
			}
		}
	}

	idl := &IDL{
		Interfaces: make([]*Interface, 0),
		Structs:    make([]*Struct, 0),
		Enums:      make([]*Enum, 0),
	}

	for _, elem := range file.Elements {
		if elem.Interface != nil {
			iface := &Interface{
				Pos:     elem.Interface.Pos,
				Name:    elem.Interface.Name,
				Methods: make([]*Method, 0),
			}
			for _, m := range elem.Interface.Methods {
				method := &Method{
					Pos:        m.Pos,
					Name:       m.Name,
					Parameters: make([]*Parameter, 0),
					ReturnType: convertTypeExpr(m.ReturnType),
				}
				for _, p := range m.Parameters {
					method.Parameters = append(method.Parameters, &Parameter{
						Pos:  p.Pos,
						Name: p.Name,
						Type: convertTypeExpr(p.Type),
					})
				}
				iface.Methods = append(iface.Methods, method)
			}
			idl.Interfaces = append(idl.Interfaces, iface)
		} else if elem.Struct != nil {
			s := &Struct{
				Pos:     elem.Struct.Pos,
				Name:    elem.Struct.Name,
				Extends: "",
				Fields:  make([]*Field, 0),
			}
			if elem.Struct.Extends != nil {
				s.Extends = *elem.Struct.Extends
			}
			for _, f := range elem.Struct.Fields {
				s.Fields = append(s.Fields, &Field{
					Pos:      f.Pos,
					Name:     f.Name,
					Type:     convertTypeExpr(f.Type),
					Optional: f.Optional,
				})
			}
			idl.Structs = append(idl.Structs, s)
		} else if elem.Enum != nil {
			idl.Enums = append(idl.Enums, &Enum{
				Pos:    elem.Enum.Pos,
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

	t := &Type{
		Pos: expr.Pos,
	}

	if expr.BuiltIn != nil {
		t.BuiltIn = *expr.BuiltIn
		return t
	}

	if expr.Array != nil {
		// ElementType should be parsed by post-processing
		if expr.Array.ElementType != nil {
			t.Array = convertTypeExpr(expr.Array.ElementType)
		}
		return t
	}

	if expr.MapType != nil {
		// ValueType should be parsed by now (post-processing)
		if expr.MapType.ValueType != nil {
			t.MapValue = convertTypeExpr(expr.MapType.ValueType)
		}
		return t
	}

	if expr.UserDefined != nil {
		t.UserDefined = *expr.UserDefined
		return t
	}

	return t
}
