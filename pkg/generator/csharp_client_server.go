package generator

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/coopernurse/barrister2/pkg/parser"
	"github.com/coopernurse/barrister2/pkg/runtime"
)

// CSharpClientServer is a plugin that generates C# HTTP server and client code from IDL
type CSharpClientServer struct {
}

// NewCSharpClientServer creates a new CSharpClientServer plugin instance
func NewCSharpClientServer() *CSharpClientServer {
	return &CSharpClientServer{}
}

// Name returns the plugin identifier
func (p *CSharpClientServer) Name() string {
	return "csharp-client-server"
}

// RegisterFlags registers CLI flags for this plugin
func (p *CSharpClientServer) RegisterFlags(fs *flag.FlagSet) {
	// Only register base-dir if it hasn't been registered by another plugin
	if fs.Lookup("base-dir") == nil {
		fs.String("base-dir", "", "Base directory for namespace packages/modules (defaults to -dir if not specified)")
	}
}

// Generate generates C# HTTP server and client code from the parsed IDL
func (p *CSharpClientServer) Generate(idl *parser.IDL, fs *flag.FlagSet) error {
	// Access the -dir flag value
	dirFlag := fs.Lookup("dir")
	outputDir := ""
	if dirFlag != nil && dirFlag.Value.String() != "" {
		outputDir = dirFlag.Value.String()
	}

	// Get base-dir flag (defaults to outputDir if not specified)
	baseDirFlag := fs.Lookup("base-dir")
	baseDir := outputDir
	if baseDirFlag != nil && baseDirFlag.Value.String() != "" {
		baseDir = baseDirFlag.Value.String()
	}

	// Build type registries
	structMap := make(map[string]*parser.Struct)
	enumMap := make(map[string]*parser.Enum)
	interfaceMap := make(map[string]*parser.Interface)

	for _, s := range idl.Structs {
		structMap[s.Name] = s
	}
	for _, e := range idl.Enums {
		enumMap[e.Name] = e
	}
	for _, i := range idl.Interfaces {
		interfaceMap[i.Name] = i
	}

	// Copy runtime library files
	if err := p.copyRuntimeFiles(outputDir); err != nil {
		return fmt.Errorf("failed to copy runtime files: %w", err)
	}

	// Group types by namespace
	namespaceMap := GroupTypesByNamespace(idl)

	// Generate one file per namespace
	for namespace, types := range namespaceMap {
		if namespace == "" {
			continue // Skip types without namespace (shouldn't happen with required namespaces)
		}
		namespaceCode := generateNamespaceCs(namespace, types, structMap, enumMap)
		namespacePath := filepath.Join(baseDir, namespace+".cs")
		if err := os.WriteFile(namespacePath, []byte(namespaceCode), 0644); err != nil {
			return fmt.Errorf("failed to write %s.cs: %w", namespace, err)
		}
	}

	// Calculate relative path from outputDir to baseDir for imports
	relPathToBase, err := filepath.Rel(outputDir, baseDir)
	if err != nil {
		relPathToBase = baseDir // Fallback to absolute path if relative calculation fails
	}
	// Normalize the path (use forward slashes for C# using statements)
	relPathToBase = filepath.ToSlash(relPathToBase)
	if relPathToBase == "." {
		relPathToBase = ""
	} else if relPathToBase != "" {
		relPathToBase = relPathToBase + "/"
	}

	// Generate Server.cs
	serverCode := generateServerCs(idl, structMap, enumMap, interfaceMap, namespaceMap, relPathToBase)
	serverPath := filepath.Join(outputDir, "Server.cs")
	if err := os.WriteFile(serverPath, []byte(serverCode), 0644); err != nil {
		return fmt.Errorf("failed to write Server.cs: %w", err)
	}

	// Generate Client.cs
	clientCode := generateClientCs(idl, structMap, enumMap, interfaceMap, namespaceMap, relPathToBase)
	clientPath := filepath.Join(outputDir, "Client.cs")
	if err := os.WriteFile(clientPath, []byte(clientCode), 0644); err != nil {
		return fmt.Errorf("failed to write Client.cs: %w", err)
	}

	// Write IDL JSON document for barrister-idl RPC method
	jsonData, err := json.MarshalIndent(idl, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal IDL to JSON: %w", err)
	}
	jsonPath := filepath.Join(outputDir, "idl.json")
	if err := os.WriteFile(jsonPath, jsonData, 0644); err != nil {
		return fmt.Errorf("failed to write idl.json: %w", err)
	}

	// Check if test-server flag is set
	testServerFlag := fs.Lookup("test-server")
	generateTestServer := testServerFlag != nil && testServerFlag.Value.String() == "true"

	// Generate test server and client if flag is set
	if generateTestServer {
		// Generate TestServer.cs
		testServerCode := generateTestServerCs(idl, structMap, enumMap, interfaceMap, namespaceMap, relPathToBase)
		testServerPath := filepath.Join(outputDir, "TestServer.cs")
		if err := os.WriteFile(testServerPath, []byte(testServerCode), 0644); err != nil {
			return fmt.Errorf("failed to write TestServer.cs: %w", err)
		}

		// Generate TestClient.cs
		testClientCode := generateTestClientCs(idl, structMap, enumMap, interfaceMap, namespaceMap, relPathToBase)
		testClientPath := filepath.Join(outputDir, "TestClient.cs")
		if err := os.WriteFile(testClientPath, []byte(testClientCode), 0644); err != nil {
			return fmt.Errorf("failed to write TestClient.cs: %w", err)
		}
	}

	return nil
}

// copyRuntimeFiles copies the C# runtime library files to the output directory
// Uses embedded runtime files from the binary
func (p *CSharpClientServer) copyRuntimeFiles(outputDir string) error {
	return runtime.CopyRuntimeFiles("csharp", outputDir)
}

// generateNamespaceCs generates a C# file for a single namespace
func generateNamespaceCs(namespace string, types *NamespaceTypes, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum) string {
	var sb strings.Builder

	sb.WriteString("// Generated by barrister - do not edit\n\n")
	sb.WriteString("using System.Collections.Generic;\n")
	sb.WriteString("using System.Text.Json.Serialization;\n")
	sb.WriteString("using Barrister2;\n\n")

	// Generate enum types first (they may be referenced by structs)
	generateEnumTypesCs(&sb, types.Enums)
	sb.WriteString("\n")

	// Generate struct classes
	generateStructClassesCs(&sb, types.Structs, structMap, enumMap)
	sb.WriteString("\n")

	// Generate IDL-specific type definitions for this namespace
	sb.WriteString(fmt.Sprintf("// IDL-specific type definitions for namespace: %s\n", namespace))
	sb.WriteString("public static class " + namespace + "Idl\n")
	sb.WriteString("{\n")
	sb.WriteString("    public static readonly Dictionary<string, Dictionary<string, object>> ALL_STRUCTS = new Dictionary<string, Dictionary<string, object>>\n")
	sb.WriteString("    {\n")
	for _, s := range types.Structs {
		sb.WriteString(fmt.Sprintf("        { \"%s\", new Dictionary<string, object>\n", s.Name))
		sb.WriteString("        {\n")
		if s.Extends != "" {
			sb.WriteString(fmt.Sprintf("            { \"extends\", \"%s\" },\n", s.Extends))
		}
		sb.WriteString("            { \"fields\", new List<Dictionary<string, object>>\n")
		sb.WriteString("            {\n")
		for _, field := range s.Fields {
			sb.WriteString("                new Dictionary<string, object>\n")
			sb.WriteString("                {\n")
			sb.WriteString(fmt.Sprintf("                    { \"name\", \"%s\" },\n", field.Name))
			sb.WriteString("                    { \"type\", ")
			writeTypeDictCs(&sb, field.Type)
			sb.WriteString(" },\n")
			if field.Optional {
				sb.WriteString("                    { \"optional\", true },\n")
			}
			sb.WriteString("                },\n")
		}
		sb.WriteString("            }},\n")
		sb.WriteString("        }},\n")
	}
	sb.WriteString("    };\n\n")

	sb.WriteString("    public static readonly Dictionary<string, Dictionary<string, object>> ALL_ENUMS = new Dictionary<string, Dictionary<string, object>>\n")
	sb.WriteString("    {\n")
	for _, e := range types.Enums {
		sb.WriteString(fmt.Sprintf("        { \"%s\", new Dictionary<string, object>\n", e.Name))
		sb.WriteString("        {\n")
		sb.WriteString("            { \"values\", new List<Dictionary<string, object>>\n")
		sb.WriteString("            {\n")
		for _, val := range e.Values {
			sb.WriteString("                new Dictionary<string, object>\n")
			sb.WriteString("                {\n")
			sb.WriteString(fmt.Sprintf("                    { \"name\", \"%s\" },\n", val.Name))
			sb.WriteString("                },\n")
		}
		sb.WriteString("            }},\n")
		sb.WriteString("        }},\n")
	}
	sb.WriteString("    };\n")
	sb.WriteString("}\n")

	return sb.String()
}

