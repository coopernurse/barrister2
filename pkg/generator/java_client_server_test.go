package generator

import (
	"flag"
	"os"
	"path/filepath"
	"testing"

	"github.com/coopernurse/barrister2/pkg/parser"
)

func TestJavaGeneratorBasicFiles(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "barrister-java-gen-")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer func() { _ = os.RemoveAll(tmpDir) }()

	// Build a minimal IDL with one namespace, a struct and an enum
	idl := &parser.IDL{
		Structs: []*parser.Struct{
			{
				Name:      "inc.Req",
				Namespace: "inc",
				Fields:    []*parser.Field{{Name: "msg", Type: &parser.Type{BuiltIn: "string"}}},
			},
		},
		Enums: []*parser.Enum{
			{
				Name:      "inc.Status",
				Namespace: "inc",
				Values:    []*parser.EnumValue{{Name: "ok"}},
			},
		},
		Interfaces: []*parser.Interface{
			{
				Name:      "A",
				Namespace: "",
			},
		},
	}

	p := NewJavaClientServer()
	fs := flag.NewFlagSet("test", flag.ContinueOnError)
	// ensure dir flag exists
	fs.String("dir", "", "output dir")
	p.RegisterFlags(fs)
	if err := fs.Set("dir", tmpDir); err != nil {
		t.Fatalf("failed to set dir flag: %v", err)
	}
	if err := fs.Set("base-package", "com.example"); err != nil {
		t.Fatalf("failed to set base-package flag: %v", err)
	}

	if err := p.Generate(idl, fs); err != nil {
		t.Fatalf("Generate failed: %v", err)
	}

	// Check namespace Idl file
	nsPath := filepath.Join(tmpDir, "com", "example", "inc", "incIdl.java")
	if _, err := os.Stat(nsPath); err != nil {
		t.Fatalf("expected namespace idl file at %s, missing: %v", nsPath, err)
	}

	// Check Server.java and Client.java in base package
	serverPath := filepath.Join(tmpDir, "com", "example", "Server.java")
	if _, err := os.Stat(serverPath); err != nil {
		t.Fatalf("expected Server.java at %s, missing: %v", serverPath, err)
	}
	clientPath := filepath.Join(tmpDir, "com", "example", "Client.java")
	if _, err := os.Stat(clientPath); err != nil {
		t.Fatalf("expected Client.java at %s, missing: %v", clientPath, err)
	}
}
