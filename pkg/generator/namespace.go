package generator

import (
	"strings"

	"github.com/coopernurse/barrister2/pkg/parser"
)

// NamespaceTypes groups all types (structs, enums, interfaces) for a single namespace
type NamespaceTypes struct {
	Structs    []*parser.Struct
	Enums      []*parser.Enum
	Interfaces []*parser.Interface
}

// GroupTypesByNamespace groups all types in the IDL by their namespace
func GroupTypesByNamespace(idl *parser.IDL) map[string]*NamespaceTypes {
	namespaceMap := make(map[string]*NamespaceTypes)

	// Group structs by namespace
	for _, s := range idl.Structs {
		ns := GetNamespaceFromType(s.Name, s.Namespace)
		if namespaceMap[ns] == nil {
			namespaceMap[ns] = &NamespaceTypes{
				Structs:    make([]*parser.Struct, 0),
				Enums:      make([]*parser.Enum, 0),
				Interfaces: make([]*parser.Interface, 0),
			}
		}
		namespaceMap[ns].Structs = append(namespaceMap[ns].Structs, s)
	}

	// Group enums by namespace
	for _, e := range idl.Enums {
		ns := GetNamespaceFromType(e.Name, e.Namespace)
		if namespaceMap[ns] == nil {
			namespaceMap[ns] = &NamespaceTypes{
				Structs:    make([]*parser.Struct, 0),
				Enums:      make([]*parser.Enum, 0),
				Interfaces: make([]*parser.Interface, 0),
			}
		}
		namespaceMap[ns].Enums = append(namespaceMap[ns].Enums, e)
	}

	// Group interfaces by namespace
	for _, i := range idl.Interfaces {
		ns := GetNamespaceFromType(i.Name, i.Namespace)
		if namespaceMap[ns] == nil {
			namespaceMap[ns] = &NamespaceTypes{
				Structs:    make([]*parser.Struct, 0),
				Enums:      make([]*parser.Enum, 0),
				Interfaces: make([]*parser.Interface, 0),
			}
		}
		namespaceMap[ns].Interfaces = append(namespaceMap[ns].Interfaces, i)
	}

	return namespaceMap
}

// GetNamespaceFromType extracts the namespace from a type name
// It first checks the type's Namespace field, then falls back to extracting from the qualified name
// Examples: "auth.User" -> "auth", "User" (with namespace="auth") -> "auth"
func GetNamespaceFromType(typeName string, namespaceField string) string {
	// If the type has a namespace field, use it
	if namespaceField != "" {
		return namespaceField
	}

	// Otherwise, try to extract from the qualified name (e.g., "auth.User" -> "auth")
	if strings.Contains(typeName, ".") {
		parts := strings.Split(typeName, ".")
		if len(parts) > 1 {
			return strings.Join(parts[:len(parts)-1], ".")
		}
	}

	// If no namespace found, return empty string (shouldn't happen with required namespaces)
	return ""
}

// GetBaseName extracts the base name from a qualified type name
// Examples: "auth.User" -> "User", "inc.Response" -> "Response"
func GetBaseName(typeName string) string {
	if strings.Contains(typeName, ".") {
		parts := strings.Split(typeName, ".")
		return parts[len(parts)-1]
	}
	return typeName
}