// writeTypeDictCs writes a type definition as a C# Dictionary initializer
func writeTypeDictCs(sb *strings.Builder, t *parser.Type) {
	sb.WriteString("new Dictionary<string, object> { ")
	if t.IsBuiltIn() {
		fmt.Fprintf(sb, "{ \"builtIn\", \"%s\" }", t.BuiltIn)
	} else if t.IsArray() {
		sb.WriteString("{ \"array\", ")
		writeTypeDictCs(sb, t.Array)
		sb.WriteString(" }")
	} else if t.IsMap() {
		sb.WriteString("{ \"mapValue\", ")
		writeTypeDictCs(sb, t.MapValue)
		sb.WriteString(" }")
	} else if t.IsUserDefined() {
		fmt.Fprintf(sb, "{ \"userDefined\", \"%s\" }", t.UserDefined)
	}
	sb.WriteString(" }")
}

// mapTypeToCsType maps an IDL type to a C# type string
// structMap and enumMap are used to resolve user-defined types
func mapTypeToCsType(t *parser.Type, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum, optional bool) string {
	if t.IsBuiltIn() {
		csType := ""
		switch t.BuiltIn {
		case "string":
			csType = "string"
		case "int":
			csType = "int"
		case "float":
			csType = "double"
		case "bool":
			csType = "bool"
		default:
			csType = "object"
		}
		if optional {
			if csType == "int" || csType == "bool" || csType == "double" {
				return csType + "?"
			}
			return csType + "?"
		}
		return csType
	} else if t.IsArray() {
		elementType := mapTypeToCsType(t.Array, structMap, enumMap, false)
		return "List<" + elementType + ">"
	} else if t.IsMap() {
		valueType := mapTypeToCsType(t.MapValue, structMap, enumMap, false)
		return "Dictionary<string, " + valueType + ">"
	} else if t.IsUserDefined() {
		typeName := getStructOrEnumTypeName(t.UserDefined, structMap, enumMap)
		if optional {
			return typeName + "?"
		}
		return typeName
	}
	return "object"
}

// getStructClassName returns the C# class name for a struct
// Handles qualified names (e.g., "inc.Response" -> "Response")
func getStructClassName(structName string, structMap map[string]*parser.Struct) string {
	baseName := GetBaseName(structName)
	// Check if it exists in structMap (unqualified or qualified)
	if _, ok := structMap[baseName]; ok {
		return baseName
	}
	// If not found with base name, try the qualified name
	if _, ok := structMap[structName]; ok {
		return GetBaseName(structName)
	}
	// Fallback: just return the base name
	return baseName
}

// getEnumTypeName returns the C# enum name for an enum
// Handles qualified names (e.g., "inc.MathOp" -> "MathOp")
func getEnumTypeName(enumName string, enumMap map[string]*parser.Enum) string {
	baseName := GetBaseName(enumName)
	// Check if it exists in enumMap (unqualified or qualified)
	if _, ok := enumMap[baseName]; ok {
		return baseName
	}
	// If not found with base name, try the qualified name
	if _, ok := enumMap[enumName]; ok {
		return GetBaseName(enumName)
	}
	// Fallback: just return the base name
	return baseName
}

// getStructOrEnumTypeName returns the C# type name for a user-defined type
// First checks if it's a struct, then checks if it's an enum
func getStructOrEnumTypeName(typeName string, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum) string {
	baseName := GetBaseName(typeName)

	// Check if it's a struct
	if _, ok := structMap[baseName]; ok {
		return baseName
	}
	if _, ok := structMap[typeName]; ok {
		return baseName
	}

	// Check if it's an enum
	if _, ok := enumMap[baseName]; ok {
		return baseName
	}
	if _, ok := enumMap[typeName]; ok {
		return baseName
	}

	// Fallback: return base name
	return baseName
}

// snakeToPascalCase converts snake_case to PascalCase
// Example: "to_repeat" -> "ToRepeat"
func snakeToPascalCase(s string) string {
	parts := strings.Split(s, "_")
	result := ""
	for _, part := range parts {
		if len(part) > 0 {
			result += strings.ToUpper(part[:1]) + part[1:]
		}
	}
	return result
}

// generateEnumTypesCs generates C# enum types for all enums in the namespace
func generateEnumTypesCs(sb *strings.Builder, enums []*parser.Enum) {
	for _, e := range enums {
		if e.Comment != "" {
			lines := strings.Split(strings.TrimSpace(e.Comment), "\n")
			for _, line := range lines {
				fmt.Fprintf(sb, "// %s\n", line)
			}
		}
		// Use base name only (remove namespace prefix if present)
		enumName := GetBaseName(e.Name)
		fmt.Fprintf(sb, "public enum %s\n", enumName)
		sb.WriteString("{\n")
		for i, val := range e.Values {
			if i > 0 {
				sb.WriteString(",\n")
			}
			// C# enum values - use the IDL name directly (may be lowercase)
			// System.Text.Json will serialize these as strings if JsonStringEnumConverter is used
			fmt.Fprintf(sb, "    %s", val.Name)
		}
		if len(e.Values) > 0 {
			sb.WriteString("\n")
		}
		sb.WriteString("}\n\n")
	}
}

// generateStructClassesCs generates C# classes for all structs in the namespace
func generateStructClassesCs(sb *strings.Builder, structs []*parser.Struct, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum) {
	for _, s := range structs {
		if s.Comment != "" {
			lines := strings.Split(strings.TrimSpace(s.Comment), "\n")
			for _, line := range lines {
				fmt.Fprintf(sb, "// %s\n", line)
			}
		}

		// Use base name only (remove namespace prefix if present)
		structName := GetBaseName(s.Name)
		fmt.Fprintf(sb, "public class %s", structName)

		// Handle inheritance
		if s.Extends != "" {
			parentName := getStructClassName(s.Extends, structMap)
			fmt.Fprintf(sb, " : %s", parentName)
		}

		sb.WriteString("\n{\n")

		// Generate properties for each field
		for _, field := range s.Fields {
			if field.Comment != "" {
				lines := strings.Split(strings.TrimSpace(field.Comment), "\n")
				for _, line := range lines {
					fmt.Fprintf(sb, "    // %s\n", line)
				}
			}

			// JSON property name attribute (IDL uses snake_case, C# uses PascalCase)
			fmt.Fprintf(sb, "    [JsonPropertyName(\"%s\")]\n", field.Name)

			// Property type
			csType := mapTypeToCsType(field.Type, structMap, enumMap, field.Optional)

			// Property name in PascalCase
			propName := snakeToPascalCase(field.Name)

			// Generate property
			if !field.Optional {
				sb.WriteString("    public required ")
			} else {
				sb.WriteString("    public ")
			}
			fmt.Fprintf(sb, "%s %s { get; set; }\n\n", csType, propName)
		}

		sb.WriteString("}\n\n")
	}
}

