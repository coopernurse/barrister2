# Parser Limitations

This document outlines the limitations discovered in the IDL parser during comprehensive unit testing, and tracks which issues have been resolved and which remain.

---

## ✅ Implemented Fixes

The following limitations have been addressed and are now working:

### 1. Cycle Detection ✅

**Status:** Implemented  
**Severity:** High (was)  
**Test Cases:** All cycle detection tests now pass

**Implementation:**
- Added `detectCycles()` function using depth-first search
- Detects cycles in:
  - Direct self-references (without optional)
  - Indirect cycles between structs
  - Cycles through extends relationships
  - Cycles in arrays (`[]Node`)
  - Cycles in maps (`map[string]Node`)
- Correctly allows cycles when fields are marked `[optional]`
- Reports clear error messages with cycle paths

**Location:** `pkg/parser/validator.go` - `detectCycles()` function

---

### 2. Duplicate Type Name Validation ✅

**Status:** Implemented  
**Severity:** Medium (was)  
**Test Case:** `TestDuplicateTypeNames`

**Implementation:**
- Added duplicate name checking during type registration phase
- Tracks type names and their positions
- Reports duplicates with position information showing both definitions
- Prevents ambiguity about which definition to use

**Location:** `pkg/parser/validator.go` - `ValidateIDL()` function

---

### 3. Map Type Parsing and Validation ✅

**Status:** Fixed  
**Severity:** Medium (was)  
**Test Cases:** `TestValidMapTypes`, `TestCycleDetectionInMapWithOptional`

**Implementation:**
- Fixed map type parsing to correctly handle value types
- Maps now parse and validate correctly: `map[string]string`, `map[string]int`, etc.
- Resolved token concatenation issues
- Post-processing extracts full type expressions for nested map values

**Location:** `pkg/parser/parser.go` - `MapTypeExpr` and `parseNestedTypes()`

---

### 4. Array Type Parsing Issue with `int` ✅

**Status:** Fixed  
**Severity:** Medium (was)  
**Test Case:** `TestAllBuiltInTypes`

**Implementation:**
- Resolved parsing issues with `[]int`
- All array types now parse correctly: `[]string`, `[]int`, `[]float`, `[]bool`
- Fixed through grammar improvements and post-processing

**Location:** `pkg/parser/parser.go` - `ArrayType` grammar and post-processing

---

### 5. Error Position Reporting ✅

**Status:** Implemented  
**Severity:** Low (was)  
**Test Case:** `TestInvalidExtendsNonExistentType`

**Implementation:**
- Added `Pos` field to all IDL structures (`Type`, `Interface`, `Struct`, `Field`, etc.)
- Position information propagated through conversion process
- All validation errors now include actual line and column numbers
- Error messages are more helpful for debugging

**Location:** 
- `pkg/parser/idl.go` - Added `Pos` fields
- `pkg/parser/parser.go` - Position propagation in `ParseIDL()`
- `pkg/parser/validator.go` - Uses positions in all error messages

---

### 6. Nested Types (Full) ✅

**Status:** Fully Implemented
**Severity:** High (was)
**Test Cases:** `TestValidNestedTypes`, `TestValidNestedArrayWithMaps`, `TestValidTwoDimensionalArray`, `TestValidThreeDimensionalArray`, `TestValidArrayOfArraysOfUserDefinedTypes`

**What Works:**
- `[]map[string]int` - Array of maps
- `map[string][]string` - Map with array values
- `[][]string` - Multi-dimensional arrays
- `[][][]int` - Three-dimensional arrays
- `[][]User` - Arrays of arrays of user-defined types
- Complex nested combinations of arrays and maps

**Implementation:**
- Modified grammar to use recursive TypeExpr parsing
- ArrayType and MapTypeExpr now capture nested ElementType/ValueType directly via `@@` grammar rules
- Post-processing handles recursive type resolution
- Eliminates need for complex string extraction and re-parsing

**Location:** `pkg/parser/parser.go` - `TypeExpr`, `ArrayType`, `MapTypeExpr`, `parseNestedTypes()`

---


---

## Summary

### Implemented (6 items)
1. ✅ Cycle detection with DFS algorithm
2. ✅ Duplicate type name validation
3. ✅ Map type parsing fixes
4. ✅ Array type parsing fixes (including `[]int`)
5. ✅ Error position reporting
6. ✅ Nested types (full support for arrays and maps)

### Remaining (0 items)

**All high-priority parser limitations have been resolved.** The parser now supports:
- Multi-dimensional arrays (`[][]string`, `[][][]int`)
- Maps with array values (`map[string][]string`)
- Complex nested combinations of arrays and maps
- All fundamental type system features needed for comprehensive IDL parsing

**Technical Solution:**
The implementation uses recursive grammar rules in participle, where `ArrayType` and `MapTypeExpr` directly reference `TypeExpr` via `@@` grammar directives. This allows the parser to handle arbitrary nesting levels without requiring pre-processing or string manipulation.

---

## Test Coverage

All limitations (both implemented and remaining) are covered by unit tests in `pkg/parser/parser_test.go`. The tests:
- Document expected behavior
- Verify current functionality
- Provide regression testing

Tests for implemented features now pass. Tests for remaining limitations are marked to expect parse errors until a complete solution is implemented.
