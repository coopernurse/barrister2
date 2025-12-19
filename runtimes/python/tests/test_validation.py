"""Tests for validation functions"""

import pytest
from barrister2 import (
    validate_string,
    validate_int,
    validate_float,
    validate_bool,
    validate_array,
    validate_map,
    validate_enum,
    validate_struct,
    validate_type,
)


class TestBuiltInTypes:
    """Test built-in type validators"""
    
    def test_validate_string_success(self):
        validate_string("hello")
        validate_string("")
    
    def test_validate_string_failure(self):
        with pytest.raises(TypeError, match="Expected string"):
            validate_string(123)
        with pytest.raises(TypeError, match="Expected string"):
            validate_string(None)
    
    def test_validate_int_success(self):
        validate_int(0)
        validate_int(42)
        validate_int(-100)
    
    def test_validate_int_failure(self):
        with pytest.raises(TypeError, match="Expected int"):
            validate_int("123")
        with pytest.raises(TypeError, match="Expected int"):
            validate_int(3.14)
    
    def test_validate_float_success(self):
        validate_float(3.14)
        validate_float(42)  # int is acceptable
        validate_float(-1.5)
    
    def test_validate_float_failure(self):
        with pytest.raises(TypeError, match="Expected float"):
            validate_float("3.14")
        with pytest.raises(TypeError, match="Expected float"):
            validate_float(None)
    
    def test_validate_bool_success(self):
        validate_bool(True)
        validate_bool(False)
    
    def test_validate_bool_failure(self):
        with pytest.raises(TypeError, match="Expected bool"):
            validate_bool(1)
        with pytest.raises(TypeError, match="Expected bool"):
            validate_bool("true")


class TestArrayValidation:
    """Test array validation"""
    
    def test_validate_array_success(self):
        element_validator = lambda v: validate_string(v)
        validate_array(["a", "b", "c"], element_validator)
        validate_array([], element_validator)
    
    def test_validate_array_wrong_type(self):
        element_validator = lambda v: validate_string(v)
        with pytest.raises(TypeError, match="Expected list"):
            validate_array("not a list", element_validator)
        with pytest.raises(TypeError, match="Expected list"):
            validate_array({}, element_validator)
    
    def test_validate_array_element_validation_fails(self):
        element_validator = lambda v: validate_string(v)
        with pytest.raises(ValueError, match="Array element at index 1"):
            validate_array(["a", 123, "c"], element_validator)


class TestMapValidation:
    """Test map validation"""
    
    def test_validate_map_success(self):
        value_validator = lambda v: validate_int(v)
        validate_map({"a": 1, "b": 2}, value_validator)
        validate_map({}, value_validator)
    
    def test_validate_map_wrong_type(self):
        value_validator = lambda v: validate_int(v)
        with pytest.raises(TypeError, match="Expected dict"):
            validate_map("not a dict", value_validator)
        with pytest.raises(TypeError, match="Expected dict"):
            validate_map([], value_validator)
    
    def test_validate_map_non_string_key(self):
        value_validator = lambda v: validate_int(v)
        with pytest.raises(TypeError, match="Map key must be string"):
            validate_map({123: 1}, value_validator)
    
    def test_validate_map_value_validation_fails(self):
        value_validator = lambda v: validate_int(v)
        with pytest.raises(ValueError, match="Map value for key 'a'"):
            validate_map({"a": "not an int"}, value_validator)


class TestEnumValidation:
    """Test enum validation"""
    
    def test_validate_enum_success(self):
        validate_enum("kindle", "Platform", ["kindle", "nook"])
        validate_enum("nook", "Platform", ["kindle", "nook"])
    
    def test_validate_enum_wrong_type(self):
        with pytest.raises(TypeError, match="Expected string for enum"):
            validate_enum(123, "Platform", ["kindle", "nook"])
    
    def test_validate_enum_invalid_value(self):
        with pytest.raises(ValueError, match="Invalid value for enum"):
            validate_enum("invalid", "Platform", ["kindle", "nook"])


class TestStructValidation:
    """Test struct validation"""
    
    def test_validate_struct_success(self):
        all_structs = {
            'User': {
                'fields': [
                    {'name': 'id', 'type': {'builtIn': 'string'}, 'optional': False},
                    {'name': 'name', 'type': {'builtIn': 'string'}, 'optional': False},
                ]
            }
        }
        all_enums = {}
        struct_def = all_structs['User']
        
        validate_struct(
            {'id': '123', 'name': 'Alice'},
            'User',
            struct_def,
            all_structs,
            all_enums
        )
    
    def test_validate_struct_missing_required_field(self):
        all_structs = {
            'User': {
                'fields': [
                    {'name': 'id', 'type': {'builtIn': 'string'}, 'optional': False},
                ]
            }
        }
        all_enums = {}
        struct_def = all_structs['User']
        
        with pytest.raises(ValueError, match="Missing required field"):
            validate_struct({}, 'User', struct_def, all_structs, all_enums)
    
    def test_validate_struct_optional_field(self):
        all_structs = {
            'User': {
                'fields': [
                    {'name': 'id', 'type': {'builtIn': 'string'}, 'optional': False},
                    {'name': 'email', 'type': {'builtIn': 'string'}, 'optional': True},
                ]
            }
        }
        all_enums = {}
        struct_def = all_structs['User']
        
        # Should work without optional field
        validate_struct({'id': '123'}, 'User', struct_def, all_structs, all_enums)
        
        # Should work with optional field
        validate_struct(
            {'id': '123', 'email': 'alice@example.com'},
            'User',
            struct_def,
            all_structs,
            all_enums
        )
    
    def test_validate_struct_with_extends(self):
        all_structs = {
            'Base': {
                'fields': [
                    {'name': 'id', 'type': {'builtIn': 'string'}, 'optional': False},
                ]
            },
            'User': {
                'extends': 'Base',
                'fields': [
                    {'name': 'name', 'type': {'builtIn': 'string'}, 'optional': False},
                ]
            }
        }
        all_enums = {}
        struct_def = all_structs['User']
        
        # Should validate both parent and child fields
        validate_struct(
            {'id': '123', 'name': 'Alice'},
            'User',
            struct_def,
            all_structs,
            all_enums
        )
        
        # Should fail if parent field missing
        with pytest.raises(ValueError, match="Missing required field"):
            validate_struct({'name': 'Alice'}, 'User', struct_def, all_structs, all_enums)


class TestTypeValidation:
    """Test main validate_type function"""
    
    def test_validate_type_string(self):
        all_structs = {}
        all_enums = {}
        validate_type("hello", {'builtIn': 'string'}, all_structs, all_enums)
    
    def test_validate_type_optional_none(self):
        all_structs = {}
        all_enums = {}
        validate_type(None, {'builtIn': 'string'}, all_structs, all_enums, is_optional=True)
        
        with pytest.raises(ValueError, match="cannot be None"):
            validate_type(None, {'builtIn': 'string'}, all_structs, all_enums, is_optional=False)
    
    def test_validate_type_array(self):
        all_structs = {}
        all_enums = {}
        type_def = {'array': {'builtIn': 'string'}}
        validate_type(["a", "b"], type_def, all_structs, all_enums)
        
        with pytest.raises(ValueError):
            validate_type(["a", 123], type_def, all_structs, all_enums)
    
    def test_validate_type_map(self):
        all_structs = {}
        all_enums = {}
        type_def = {'mapValue': {'builtIn': 'int'}}
        validate_type({"a": 1, "b": 2}, type_def, all_structs, all_enums)
        
        with pytest.raises(ValueError):
            validate_type({"a": "not int"}, type_def, all_structs, all_enums)

