package main

import (
	"fmt"
	"github.com/coopernurse/barrister2/pkg/parser"
)

func main() {
	// Test parsing a type expression
	expr, err := parser.ParseIDL(`struct Test {
  field []map[string]int
}`)
	if err != nil {
		fmt.Printf("Parse error: %v\n", err)
	} else {
		fmt.Printf("Parsed successfully\n")
	}
}