// generateServerCs generates the Server.cs file with HTTP server and interface stubs
// This is a large function - implementing step by step
func generateServerCs(idl *parser.IDL, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum, interfaceMap map[string]*parser.Interface, namespaceMap map[string]*NamespaceTypes, relPathToBase string) string {
	var sb strings.Builder

	sb.WriteString("// Generated by barrister - do not edit\n\n")
	sb.WriteString("using System;\n")
	sb.WriteString("using System.Collections.Generic;\n")
	sb.WriteString("using System.IO;\n")
	sb.WriteString("using System.Linq;\n")
	sb.WriteString("using System.Net;\n")
	sb.WriteString("using System.Text.Json;\n")
	sb.WriteString("using System.Threading.Tasks;\n")
	sb.WriteString("using Microsoft.AspNetCore.Builder;\n")
	sb.WriteString("using Microsoft.AspNetCore.Http;\n")
	sb.WriteString("using Microsoft.Extensions.Logging;\n")
	sb.WriteString("using Barrister2;\n\n")

	// Import from namespace files
	namespaces := make([]string, 0, len(namespaceMap))
	for ns := range namespaceMap {
		if ns != "" {
			namespaces = append(namespaces, ns)
		}
	}
	sort.Strings(namespaces)

	for _, ns := range namespaces {
		// Namespace files define static classes like "conformIdl" in the global namespace
		// So we just reference them directly
		sb.WriteString(fmt.Sprintf("using static %sIdl;\n", ns))
	}
	sb.WriteString("\n")

	// Merge ALL_STRUCTS and ALL_ENUMS from all namespaces
	sb.WriteString("// Merge ALL_STRUCTS and ALL_ENUMS from all namespaces\n")
	sb.WriteString("public static class IdlData\n")
	sb.WriteString("{\n")
	sb.WriteString("    public static Dictionary<string, Dictionary<string, object>> ALL_STRUCTS = new Dictionary<string, Dictionary<string, object>>();\n")
	sb.WriteString("    public static Dictionary<string, Dictionary<string, object>> ALL_ENUMS = new Dictionary<string, Dictionary<string, object>>();\n")
	sb.WriteString("    \n")
	sb.WriteString("    static IdlData()\n")
	sb.WriteString("    {\n")
	for _, ns := range namespaces {
		sb.WriteString(fmt.Sprintf("        foreach (var kvp in %sIdl.ALL_STRUCTS) ALL_STRUCTS[kvp.Key] = kvp.Value;\n", ns))
		sb.WriteString(fmt.Sprintf("        foreach (var kvp in %sIdl.ALL_ENUMS) ALL_ENUMS[kvp.Key] = kvp.Value;\n", ns))
	}
	sb.WriteString("    }\n")
	sb.WriteString("}\n\n")

	// Generate interface stub abstract classes
	for _, iface := range idl.Interfaces {
		writeInterfaceStubCs(&sb, iface, structMap, enumMap)
	}

	// Generate BarristerServer class
	writeBarristerServerCs(&sb, idl, structMap, enumMap)

	return sb.String()
}

// writeInterfaceStubCs generates an abstract class for an interface
func writeInterfaceStubCs(sb *strings.Builder, iface *parser.Interface, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum) {
	if iface.Comment != "" {
		lines := strings.Split(strings.TrimSpace(iface.Comment), "\n")
		for _, line := range lines {
			fmt.Fprintf(sb, "// %s\n", line)
		}
	}
	fmt.Fprintf(sb, "public abstract class %s\n", iface.Name)
	sb.WriteString("{\n")

	for _, method := range iface.Methods {
		// Return type
		returnType := "object"
		if method.ReturnType != nil {
			returnType = mapTypeToCsType(method.ReturnType, structMap, enumMap, method.ReturnOptional)
		}
		sb.WriteString(fmt.Sprintf("    public abstract %s ", returnType))

		fmt.Fprintf(sb, "%s(", method.Name)

		// Parameters
		for i, param := range method.Parameters {
			if i > 0 {
				sb.WriteString(", ")
			}
			paramType := mapTypeToCsType(param.Type, structMap, enumMap, false)
			fmt.Fprintf(sb, "%s %s", paramType, param.Name)
		}
		sb.WriteString(");\n\n")
	}
	sb.WriteString("}\n\n")
}

// writeBarristerServerCs generates the BarristerServer class
func writeBarristerServerCs(sb *strings.Builder, idl *parser.IDL, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum) {
	sb.WriteString("public class BarristerServer\n")
	sb.WriteString("{\n")
	sb.WriteString("    private Dictionary<string, object> _handlers = new Dictionary<string, object>();\n")
	sb.WriteString("    private WebApplication? _app;\n\n")

	sb.WriteString("    public void Register<T>(string interfaceName, T implementation) where T : class\n")
	sb.WriteString("    {\n")
	sb.WriteString("        _handlers[interfaceName] = implementation!;\n")
	sb.WriteString("    }\n\n")

	sb.WriteString("    public async Task RunAsync(string host = \"localhost\", int port = 8080)\n")
	sb.WriteString("    {\n")
	sb.WriteString("        var builder = WebApplication.CreateBuilder(new WebApplicationOptions\n")
	sb.WriteString("        {\n")
	sb.WriteString("            WebRootPath = null\n")
	sb.WriteString("        });\n")
	sb.WriteString("        builder.WebHost.UseUrls($\"http://{host}:{port}\");\n")
	sb.WriteString("        _app = builder.Build();\n\n")
	sb.WriteString("        _app.MapPost(\"/\", async (HttpContext context) =>\n")
	sb.WriteString("        {\n")
	sb.WriteString("            await HandleRequest(context);\n")
	sb.WriteString("        });\n\n")
	sb.WriteString("        Console.WriteLine($\"Barrister server listening on http://{host}:{port}\");\n")
	sb.WriteString("        await _app.RunAsync();\n")
	sb.WriteString("    }\n\n")

	sb.WriteString("    private async Task HandleRequest(HttpContext context)\n")
	sb.WriteString("    {\n")
	sb.WriteString("        if (context.Request.Method != \"POST\")\n")
	sb.WriteString("        {\n")
	sb.WriteString("            context.Response.StatusCode = 405;\n")
	sb.WriteString("            await context.Response.WriteAsJsonAsync(new { error = \"Method Not Allowed\" });\n")
	sb.WriteString("            return;\n")
	sb.WriteString("        }\n\n")
	sb.WriteString("        object? requestJson;\n")
	sb.WriteString("        try\n")
	sb.WriteString("        {\n")
	sb.WriteString("            requestJson = await JsonSerializer.DeserializeAsync<object>(context.Request.Body);\n")
	sb.WriteString("        }\n")
	sb.WriteString("        catch (Exception e)\n")
	sb.WriteString("        {\n")
	sb.WriteString("            await WriteErrorResponse(context, null, -32700, \"Parse error\", $\"Invalid JSON: {e.Message}\");\n")
	sb.WriteString("            return;\n")
	sb.WriteString("        }\n\n")
	sb.WriteString("        object? response;\n")
	sb.WriteString("        if (requestJson is JsonElement element && element.ValueKind == JsonValueKind.Array)\n")
	sb.WriteString("        {\n")
	sb.WriteString("            // Batch request\n")
	sb.WriteString("            var responses = new List<object?>();\n")
	sb.WriteString("            foreach (var req in element.EnumerateArray())\n")
	sb.WriteString("            {\n")
	sb.WriteString("                var reqObj = JsonSerializer.Deserialize<Dictionary<string, object?>>(req.GetRawText());\n")
	sb.WriteString("                var resp = await HandleSingleRequest(reqObj!);\n")
	sb.WriteString("                if (resp != null) responses.Add(resp);\n")
	sb.WriteString("            }\n")
	sb.WriteString("            if (responses.Count == 0)\n")
	sb.WriteString("            {\n")
	sb.WriteString("                context.Response.StatusCode = 204;\n")
	sb.WriteString("            }\n")
	sb.WriteString("            else\n")
	sb.WriteString("            {\n")
	sb.WriteString("                await context.Response.WriteAsJsonAsync(responses);\n")
	sb.WriteString("            }\n")
	sb.WriteString("        }\n")
	sb.WriteString("        else\n")
	sb.WriteString("        {\n")
	sb.WriteString("            var reqDict = JsonSerializer.Deserialize<Dictionary<string, object?>>(requestJson!.ToString()!);\n")
	sb.WriteString("            response = await HandleSingleRequest(reqDict!);\n")
	sb.WriteString("            if (response == null)\n")
	sb.WriteString("            {\n")
	sb.WriteString("                context.Response.StatusCode = 204;\n")
	sb.WriteString("            }\n")
	sb.WriteString("            else\n")
	sb.WriteString("            {\n")
	sb.WriteString("                await context.Response.WriteAsJsonAsync(response);\n")
	sb.WriteString("            }\n")
	sb.WriteString("        }\n")
	sb.WriteString("    }\n\n")

	// HandleSingleRequest method
	writeHandleSingleRequestCs(sb, idl, structMap, enumMap)

	sb.WriteString("}\n")
}

