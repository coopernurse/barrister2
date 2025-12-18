package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/coopernurse/barrister2/pkg/parser"
)

func main() {
	var validate = flag.Bool("validate", false, "Validate the IDL after parsing")
	flag.Parse()

	args := flag.Args()
	if len(args) == 0 {
		fmt.Fprintf(os.Stderr, "error: filename required\n")
		os.Exit(1)
	}

	filename := args[0]

	// Check if file exists
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "error: file does not exist: %s\n", filename)
		os.Exit(1)
	}

	// Read file content
	content, err := os.ReadFile(filename)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: failed to read file %s: %v\n", filename, err)
		os.Exit(1)
	}

	// Parse IDL
	idl, err := parser.ParseIDL(string(content))
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}

	// Validate if flag is set
	if *validate {
		if err := parser.ValidateIDL(idl); err != nil {
			fmt.Fprintf(os.Stderr, "error: validation failed: %v\n", err)
			os.Exit(1)
		}
	}

	// Pretty print to STDOUT
	prettyPrintIDL(idl)
}

func prettyPrintIDL(idl *parser.IDL) {
	if len(idl.Interfaces) > 0 {
		fmt.Println("Interfaces:")
		for _, iface := range idl.Interfaces {
			fmt.Printf("  %s:\n", iface.Name)
			fmt.Println("    Methods:")
			for _, method := range iface.Methods {
				fmt.Printf("      %s(", method.Name)
				for i, param := range method.Parameters {
					if i > 0 {
						fmt.Print(", ")
					}
					fmt.Printf("%s %s", param.Name, param.Type.String())
				}
				fmt.Printf(") %s\n", method.ReturnType.String())
			}
		}
	}

	if len(idl.Structs) > 0 {
		fmt.Println("Structs:")
		for _, s := range idl.Structs {
			if s.Extends != "" {
				fmt.Printf("  %s extends %s:\n", s.Name, s.Extends)
			} else {
				fmt.Printf("  %s:\n", s.Name)
			}
			fmt.Println("    Fields:")
			for _, field := range s.Fields {
				optional := ""
				if field.Optional {
					optional = " [optional]"
				}
				fmt.Printf("      %s: %s%s\n", field.Name, field.Type.String(), optional)
			}
		}
	}

	if len(idl.Enums) > 0 {
		fmt.Println("Enums:")
		for _, enum := range idl.Enums {
			fmt.Printf("  %s:\n", enum.Name)
			fmt.Print("    Values: ")
			for i, value := range enum.Values {
				if i > 0 {
					fmt.Print(", ")
				}
				fmt.Print(value)
			}
			fmt.Println()
		}
	}
}
