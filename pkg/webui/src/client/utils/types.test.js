import { describe, it, expect } from 'vitest';
import {
    buildTypeRegistry,
    findStruct,
    findEnum,
    getStructFields,
    resolveType
} from './types.js';

describe('buildTypeRegistry', () => {
    it('should build registry from IDL with structs, enums, and interfaces', () => {
        const idl = {
            structs: [
                { name: 'User', fields: [{ name: 'id', type: { builtIn: 'int' } }] }
            ],
            enums: [
                { name: 'Status', values: [{ name: 'ACTIVE' }, { name: 'INACTIVE' }] }
            ],
            interfaces: [
                { name: 'UserService', methods: [] }
            ]
        };

        const registry = buildTypeRegistry(idl);

        expect(registry.structs.has('User')).toBe(true);
        expect(registry.enums.has('Status')).toBe(true);
        expect(registry.interfaces.has('UserService')).toBe(true);
    });

    it('should handle empty IDL', () => {
        const idl = {};
        const registry = buildTypeRegistry(idl);

        expect(registry.structs.size).toBe(0);
        expect(registry.enums.size).toBe(0);
        expect(registry.interfaces.size).toBe(0);
    });

    it('should handle IDL with missing sections', () => {
        const idl = {
            structs: [{ name: 'User', fields: [] }]
        };
        const registry = buildTypeRegistry(idl);

        expect(registry.structs.has('User')).toBe(true);
        expect(registry.enums.size).toBe(0);
        expect(registry.interfaces.size).toBe(0);
    });
});

describe('findStruct', () => {
    let registry;

    beforeEach(() => {
        registry = buildTypeRegistry({
            structs: [
                { name: 'User', fields: [] },
                { name: 'com.example.Profile', fields: [] }
            ]
        });
    });

    it('should find struct by exact name', () => {
        const struct = findStruct('User', registry);
        expect(struct).not.toBeNull();
        expect(struct.name).toBe('User');
    });

    it('should find struct by base name when namespace is omitted', () => {
        const struct = findStruct('Profile', registry);
        expect(struct).not.toBeNull();
        expect(struct.name).toBe('com.example.Profile');
    });

    it('should return null for non-existent struct', () => {
        const struct = findStruct('NonExistent', registry);
        expect(struct).toBeNull();
    });
});

describe('findEnum', () => {
    let registry;

    beforeEach(() => {
        registry = buildTypeRegistry({
            enums: [
                { name: 'Status', values: [] },
                { name: 'com.example.Role', values: [] }
            ]
        });
    });

    it('should find enum by exact name', () => {
        const enumDef = findEnum('Status', registry);
        expect(enumDef).not.toBeNull();
        expect(enumDef.name).toBe('Status');
    });

    it('should find enum by base name when namespace is omitted', () => {
        const enumDef = findEnum('Role', registry);
        expect(enumDef).not.toBeNull();
        expect(enumDef.name).toBe('com.example.Role');
    });

    it('should return null for non-existent enum', () => {
        const enumDef = findEnum('NonExistent', registry);
        expect(enumDef).toBeNull();
    });
});

describe('getStructFields', () => {
    it('should return fields from struct', () => {
        const registry = buildTypeRegistry({
            structs: [
                {
                    name: 'User',
                    fields: [
                        { name: 'id', type: { builtIn: 'int' } },
                        { name: 'name', type: { builtIn: 'string' } }
                    ]
                }
            ]
        });

        const fields = getStructFields('User', registry);
        expect(fields.length).toBe(2);
        expect(fields[0].name).toBe('id');
        expect(fields[1].name).toBe('name');
    });

    it('should include inherited fields from parent struct', () => {
        const registry = buildTypeRegistry({
            structs: [
                {
                    name: 'Base',
                    fields: [
                        { name: 'id', type: { builtIn: 'int' } }
                    ]
                },
                {
                    name: 'User',
                    extends: 'Base',
                    fields: [
                        { name: 'name', type: { builtIn: 'string' } }
                    ]
                }
            ]
        });

        const fields = getStructFields('User', registry);
        expect(fields.length).toBe(2);
        expect(fields[0].name).toBe('id');
        expect(fields[1].name).toBe('name');
    });

    it('should handle struct with no fields', () => {
        const registry = buildTypeRegistry({
            structs: [
                { name: 'Empty', fields: [] }
            ]
        });

        const fields = getStructFields('Empty', registry);
        expect(fields.length).toBe(0);
    });

    it('should return empty array for non-existent struct', () => {
        const registry = buildTypeRegistry({ structs: [] });
        const fields = getStructFields('NonExistent', registry);
        expect(fields.length).toBe(0);
    });
});

describe('resolveType', () => {
    it('should resolve builtin type', () => {
        const resolved = resolveType({ builtIn: 'string' });
        expect(resolved.kind).toBe('builtin');
        expect(resolved.type).toBe('string');
    });

    it('should resolve array type', () => {
        const resolved = resolveType({
            array: { builtIn: 'int' }
        });
        expect(resolved.kind).toBe('array');
        expect(resolved.elementType.kind).toBe('builtin');
        expect(resolved.elementType.type).toBe('int');
    });

    it('should resolve map type', () => {
        const resolved = resolveType({
            mapValue: { builtIn: 'string' }
        });
        expect(resolved.kind).toBe('map');
        expect(resolved.valueType.kind).toBe('builtin');
        expect(resolved.valueType.type).toBe('string');
    });

    it('should resolve user-defined type', () => {
        const resolved = resolveType({
            userDefined: 'User'
        });
        expect(resolved.kind).toBe('userDefined');
        expect(resolved.name).toBe('User');
    });

    it('should handle nested array types', () => {
        const resolved = resolveType({
            array: {
                array: { builtIn: 'int' }
            }
        });
        expect(resolved.kind).toBe('array');
        expect(resolved.elementType.kind).toBe('array');
        expect(resolved.elementType.elementType.kind).toBe('builtin');
    });

    it('should return unknown for null/undefined', () => {
        expect(resolveType(null).kind).toBe('unknown');
        expect(resolveType(undefined).kind).toBe('unknown');
    });

    it('should return unknown for invalid type', () => {
        const resolved = resolveType({ invalid: 'type' });
        expect(resolved.kind).toBe('unknown');
    });
});