// writeHandleSingleRequestCs generates the HandleSingleRequest method
func writeHandleSingleRequestCs(sb *strings.Builder, idl *parser.IDL, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum) {
	sb.WriteString("    private async Task<Dictionary<string, object?>?> HandleSingleRequest(Dictionary<string, object?> requestJson)\n")
	sb.WriteString("    {\n")
	sb.WriteString("        // Validate JSON-RPC 2.0 structure\n")
	sb.WriteString("        if (!requestJson.TryGetValue(\"jsonrpc\", out var jsonrpcObj) || jsonrpcObj?.ToString() != \"2.0\")\n")
	sb.WriteString("        {\n")
	sb.WriteString("            return ErrorResponse(null, -32600, \"Invalid Request\", \"jsonrpc must be '2.0'\");\n")
	sb.WriteString("        }\n\n")
	sb.WriteString("        if (!requestJson.TryGetValue(\"method\", out var methodObj) || methodObj is not string method)\n")
	sb.WriteString("        {\n")
	sb.WriteString("            return ErrorResponse(null, -32600, \"Invalid Request\", \"method must be a string\");\n")
	sb.WriteString("        }\n\n")
	sb.WriteString("        requestJson.TryGetValue(\"params\", out var paramsObj);\n")
	sb.WriteString("        requestJson.TryGetValue(\"id\", out var requestId);\n")
	sb.WriteString("        bool isNotification = !requestJson.ContainsKey(\"id\");\n\n")

	sb.WriteString("        // Special case: barrister-idl method\n")
	sb.WriteString("        if (method == \"barrister-idl\")\n")
	sb.WriteString("        {\n")
	sb.WriteString("            try\n")
	sb.WriteString("            {\n")
	sb.WriteString("                var idlJson = await File.ReadAllTextAsync(\"idl.json\");\n")
	sb.WriteString("                var idlDoc = JsonSerializer.Deserialize<object>(idlJson);\n")
	sb.WriteString("                if (isNotification) return null;\n")
	sb.WriteString("                return new Dictionary<string, object?>\n")
	sb.WriteString("                {\n")
	sb.WriteString("                    { \"jsonrpc\", \"2.0\" },\n")
	sb.WriteString("                    { \"result\", idlDoc },\n")
	sb.WriteString("                    { \"id\", requestId }\n")
	sb.WriteString("                };\n")
	sb.WriteString("            }\n")
	sb.WriteString("            catch (Exception e)\n")
	sb.WriteString("            {\n")
	sb.WriteString("                return ErrorResponse(requestId, -32603, \"Internal error\", $\"Failed to load IDL JSON: {e.Message}\");\n")
	sb.WriteString("            }\n")
	sb.WriteString("        }\n\n")

	sb.WriteString("        // Parse method name: interface.method\n")
	sb.WriteString("        var parts = method.Split('.', 2);\n")
	sb.WriteString("        if (parts.Length != 2)\n")
	sb.WriteString("        {\n")
	sb.WriteString("            return ErrorResponse(requestId, -32601, \"Method not found\", $\"Invalid method format: {method}\");\n")
	sb.WriteString("        }\n\n")
	sb.WriteString("        var interfaceName = parts[0];\n")
	sb.WriteString("        var methodName = parts[1];\n\n")

	sb.WriteString("        // Find handler\n")
	sb.WriteString("        if (!_handlers.TryGetValue(interfaceName, out var handler))\n")
	sb.WriteString("        {\n")
	sb.WriteString("            return ErrorResponse(requestId, -32601, \"Method not found\", $\"Interface '{interfaceName}' not registered\");\n")
	sb.WriteString("        }\n\n")

	// Method lookup and invocation
	writeMethodLookupAndInvokeCs(sb, idl, structMap, enumMap)

	sb.WriteString("    }\n\n")

	sb.WriteString("    private Dictionary<string, object?> ErrorResponse(object? requestId, int code, string message, object? data = null)\n")
	sb.WriteString("    {\n")
	sb.WriteString("        var error = new Dictionary<string, object?> { { \"code\", code }, { \"message\", message } };\n")
	sb.WriteString("        if (data != null) error[\"data\"] = data;\n")
	sb.WriteString("        return new Dictionary<string, object?>\n")
	sb.WriteString("        {\n")
	sb.WriteString("            { \"jsonrpc\", \"2.0\" },\n")
	sb.WriteString("            { \"error\", error },\n")
	sb.WriteString("            { \"id\", requestId }\n")
	sb.WriteString("        };\n")
	sb.WriteString("    }\n\n")

	sb.WriteString("    private async Task WriteErrorResponse(HttpContext context, object? requestId, int code, string message, object? data = null)\n")
	sb.WriteString("    {\n")
	sb.WriteString("        await context.Response.WriteAsJsonAsync(ErrorResponse(requestId, code, message, data));\n")
	sb.WriteString("    }\n")
}

// writeDeserializeParamCs writes C# code to deserialize a parameter value to its typed object
func writeDeserializeParamCs(sb *strings.Builder, paramType *parser.Type, paramVarName string, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum) {
	csType := mapTypeToCsType(paramType, structMap, enumMap, false)
	fmt.Fprintf(sb, "var %sJson = JsonSerializer.Serialize(%s);\n", paramVarName, paramVarName)
	fmt.Fprintf(sb, "var %sTyped = JsonSerializer.Deserialize<%s>(%sJson);\n", paramVarName, csType, paramVarName)
}

