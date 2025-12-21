package parser

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/alecthomas/participle/v2/lexer"
)

var (
	builtInTypes = map[string]bool{
		"string": true,
		"int":    true,
		"float":  true,
		"bool":   true,
	}

	identifierRegex = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9_]*$`)
)

// ValidateIDL validates the parsed IDL and returns any validation errors
func ValidateIDL(idl *IDL) error {
	errors := &ValidationErrors{Errors: make([]*ValidationError, 0)}

	// Validate that the root file has a namespace declaration
	// Exception: empty files (no types defined) are allowed without a namespace
	isEmpty := len(idl.Interfaces) == 0 && len(idl.Structs) == 0 && len(idl.Enums) == 0
	if idl.RootNamespace == "" && !isEmpty {
		errors.Add(&ValidationError{
			Line:   0,
			Column: 0,
			Msg:    "IDL file must declare a namespace at the top level",
		})
		// Return early if no namespace - other validations may not make sense
		if errors.HasErrors() {
			return errors
		}
	}

	// Build type registry and track positions for duplicate detection
	typeRegistry := make(map[string]lexer.Position)
	typeNames := make(map[string]string) // type name -> "interface", "struct", or "enum"

	// First pass: register all types and check for duplicates
	// For qualified names (namespace.Type), validate the base name part
	for _, iface := range idl.Interfaces {
		baseName := getBaseName(iface.Name)
		if !validateIdentifierName(baseName, errors, iface.Pos.Line, iface.Pos.Column) {
			continue
		}
		if existingPos, exists := typeRegistry[iface.Name]; exists {
			errors.Add(&ValidationError{
				Line:   iface.Pos.Line,
				Column: iface.Pos.Column,
				Msg:    fmt.Sprintf("duplicate type name: %s (previously defined as %s at %d:%d)", iface.Name, typeNames[iface.Name], existingPos.Line, existingPos.Column),
			})
		} else {
			typeRegistry[iface.Name] = iface.Pos
			typeNames[iface.Name] = "interface"
		}
	}

	// Register all structs
	for _, s := range idl.Structs {
		baseName := getBaseName(s.Name)
		if !validateIdentifierName(baseName, errors, s.Pos.Line, s.Pos.Column) {
			continue
		}
		if existingPos, exists := typeRegistry[s.Name]; exists {
			errors.Add(&ValidationError{
				Line:   s.Pos.Line,
				Column: s.Pos.Column,
				Msg:    fmt.Sprintf("duplicate type name: %s (previously defined as %s at %d:%d)", s.Name, typeNames[s.Name], existingPos.Line, existingPos.Column),
			})
		} else {
			typeRegistry[s.Name] = s.Pos
			typeNames[s.Name] = "struct"
		}
	}

	// Register all enums
	for _, enum := range idl.Enums {
		baseName := getBaseName(enum.Name)
		if !validateIdentifierName(baseName, errors, enum.Pos.Line, enum.Pos.Column) {
			continue
		}
		if existingPos, exists := typeRegistry[enum.Name]; exists {
			errors.Add(&ValidationError{
				Line:   enum.Pos.Line,
				Column: enum.Pos.Column,
				Msg:    fmt.Sprintf("duplicate type name: %s (previously defined as %s at %d:%d)", enum.Name, typeNames[enum.Name], existingPos.Line, existingPos.Column),
			})
		} else {
			typeRegistry[enum.Name] = enum.Pos
			typeNames[enum.Name] = "enum"
		}
	}

	// Second pass: validate everything now that all types are registered
	for _, iface := range idl.Interfaces {
		// Validate method names and types
		for _, method := range iface.Methods {
			if !validateIdentifierName(method.Name, errors, method.Pos.Line, method.Pos.Column) {
				continue
			}
			validateType(method.ReturnType, typeRegistry, errors)
			for _, param := range method.Parameters {
				if !validateIdentifierName(param.Name, errors, param.Pos.Line, param.Pos.Column) {
					continue
				}
				validateType(param.Type, typeRegistry, errors)
			}
		}
	}

	for _, s := range idl.Structs {
		if s.Extends != "" {
			_, exists := typeRegistry[s.Extends]
			if !exists && !builtInTypes[s.Extends] {
				errors.Add(&ValidationError{
					Line:   s.Pos.Line,
					Column: s.Pos.Column,
					Msg:    fmt.Sprintf("struct %s extends unknown type %s", s.Name, s.Extends),
				})
			}
		}
		for _, field := range s.Fields {
			validateType(field.Type, typeRegistry, errors)
		}
	}

	// Third pass: cycle detection
	detectCycles(idl, errors)

	if errors.HasErrors() {
		return errors
	}

	return nil
}

// validateType validates that a type exists and is well-formed
func validateType(t *Type, typeRegistry map[string]lexer.Position, errors *ValidationErrors) {
	if t == nil {
		errors.Add(&ValidationError{
			Line:   0,
			Column: 0,
			Msg:    "type is nil",
		})
		return
	}

	line := t.Pos.Line
	column := t.Pos.Column

	if t.IsBuiltIn() {
		if !builtInTypes[t.BuiltIn] {
			errors.Add(&ValidationError{
				Line:   line,
				Column: column,
				Msg:    fmt.Sprintf("unknown built-in type: %s", t.BuiltIn),
			})
		}
		return
	}

	if t.IsArray() {
		validateType(t.Array, typeRegistry, errors)
		return
	}

	if t.IsMap() {
		// Map keys are always string, so we just validate the value type
		validateType(t.MapValue, typeRegistry, errors)
		return
	}

	if t.IsUserDefined() {
		typeName := t.UserDefined
		if _, exists := typeRegistry[typeName]; !exists && !builtInTypes[typeName] {
			errors.Add(&ValidationError{
				Line:   line,
				Column: column,
				Msg:    fmt.Sprintf("unknown type: %s", typeName),
			})
		}
		return
	}

	errors.Add(&ValidationError{
		Line:   line,
		Column: column,
		Msg:    "invalid type expression",
	})
}

// validateIdentifierName validates that an identifier matches the naming rules
func validateIdentifierName(name string, errors *ValidationErrors, line, column int) bool {
	if !identifierRegex.MatchString(name) {
		errors.Add(&ValidationError{
			Line:   line,
			Column: column,
			Msg:    fmt.Sprintf("invalid identifier: %s (must start with a letter, followed by letters, numbers, or underscores)", name),
		})
		return false
	}
	return true
}

// getBaseName extracts the base name from a qualified name (e.g., "inc.Response" -> "Response")
func getBaseName(name string) string {
	parts := strings.Split(name, ".")
	return parts[len(parts)-1]
}

// getReferencedTypes extracts user-defined type names from a Type
func getReferencedTypes(t *Type) []string {
	if t == nil {
		return nil
	}
	if t.IsUserDefined() {
		return []string{t.UserDefined}
	}
	if t.IsArray() {
		return getReferencedTypes(t.Array)
	}
	if t.IsMap() {
		return getReferencedTypes(t.MapValue)
	}
	return nil
}

// detectCycles detects circular type references in structs
func detectCycles(idl *IDL, errors *ValidationErrors) {
	// Build a map of struct name to struct for quick lookup
	structMap := make(map[string]*Struct)
	for _, s := range idl.Structs {
		structMap[s.Name] = s
	}

	// Track visited nodes and recursion stack for cycle detection
	visited := make(map[string]bool)
	recursionStack := make(map[string]bool)

	// DFS function to detect cycles
	var dfs func(structName string, path []string) bool
	dfs = func(structName string, path []string) bool {
		// If we've seen this node in the current path, we have a cycle
		if recursionStack[structName] {
			// Build cycle path string
			cyclePath := ""
			cycleStart := -1
			for i, name := range path {
				if name == structName {
					cycleStart = i
					break
				}
			}
			if cycleStart >= 0 {
				for i := cycleStart; i < len(path); i++ {
					if cyclePath != "" {
						cyclePath += " -> "
					}
					cyclePath += path[i]
				}
				cyclePath += " -> " + structName
			} else {
				cyclePath = structName + " -> ... -> " + structName
			}

			s := structMap[structName]
			if s != nil {
				errors.Add(&ValidationError{
					Line:   s.Pos.Line,
					Column: s.Pos.Column,
					Msg:    fmt.Sprintf("circular type reference detected: %s", cyclePath),
				})
			}
			return true
		}

		// If we've already fully processed this node, skip it
		if visited[structName] {
			return false
		}

		// Mark as being processed in current path
		recursionStack[structName] = true
		path = append(path, structName)

		// Check extends relationship
		s := structMap[structName]
		if s != nil {
			if s.Extends != "" {
				if _, isStruct := structMap[s.Extends]; isStruct {
					if dfs(s.Extends, path) {
						return true
					}
				}
			}

			// Check all fields
			for _, field := range s.Fields {
				refTypes := getReferencedTypes(field.Type)
				for _, refType := range refTypes {
					if _, isStruct := structMap[refType]; isStruct {
						// Optional fields break cycles
						if field.Optional {
							continue
						}
						if dfs(refType, path) {
							return true
						}
					}
				}
			}
		}

		// Remove from recursion stack and mark as visited
		delete(recursionStack, structName)
		visited[structName] = true
		return false
	}

	// Run DFS on all structs
	for _, s := range idl.Structs {
		if !visited[s.Name] {
			dfs(s.Name, []string{})
		}
	}
}
