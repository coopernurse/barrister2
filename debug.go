package main

import (
	"fmt"
	"github.com/coopernurse/barrister2/pkg/parser"
)

func main() {
	// Test parsing a type expression
	_, err := parser.ParseIDL(`struct Test {
  mapOfArrays map[string][]string
}`)
	if err != nil {
		fmt.Printf("Parse error: %v\n", err)
	} else {
		fmt.Printf("Parsed successfully\n")
	}
}