// writeMethodLookupAndInvokeCs generates method lookup and invocation code
func writeMethodLookupAndInvokeCs(sb *strings.Builder, idl *parser.IDL, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum) {
	sb.WriteString("        // Find method definition\n")
	sb.WriteString("        Dictionary<string, object>? methodDef = null;\n\n")

	for i, iface := range idl.Interfaces {
		if i == 0 {
			fmt.Fprintf(sb, "        if (interfaceName == \"%s\")\n", iface.Name)
		} else {
			fmt.Fprintf(sb, "        else if (interfaceName == \"%s\")\n", iface.Name)
		}
		sb.WriteString("        {\n")
		sb.WriteString("            var interfaceMethods = new Dictionary<string, Dictionary<string, object>>\n")
		sb.WriteString("            {\n")
		for _, method := range iface.Methods {
			fmt.Fprintf(sb, "                { \"%s\", new Dictionary<string, object>\n", method.Name)
			sb.WriteString("                {\n")
			sb.WriteString("                    { \"parameters\", new List<Dictionary<string, object>>\n")
			sb.WriteString("                    {\n")
			for _, param := range method.Parameters {
				sb.WriteString("                        new Dictionary<string, object>\n")
				sb.WriteString("                        {\n")
				fmt.Fprintf(sb, "                            { \"name\", \"%s\" },\n", param.Name)
				sb.WriteString("                            { \"type\", ")
				writeTypeDictCs(sb, param.Type)
				sb.WriteString(" },\n")
				sb.WriteString("                        },\n")
			}
			sb.WriteString("                    }},\n")
			sb.WriteString("                    { \"returnType\", ")
			writeTypeDictCs(sb, method.ReturnType)
			sb.WriteString(" },\n")
			sb.WriteString("                    { \"returnOptional\", ")
			if method.ReturnOptional {
				sb.WriteString("true")
			} else {
				sb.WriteString("false")
			}
			sb.WriteString(" },\n")
			sb.WriteString("                }},\n")
		}
		sb.WriteString("            };\n")
		sb.WriteString("            methodDef = interfaceMethods.TryGetValue(methodName, out var def) ? def : null;\n")
		sb.WriteString("        }\n")
	}
	sb.WriteString("\n")

	sb.WriteString("        if (methodDef == null)\n")
	sb.WriteString("        {\n")
	sb.WriteString("            return ErrorResponse(requestId, -32601, \"Method not found\", $\"Method '{methodName}' not found in interface '{interfaceName}'\");\n")
	sb.WriteString("        }\n\n")

	sb.WriteString("        // Validate params\n")
	sb.WriteString("        var paramsList = paramsObj as System.Collections.IList ?? new List<object>();\n")
	sb.WriteString("        var expectedParams = (methodDef[\"parameters\"] as System.Collections.IList) ?? new List<object>();\n")
	sb.WriteString("        if (paramsList.Count != expectedParams.Count)\n")
	sb.WriteString("        {\n")
	sb.WriteString("            return ErrorResponse(requestId, -32602, \"Invalid params\", $\"Expected {expectedParams.Count} parameters, got {paramsList.Count}\");\n")
	sb.WriteString("        }\n\n")

	sb.WriteString("        // Validate each param\n")
	sb.WriteString("        for (int i = 0; i < paramsList.Count; i++)\n")
	sb.WriteString("        {\n")
	sb.WriteString("            var paramValue = paramsList[i];\n")
	sb.WriteString("            var paramDef = (expectedParams[i] as Dictionary<string, object>)!;\n")
	sb.WriteString("            try\n")
	sb.WriteString("            {\n")
	sb.WriteString("                var typeDef = (Dictionary<string, object>)paramDef[\"type\"];\n")
	sb.WriteString("                Validation.ValidateType(paramValue, typeDef, IdlData.ALL_STRUCTS, IdlData.ALL_ENUMS, false);\n")
	sb.WriteString("            }\n")
	sb.WriteString("            catch (Exception e)\n")
	sb.WriteString("            {\n")
	sb.WriteString("                var paramName = paramDef.TryGetValue(\"name\", out var name) ? name?.ToString() : $\"parameter {i}\";\n")
	sb.WriteString("                return ErrorResponse(requestId, -32602, \"Invalid params\", $\"Parameter {i} ({paramName}) validation failed: {e.Message}\");\n")
	sb.WriteString("            }\n")
	sb.WriteString("        }\n\n")

	sb.WriteString("        // Invoke handler using reflection\n")
	sb.WriteString("        object? result;\n")
	sb.WriteString("        try\n")
	sb.WriteString("        {\n")
	sb.WriteString("            var handlerType = handler.GetType();\n")
	sb.WriteString("            var methodInfo = handlerType.GetMethod(methodName);\n")
	sb.WriteString("            if (methodInfo == null)\n")
	sb.WriteString("            {\n")
	sb.WriteString("                return ErrorResponse(requestId, -32601, \"Method not found\", $\"Method '{methodName}' not found on interface '{interfaceName}'\");\n")
	sb.WriteString("            }\n")
	sb.WriteString("            // Deserialize parameters to expected types using method parameter types\n")
	sb.WriteString("            var paramInfos = methodInfo.GetParameters();\n")
	sb.WriteString("            var deserializedParams = new object[paramsList.Count];\n")
	sb.WriteString("            var jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };\n")
	sb.WriteString("            for (int i = 0; i < paramsList.Count; i++)\n")
	sb.WriteString("            {\n")
	sb.WriteString("                var paramValue = paramsList[i];\n")
	sb.WriteString("                var paramType = paramInfos[i].ParameterType;\n")
	sb.WriteString("                string paramJson;\n")
	sb.WriteString("                if (paramValue is System.Text.Json.JsonElement jsonElement)\n")
	sb.WriteString("                {\n")
	sb.WriteString("                    paramJson = jsonElement.GetRawText();\n")
	sb.WriteString("                }\n")
	sb.WriteString("                else\n")
	sb.WriteString("                {\n")
	sb.WriteString("                    paramJson = JsonSerializer.Serialize(paramValue);\n")
	sb.WriteString("                }\n")
	sb.WriteString("                deserializedParams[i] = JsonSerializer.Deserialize(paramJson, paramType, jsonOptions);\n")
	sb.WriteString("            }\n")
	sb.WriteString("            result = methodInfo.Invoke(handler, deserializedParams);\n")
	sb.WriteString("            if (result is Task task)\n")
	sb.WriteString("            {\n")
	sb.WriteString("                await task;\n")
	sb.WriteString("                var resultProperty = task.GetType().GetProperty(\"Result\");\n")
	sb.WriteString("                result = resultProperty?.GetValue(task);\n")
	sb.WriteString("            }\n")
	sb.WriteString("        }\n")
	sb.WriteString("        catch (RPCError rpcErr)\n")
	sb.WriteString("        {\n")
	sb.WriteString("            return ErrorResponse(requestId, rpcErr.Code, rpcErr.Message, rpcErr.Data);\n")
	sb.WriteString("        }\n")
	sb.WriteString("        catch (Exception e)\n")
	sb.WriteString("        {\n")
	sb.WriteString("            return ErrorResponse(requestId, -32603, \"Internal error\", e.Message);\n")
	sb.WriteString("        }\n\n")

	sb.WriteString("        // Validate response\n")
	sb.WriteString("        if (methodDef.TryGetValue(\"returnType\", out var returnTypeObj) && returnTypeObj is Dictionary<string, object> returnType)\n")
	sb.WriteString("        {\n")
	sb.WriteString("            try\n")
	sb.WriteString("            {\n")
	sb.WriteString("                var returnOptional = methodDef.TryGetValue(\"returnOptional\", out var opt) && opt is bool optBool && optBool;\n")
	sb.WriteString("                Validation.ValidateType(result, returnType, IdlData.ALL_STRUCTS, IdlData.ALL_ENUMS, returnOptional);\n")
	sb.WriteString("            }\n")
	sb.WriteString("            catch (Exception e)\n")
	sb.WriteString("            {\n")
	sb.WriteString("                return ErrorResponse(requestId, -32603, \"Internal error\", $\"Response validation failed: {e.Message}\");\n")
	sb.WriteString("            }\n")
	sb.WriteString("        }\n\n")

	sb.WriteString("        // Return success response\n")
	sb.WriteString("        if (isNotification) return null;\n")
	sb.WriteString("        // Serialize result to JSON for proper response\n")
	sb.WriteString("        var resultJson = JsonSerializer.Serialize(result);\n")
	sb.WriteString("        return new Dictionary<string, object?>\n")
	sb.WriteString("        {\n")
	sb.WriteString("            { \"jsonrpc\", \"2.0\" },\n")
	sb.WriteString("            { \"result\", JsonSerializer.Deserialize<object>(resultJson) },\n")
	sb.WriteString("            { \"id\", requestId }\n")
	sb.WriteString("        };\n")
}

// writeParameterDeserializationCs writes C# code to determine the Type for parameter deserialization
func writeParameterDeserializationCs(sb *strings.Builder, typeDef map[string]interface{}) {
	if builtIn, ok := typeDef["builtIn"].(string); ok {
		switch builtIn {
		case "string":
			sb.WriteString("            paramType = typeof(string);\n")
		case "int":
			sb.WriteString("            paramType = typeof(int);\n")
		case "float":
			sb.WriteString("            paramType = typeof(double);\n")
		case "bool":
			sb.WriteString("            paramType = typeof(bool);\n")
		default:
			sb.WriteString("            paramType = typeof(object);\n")
		}
	} else if _, ok := typeDef["array"]; ok {
		sb.WriteString("            paramType = typeof(object[]);\n") // Will be handled as List<T>
	} else if _, ok := typeDef["mapValue"]; ok {
		sb.WriteString("            paramType = typeof(Dictionary<string, object>);\n")
	} else if userDefined, ok := typeDef["userDefined"].(string); ok {
		// For user-defined types, return the type name directly
		fmt.Fprintf(sb, "            paramType = typeof(%s);\n", userDefined)
	} else {
		sb.WriteString("            paramType = typeof(object);\n")
	}
}

// GetCSharpType converts a type definition to a C# Type object for deserialization
func GetCSharpType(typeDef map[string]interface{}, allStructs map[string]*parser.Struct, allEnums map[string]*parser.Enum) string {
	if builtIn, ok := typeDef["builtIn"].(string); ok {
		switch builtIn {
		case "string":
			return "typeof(string)"
		case "int":
			return "typeof(int)"
		case "float":
			return "typeof(double)"
		case "bool":
			return "typeof(bool)"
		default:
			return "typeof(object)"
		}
	} else if _, ok := typeDef["array"]; ok {
		return "typeof(object[])" // Will be handled as List<T> in actual code
	} else if _, ok := typeDef["mapValue"]; ok {
		return "typeof(Dictionary<string, object>)"
	} else if userDefined, ok := typeDef["userDefined"].(string); ok {
		// For user-defined types, return the type name directly
		return userDefined
	}
	return "typeof(object)"
}

