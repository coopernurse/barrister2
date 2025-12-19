"""Tests for type helper functions"""

from barrister2 import find_struct, find_enum, get_struct_fields


def test_find_struct():
    all_structs = {
        'User': {'fields': []},
        'Book': {'fields': []},
    }
    assert find_struct('User', all_structs) == {'fields': []}
    assert find_struct('Book', all_structs) == {'fields': []}
    assert find_struct('NotFound', all_structs) is None


def test_find_enum():
    all_enums = {
        'Platform': {'values': []},
    }
    assert find_enum('Platform', all_enums) == {'values': []}
    assert find_enum('NotFound', all_enums) is None


def test_get_struct_fields_simple():
    all_structs = {
        'User': {
            'fields': [
                {'name': 'id', 'type': {'builtIn': 'string'}},
                {'name': 'name', 'type': {'builtIn': 'string'}},
            ]
        }
    }
    fields = get_struct_fields('User', all_structs)
    assert len(fields) == 2
    assert fields[0]['name'] == 'id'
    assert fields[1]['name'] == 'name'


def test_get_struct_fields_with_extends():
    all_structs = {
        'Base': {
            'fields': [
                {'name': 'id', 'type': {'builtIn': 'string'}},
            ]
        },
        'User': {
            'extends': 'Base',
            'fields': [
                {'name': 'name', 'type': {'builtIn': 'string'}},
            ]
        }
    }
    fields = get_struct_fields('User', all_structs)
    assert len(fields) == 2
    assert fields[0]['name'] == 'id'  # Parent field first
    assert fields[1]['name'] == 'name'  # Child field second


def test_get_struct_fields_override_parent():
    all_structs = {
        'Base': {
            'fields': [
                {'name': 'id', 'type': {'builtIn': 'string'}},
            ]
        },
        'User': {
            'extends': 'Base',
            'fields': [
                {'name': 'id', 'type': {'builtIn': 'int'}},  # Override parent
                {'name': 'name', 'type': {'builtIn': 'string'}},
            ]
        }
    }
    fields = get_struct_fields('User', all_structs)
    assert len(fields) == 2
    # Child field should override parent
    assert fields[0]['type']['builtIn'] == 'int'
    assert fields[1]['name'] == 'name'

