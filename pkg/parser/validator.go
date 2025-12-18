package parser

import (
	"fmt"
	"regexp"
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

	// Build type registry
	typeRegistry := make(map[string]bool)

	// First pass: register all types
	for _, iface := range idl.Interfaces {
		if validateIdentifierName(iface.Name, errors, 0, 0) {
			typeRegistry[iface.Name] = true
		}
	}

	// Register all structs
	for _, s := range idl.Structs {
		if validateIdentifierName(s.Name, errors, 0, 0) {
			typeRegistry[s.Name] = true
		}
	}

	// Register all enums
	for _, enum := range idl.Enums {
		if validateIdentifierName(enum.Name, errors, 0, 0) {
			typeRegistry[enum.Name] = true
		}
	}

	// Second pass: validate everything now that all types are registered
	for _, iface := range idl.Interfaces {
		// Validate method names and types
		for _, method := range iface.Methods {
			if !validateIdentifierName(method.Name, errors, 0, 0) {
				continue
			}
			validateType(method.ReturnType, typeRegistry, errors, 0, 0)
			for _, param := range method.Parameters {
				if !validateIdentifierName(param.Name, errors, 0, 0) {
					continue
				}
				validateType(param.Type, typeRegistry, errors, 0, 0)
			}
		}
	}

	for _, s := range idl.Structs {
		if s.Extends != "" {
			if !typeRegistry[s.Extends] && !builtInTypes[s.Extends] {
				errors.Add(&ValidationError{
					Line:   0,
					Column: 0,
					Msg:    fmt.Sprintf("struct %s extends unknown type %s", s.Name, s.Extends),
				})
			}
		}
		for _, field := range s.Fields {
			validateType(field.Type, typeRegistry, errors, 0, 0)
		}
	}

	if errors.HasErrors() {
		return errors
	}

	return nil
}

// validateType validates that a type exists and is well-formed
func validateType(t *Type, typeRegistry map[string]bool, errors *ValidationErrors, line, column int) {
	if t == nil {
		errors.Add(&ValidationError{
			Line:   line,
			Column: column,
			Msg:    "type is nil",
		})
		return
	}

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
		validateType(t.Array, typeRegistry, errors, line, column)
		return
	}

	if t.IsMap() {
		// Map keys are always string, so we just validate the value type
		validateType(t.MapValue, typeRegistry, errors, line, column)
		return
	}

	if t.IsUserDefined() {
		if !typeRegistry[t.UserDefined] && !builtInTypes[t.UserDefined] {
			errors.Add(&ValidationError{
				Line:   line,
				Column: column,
				Msg:    fmt.Sprintf("unknown type: %s", t.UserDefined),
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