// generateClientCs generates the Client.cs file with transport abstraction and client classes
func generateClientCs(idl *parser.IDL, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum, interfaceMap map[string]*parser.Interface, namespaceMap map[string]*NamespaceTypes, relPathToBase string) string {
	var sb strings.Builder

	sb.WriteString("// Generated by barrister - do not edit\n\n")
	sb.WriteString("using System;\n")
	sb.WriteString("using System.Collections.Generic;\n")
	sb.WriteString("using System.Linq;\n")
	sb.WriteString("using System.Net.Http;\n")
	sb.WriteString("using System.Text.Json;\n")
	sb.WriteString("using System.Threading.Tasks;\n")
	sb.WriteString("using Barrister2;\n\n")

	// Import from namespace files
	namespaces := make([]string, 0, len(namespaceMap))
	for ns := range namespaceMap {
		if ns != "" {
			namespaces = append(namespaces, ns)
		}
	}
	sort.Strings(namespaces)

	for _, ns := range namespaces {
		// Namespace files define static classes like "conformIdl" in the global namespace
		// So we just reference them directly
		sb.WriteString(fmt.Sprintf("using static %sIdl;\n", ns))
	}
	sb.WriteString("\n")

	// Merge ALL_STRUCTS and ALL_ENUMS from all namespaces (needed for validation)
	sb.WriteString("// Merge ALL_STRUCTS and ALL_ENUMS from all namespaces\n")
	sb.WriteString("public static class IdlData\n")
	sb.WriteString("{\n")
	sb.WriteString("    public static Dictionary<string, Dictionary<string, object>> ALL_STRUCTS = new Dictionary<string, Dictionary<string, object>>();\n")
	sb.WriteString("    public static Dictionary<string, Dictionary<string, object>> ALL_ENUMS = new Dictionary<string, Dictionary<string, object>>();\n")
	sb.WriteString("    \n")
	sb.WriteString("    static IdlData()\n")
	sb.WriteString("    {\n")
	for _, ns := range namespaces {
		sb.WriteString(fmt.Sprintf("        foreach (var kvp in %sIdl.ALL_STRUCTS) ALL_STRUCTS[kvp.Key] = kvp.Value;\n", ns))
		sb.WriteString(fmt.Sprintf("        foreach (var kvp in %sIdl.ALL_ENUMS) ALL_ENUMS[kvp.Key] = kvp.Value;\n", ns))
	}
	sb.WriteString("    }\n")
	sb.WriteString("}\n\n")

	// Generate ITransport interface
	writeITransportCs(&sb)

	// Generate HttpTransport
	writeHttpTransportCs(&sb)

	// Generate client classes for each interface
	for _, iface := range idl.Interfaces {
		writeInterfaceClientCs(&sb, iface, structMap, enumMap)
	}

	return sb.String()
}

// writeITransportCs generates the ITransport interface
func writeITransportCs(sb *strings.Builder) {
	sb.WriteString("public interface ITransport\n")
	sb.WriteString("{\n")
	sb.WriteString("    Task<Dictionary<string, object?>> CallAsync(string method, object[] parameters);\n")
	sb.WriteString("}\n\n")
}

// writeHttpTransportCs generates the HttpTransport class
func writeHttpTransportCs(sb *strings.Builder) {
	sb.WriteString("public class HttpTransport : ITransport\n")
	sb.WriteString("{\n")
	sb.WriteString("    private readonly HttpClient _httpClient;\n")
	sb.WriteString("    private readonly string _baseUrl;\n\n")
	sb.WriteString("    public HttpTransport(string baseUrl, Dictionary<string, string>? headers = null)\n")
	sb.WriteString("    {\n")
	sb.WriteString("        _baseUrl = baseUrl.TrimEnd('/');\n")
	sb.WriteString("        _httpClient = new HttpClient();\n")
	sb.WriteString("        if (headers != null)\n")
	sb.WriteString("        {\n")
	sb.WriteString("            foreach (var header in headers)\n")
	sb.WriteString("            {\n")
	sb.WriteString("                _httpClient.DefaultRequestHeaders.Add(header.Key, header.Value);\n")
	sb.WriteString("            }\n")
	sb.WriteString("        }\n")
	sb.WriteString("    }\n\n")
	sb.WriteString("    public async Task<Dictionary<string, object?>> CallAsync(string method, object[] parameters)\n")
	sb.WriteString("    {\n")
	sb.WriteString("        var requestId = Guid.NewGuid().ToString();\n")
	sb.WriteString("        var request = new Dictionary<string, object?>\n")
	sb.WriteString("        {\n")
	sb.WriteString("            { \"jsonrpc\", \"2.0\" },\n")
	sb.WriteString("            { \"method\", method },\n")
	sb.WriteString("            { \"params\", parameters },\n")
	sb.WriteString("            { \"id\", requestId }\n")
	sb.WriteString("        };\n\n")
	sb.WriteString("        var json = JsonSerializer.Serialize(request);\n")
	sb.WriteString("        var content = new StringContent(json, System.Text.Encoding.UTF8, \"application/json\");\n\n")
	sb.WriteString("        var response = await _httpClient.PostAsync(_baseUrl, content);\n")
	sb.WriteString("        response.EnsureSuccessStatusCode();\n\n")
	sb.WriteString("        var responseJson = await response.Content.ReadAsStringAsync();\n")
	sb.WriteString("        var responseDict = JsonSerializer.Deserialize<Dictionary<string, object?>>(responseJson);\n\n")
	sb.WriteString("        if (responseDict != null && responseDict.TryGetValue(\"error\", out var errorObj) && errorObj != null)\n")
	sb.WriteString("        {\n")
	sb.WriteString("            var error = errorObj as Dictionary<string, object?>;\n")
	sb.WriteString("            var code = error != null && error.TryGetValue(\"code\", out var codeObj) ? Convert.ToInt32(codeObj) : -32603;\n")
	sb.WriteString("            var message = error != null && error.TryGetValue(\"message\", out var msgObj) ? msgObj?.ToString() ?? \"\" : \"Unknown error\";\n")
	sb.WriteString("            object? data = error != null && error.TryGetValue(\"data\", out var dataObj) ? dataObj : null;\n")
	sb.WriteString("            throw new RPCError(code, message, data);\n")
	sb.WriteString("        }\n\n")
	sb.WriteString("        return responseDict ?? new Dictionary<string, object?>();\n")
	sb.WriteString("    }\n")
	sb.WriteString("}\n\n")
}

// writeInterfaceClientCs generates a client class for an interface
func writeInterfaceClientCs(sb *strings.Builder, iface *parser.Interface, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum) {
	clientClassName := iface.Name + "Client"
	fmt.Fprintf(sb, "public class %s\n", clientClassName)
	sb.WriteString("{\n")
	sb.WriteString("    private readonly ITransport _transport;\n\n")
	sb.WriteString("    public " + clientClassName + "(ITransport transport)\n")
	sb.WriteString("    {\n")
	sb.WriteString("        _transport = transport;\n")
	sb.WriteString("    }\n\n")

	// Generate methods
	for _, method := range iface.Methods {
		writeClientMethodCs(sb, iface, method, structMap, enumMap)
	}

	sb.WriteString("}\n\n")
}

// writeClientMethodCs generates a method implementation for a client class
func writeClientMethodCs(sb *strings.Builder, iface *parser.Interface, method *parser.Method, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum) {
	// Return type
	var returnTypeStr string
	if method.ReturnType != nil {
		returnTypeStr = mapTypeToCsType(method.ReturnType, structMap, enumMap, method.ReturnOptional)
	} else {
		returnTypeStr = "object?"
	}

	fmt.Fprintf(sb, "    public async Task<%s> %sAsync(", returnTypeStr, method.Name)

	// Parameters
	for i, param := range method.Parameters {
		if i > 0 {
			sb.WriteString(", ")
		}
		paramType := mapTypeToCsType(param.Type, structMap, enumMap, false)
		sb.WriteString(paramType)
		sb.WriteString(" ")
		fmt.Fprintf(sb, "%s", param.Name)
	}
	sb.WriteString(")\n")
	sb.WriteString("    {\n")

	// Note: Parameter validation is skipped here because:
	// 1. Parameters are already typed (compile-time safety)
	// 2. The server will validate the JSON payload (runtime safety)
	// If additional client-side validation is needed, it can be added here
	sb.WriteString("\n")

	// Create parameters array for transport (transport handles JSON serialization)
	fmt.Fprintf(sb, "        var method = \"%s.%s\";\n", iface.Name, method.Name)
	sb.WriteString("        var parameters = new object[] { ")
	for i, param := range method.Parameters {
		if i > 0 {
			sb.WriteString(", ")
		}
		fmt.Fprintf(sb, "%s", param.Name)
	}
	sb.WriteString(" };\n\n")

	sb.WriteString("        var response = await _transport.CallAsync(method, parameters);\n")
	sb.WriteString("        if (!response.TryGetValue(\"result\", out var result)) {\n")
	if method.ReturnOptional {
		sb.WriteString("            return default;\n")
	} else {
		sb.WriteString("            throw new RPCError(-32603, \"Internal error\", \"Missing result in response\");\n")
	}
	sb.WriteString("        }\n\n")

	// Deserialize response to typed object
	if method.ReturnType != nil {
		// result is a JsonElement from the Dictionary, so we need to get its raw text and deserialize
		sb.WriteString("        // Deserialize to return type\n")
		sb.WriteString("        string resultJsonStr;\n")
		sb.WriteString("        if (result is System.Text.Json.JsonElement jsonElement)\n")
		sb.WriteString("        {\n")
		sb.WriteString("            resultJsonStr = jsonElement.GetRawText();\n")
		sb.WriteString("        }\n")
		sb.WriteString("        else\n")
		sb.WriteString("        {\n")
		sb.WriteString("            resultJsonStr = JsonSerializer.Serialize(result);\n")
		sb.WriteString("        }\n")

		// Deserialize directly to the typed return type
		returnTypeStr := mapTypeToCsType(method.ReturnType, structMap, enumMap, method.ReturnOptional)
		fmt.Fprintf(sb, "        return JsonSerializer.Deserialize<%s>(resultJsonStr, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });\n", returnTypeStr)
	} else {
		sb.WriteString("        return result;\n")
	}
	sb.WriteString("    }\n\n")
}

// generateTestServerCs generates TestServer.cs with concrete implementations of all interfaces
func generateTestServerCs(idl *parser.IDL, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum, interfaceMap map[string]*parser.Interface, namespaceMap map[string]*NamespaceTypes, relPathToBase string) string {
	var sb strings.Builder

	sb.WriteString("// Generated by barrister - do not edit\n")
	sb.WriteString("// Test server implementation for integration testing\n\n")
	sb.WriteString("using System;\n")
	sb.WriteString("using System.Linq;\n")
	sb.WriteString("using System.Threading.Tasks;\n")
	sb.WriteString("\n")

	// Generate implementation classes for each interface
	for _, iface := range idl.Interfaces {
		writeTestInterfaceImplCs(&sb, iface, structMap, enumMap)
	}

	// Generate main entry point
	sb.WriteString("public class Program\n")
	sb.WriteString("{\n")
	sb.WriteString("    public static async Task Main(string[] args)\n")
	sb.WriteString("    {\n")
	sb.WriteString("        var server = new BarristerServer();\n")
	for _, iface := range idl.Interfaces {
		implName := iface.Name + "Impl"
		fmt.Fprintf(&sb, "        server.Register(\"%s\", new %s());\n", iface.Name, implName)
	}
	sb.WriteString("        await server.RunAsync(\"0.0.0.0\", 8080);\n")
	sb.WriteString("    }\n")
	sb.WriteString("}\n")

	return sb.String()
}

// generateTestClientCs generates TestClient.cs test program
func generateTestClientCs(idl *parser.IDL, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum, interfaceMap map[string]*parser.Interface, namespaceMap map[string]*NamespaceTypes, relPathToBase string) string {
	var sb strings.Builder

	sb.WriteString("// Generated by barrister - do not edit\n")
	sb.WriteString("// Test client program for integration testing\n\n")
	sb.WriteString("using System;\n")
	sb.WriteString("using System.Collections.Generic;\n")
	sb.WriteString("using System.Threading.Tasks;\n")
	sb.WriteString("\n")
	sb.WriteString("public class Program\n")
	sb.WriteString("{\n")
	sb.WriteString("    public static async Task Main(string[] args)\n")
	sb.WriteString("    {\n")
	sb.WriteString("        var baseUrl = args.Length > 0 ? args[0] : \"http://localhost:8080\";\n")
	sb.WriteString("        var transport = new HttpTransport(baseUrl);\n")
	sb.WriteString("        var errors = new List<string>();\n\n")

	// Generate test calls for all interfaces and methods
	for _, iface := range idl.Interfaces {
		fmt.Fprintf(&sb, "        var %sClient = new %sClient(transport);\n", strings.ToLower(iface.Name), iface.Name)
		sb.WriteString("\n")
		for _, method := range iface.Methods {
			writeTestClientMethodCallCs(&sb, iface, method, structMap, enumMap)
		}
	}

	sb.WriteString("        if (errors.Count > 0)\n")
	sb.WriteString("        {\n")
	sb.WriteString("            Console.WriteLine($\"FAILED: {errors.Count} test(s) failed\");\n")
	sb.WriteString("            foreach (var error in errors)\n")
	sb.WriteString("            {\n")
	sb.WriteString("                Console.WriteLine($\"  {error}\");\n")
	sb.WriteString("            }\n")
	sb.WriteString("            Environment.Exit(1);\n")
	sb.WriteString("        }\n")
	sb.WriteString("        else\n")
	sb.WriteString("        {\n")
	sb.WriteString("            Console.WriteLine(\"SUCCESS: All tests passed!\");\n")
	sb.WriteString("            Environment.Exit(0);\n")
	sb.WriteString("        }\n")
	sb.WriteString("    }\n")
	sb.WriteString("}\n")

	return sb.String()
}

// writeTestInterfaceImplCs generates a concrete implementation class for an interface
func writeTestInterfaceImplCs(sb *strings.Builder, iface *parser.Interface, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum) {
	implName := iface.Name + "Impl"
	fmt.Fprintf(sb, "public class %s : %s\n", implName, iface.Name)
	sb.WriteString("{\n")

	for _, method := range iface.Methods {
		writeTestMethodImplCs(sb, iface, method, structMap, enumMap)
	}

	sb.WriteString("}\n\n")
}

// writeTestMethodImplCs generates a concrete method implementation
func writeTestMethodImplCs(sb *strings.Builder, iface *parser.Interface, method *parser.Method, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum) {
	// Return type
	returnType := "object"
	if method.ReturnType != nil {
		returnType = mapTypeToCsType(method.ReturnType, structMap, enumMap, method.ReturnOptional)
	}
	sb.WriteString(fmt.Sprintf("    public override %s ", returnType))

	fmt.Fprintf(sb, "%s(", method.Name)

	// Parameters
	for i, param := range method.Parameters {
		if i > 0 {
			sb.WriteString(", ")
		}
		paramType := mapTypeToCsType(param.Type, structMap, enumMap, false)
		fmt.Fprintf(sb, "%s %s", paramType, param.Name)
	}
	sb.WriteString(")\n")
	sb.WriteString("    {\n")

	// Implement based on method name and IDL comments
	writeMethodImplementationCs(sb, iface, method, structMap, enumMap)

	sb.WriteString("    }\n\n")
}

// writeMethodImplementationCs generates the actual method implementation body
func writeMethodImplementationCs(sb *strings.Builder, iface *parser.Interface, method *parser.Method, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum) {
	methodName := method.Name
	interfaceName := iface.Name

	// Handle specific methods based on IDL comments
	if interfaceName == "A" {
		switch methodName {
		case "add":
			// returns a+b
			sb.WriteString("        return a + b;\n")
			return
		case "calc":
			// performs the given operation against all the values in nums and returns the result
			sb.WriteString("        double result = 0.0;\n")
			sb.WriteString("        if (nums.Count > 0)\n")
			sb.WriteString("        {\n")
			sb.WriteString("            result = nums[0];\n")
			sb.WriteString("            for (int i = 1; i < nums.Count; i++)\n")
			sb.WriteString("            {\n")
			sb.WriteString("                if (operation == MathOp.add)\n")
			sb.WriteString("                    result += nums[i];\n")
			sb.WriteString("                else if (operation == MathOp.multiply)\n")
			sb.WriteString("                    result *= nums[i];\n")
			sb.WriteString("            }\n")
			sb.WriteString("        }\n")
			sb.WriteString("        return result;\n")
			return
		case "sqrt":
			// returns the square root of a
			sb.WriteString("        return Math.Sqrt(a);\n")
			return
		case "repeat":
			// Echos the req1.to_repeat string as a list, optionally forcing to_repeat to upper case
			// RepeatResponse.items should be a list of strings whose length is equal to req1.count
			sb.WriteString("        var toRepeat = req1.ToRepeat;\n")
			sb.WriteString("        if (req1.ForceUppercase) toRepeat = toRepeat.ToUpper();\n")
			sb.WriteString("        var items = new List<string>();\n")
			sb.WriteString("        for (int i = 0; i < req1.Count; i++)\n")
			sb.WriteString("        {\n")
			sb.WriteString("            items.Add(toRepeat);\n")
			sb.WriteString("        }\n")
			sb.WriteString("        return new RepeatResponse\n")
			sb.WriteString("        {\n")
			sb.WriteString("            Status = Status.ok,\n")
			sb.WriteString("            Count = req1.Count,\n")
			sb.WriteString("            Items = items\n")
			sb.WriteString("        };\n")
			return
		case "say_hi":
			// returns a result with: hi="hi" (HiResponse only has hi field, not status)
			sb.WriteString("        return new HiResponse\n")
			sb.WriteString("        {\n")
			sb.WriteString("            Hi = \"hi\"\n")
			sb.WriteString("        };\n")
			return
		case "repeat_num":
			// returns num as an array repeated 'count' number of times
			sb.WriteString("        var result = new List<int>();\n")
			sb.WriteString("        for (int i = 0; i < count; i++)\n")
			sb.WriteString("        {\n")
			sb.WriteString("            result.Add(num);\n")
			sb.WriteString("        }\n")
			sb.WriteString("        return result;\n")
			return
		case "putPerson":
			// simply returns p.personId
			sb.WriteString("        return p.PersonId;\n")
			return
		}
	} else if interfaceName == "B" {
		switch methodName {
		case "echo":
			// simply returns s, if s == "return-null" then you should return a null
			sb.WriteString("        if (s == \"return-null\") return null;\n")
			sb.WriteString("        return s;\n")
			return
		}
	}

	// Default implementation for methods not specifically handled
	if method.ReturnType != nil {
		if method.ReturnType.IsBuiltIn() {
			switch method.ReturnType.BuiltIn {
			case "string":
				sb.WriteString("        return \"test\";\n")
			case "int":
				sb.WriteString("        return 42;\n")
			case "float":
				sb.WriteString("        return 3.14;\n")
			case "bool":
				sb.WriteString("        return true;\n")
			default:
				sb.WriteString("        return null;\n")
			}
		} else if method.ReturnType.IsArray() {
			elementType := mapTypeToCsType(method.ReturnType.Array, structMap, enumMap, false)
			fmt.Fprintf(sb, "        return new List<%s>();\n", elementType)
		} else if method.ReturnType.IsUserDefined() {
			// For user-defined types (structs/enums), return null
			sb.WriteString("        return null;\n")
		} else {
			sb.WriteString("        return null;\n")
		}
	} else {
		sb.WriteString("        return null;\n")
	}
}

// writeTestClientMethodCallCs generates a test method call
func writeTestClientMethodCallCs(sb *strings.Builder, iface *parser.Interface, method *parser.Method, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum) {
	fmt.Fprintf(sb, "        try\n")
	sb.WriteString("        {\n")
	fmt.Fprintf(sb, "            var result = await %sClient.%sAsync(", strings.ToLower(iface.Name), method.Name)

	// Generate test parameter values
	for i, param := range method.Parameters {
		if i > 0 {
			sb.WriteString(", ")
		}
		writeTestParamValueCs(sb, param, structMap, enumMap)
	}
	sb.WriteString(");\n")
	fmt.Fprintf(sb, "            Console.WriteLine($\"✓ %s.%s passed\");\n", iface.Name, method.Name)
	sb.WriteString("        }\n")
	sb.WriteString("        catch (Exception e)\n")
	sb.WriteString("        {\n")
	fmt.Fprintf(sb, "            errors.Add($\"%s.%s failed: {e.Message}\");\n", iface.Name, method.Name)
	sb.WriteString("        }\n\n")
}

// writeTestParamValueCs generates C# code for a test parameter value
func writeTestParamValueCs(sb *strings.Builder, param *parser.Parameter, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum) {
	if param.Type.IsBuiltIn() {
		switch param.Type.BuiltIn {
		case "string":
			fmt.Fprintf(sb, "\"test%s\"", param.Name)
		case "int":
			sb.WriteString("42")
		case "float":
			sb.WriteString("3.14")
		case "bool":
			sb.WriteString("true")
		default:
			sb.WriteString("null")
		}
	} else if param.Type.IsArray() {
		elementType := mapTypeToCsType(param.Type.Array, structMap, enumMap, false)
		fmt.Fprintf(sb, "new List<%s> { ", elementType)
		// Generate a single element for the array
		writeTestFieldValueCs(sb, param.Type.Array, structMap, enumMap)
		sb.WriteString(" }")
	} else if param.Type.IsUserDefined() {
		// Check if it's an enum or struct
		typeName := param.Type.UserDefined
		// First try with qualified name (for imported types like inc.MathOp)
		// Try to find enum or struct
		unqualifiedName := typeName
		if strings.Contains(typeName, ".") {
			parts := strings.Split(typeName, ".")
			unqualifiedName = parts[len(parts)-1]
		}

		enumDef, isEnum := enumMap[unqualifiedName]
		if !isEnum {
			enumDef, isEnum = enumMap[typeName]
		}

		if isEnum {
			// It's an enum - use the first enum value (enum name is the type name)
			if len(enumDef.Values) > 0 {
				enumTypeName := getEnumTypeName(unqualifiedName, enumMap)
				fmt.Fprintf(sb, "%s.%s", enumTypeName, enumDef.Values[0].Name)
			} else {
				sb.WriteString("default")
			}
		} else if structDef, ok := structMap[unqualifiedName]; ok {
			// It's a struct - create instance of generated class
			writeStructInstanceCs(sb, structDef, structMap, enumMap)
		} else {
			// Unknown type - default to string
			sb.WriteString("\"test\"")
		}
	} else {
		sb.WriteString("null")
	}
}

// writeStructInstanceCs generates C# code to create an instance of a generated struct class
func writeStructInstanceCs(sb *strings.Builder, structDef *parser.Struct, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum) {
	className := getStructClassName(structDef.Name, structMap)
	fmt.Fprintf(sb, "new %s\n", className)
	sb.WriteString("        {\n")
	fieldCount := 0
	for _, field := range structDef.Fields {
		// For optional fields, sometimes omit them, sometimes set to null
		// For Person.email specifically, set to null to test optional enforcement
		if field.Optional && field.Name == "email" {
			if fieldCount > 0 {
				sb.WriteString(",\n")
			}
			propName := snakeToPascalCase(field.Name)
			fmt.Fprintf(sb, "            %s = null", propName)
			fieldCount++
		} else if !field.Optional {
			if fieldCount > 0 {
				sb.WriteString(",\n")
			}
			propName := snakeToPascalCase(field.Name)
			fmt.Fprintf(sb, "            %s = ", propName)
			writeTestFieldValueCs(sb, field.Type, structMap, enumMap)
			fieldCount++
		}
		// Skip optional fields that aren't email (they can be omitted)
	}
	sb.WriteString("\n        }")
}

// writeTestFieldValueCs generates C# code for a field value in a struct
func writeTestFieldValueCs(sb *strings.Builder, fieldType *parser.Type, structMap map[string]*parser.Struct, enumMap map[string]*parser.Enum) {
	if fieldType.IsBuiltIn() {
		switch fieldType.BuiltIn {
		case "string":
			sb.WriteString("\"test\"")
		case "int":
			sb.WriteString("42")
		case "float":
			sb.WriteString("3.14")
		case "bool":
			sb.WriteString("true")
		default:
			sb.WriteString("null")
		}
	} else if fieldType.IsArray() {
		elementTypeStr := mapTypeToCsType(fieldType.Array, structMap, enumMap, false)
		fmt.Fprintf(sb, "new List<%s> { ", elementTypeStr)
		// Generate a single element for the array
		writeTestFieldValueCs(sb, fieldType.Array, structMap, enumMap)
		sb.WriteString(" }")
	} else if fieldType.IsUserDefined() {
		typeName := fieldType.UserDefined
		// First try with qualified name (for imported types like inc.MathOp)
		// Try to find enum or struct
		unqualifiedName := typeName
		if strings.Contains(typeName, ".") {
			parts := strings.Split(typeName, ".")
			unqualifiedName = parts[len(parts)-1]
		}

		enumDef, isEnum := enumMap[unqualifiedName]
		if !isEnum {
			enumDef, isEnum = enumMap[typeName]
		}

		if isEnum {
			// It's an enum - use the first enum value (enum name is the type name)
			if len(enumDef.Values) > 0 {
				enumTypeName := getEnumTypeName(unqualifiedName, enumMap)
				fmt.Fprintf(sb, "%s.%s", enumTypeName, enumDef.Values[0].Name)
			} else {
				sb.WriteString("default")
			}
		} else if structDef, ok := structMap[unqualifiedName]; ok {
			// It's a struct - create instance of generated class
			writeStructInstanceCs(sb, structDef, structMap, enumMap)
		} else {
			// Unknown type - default to string
			sb.WriteString("\"test\"")
		}
	} else {
		sb.WriteString("null")
	}
}
