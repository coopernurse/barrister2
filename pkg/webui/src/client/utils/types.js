// Type resolution utilities for PulseRPC IDL

/**
 * Build a type registry from IDL
 */
export function buildTypeRegistry(idl) {
    const registry = {
        structs: new Map(),
        enums: new Map(),
        interfaces: new Map()
    };
    
    // Index structs
    if (idl.structs) {
        for (const s of idl.structs) {
            registry.structs.set(s.name, s);
        }
    }
    
    // Index enums
    if (idl.enums) {
        for (const e of idl.enums) {
            registry.enums.set(e.name, e);
        }
    }
    
    // Index interfaces
    if (idl.interfaces) {
        for (const iface of idl.interfaces) {
            registry.interfaces.set(iface.name, iface);
        }
    }
    
    return registry;
}

/**
 * Find a struct by name (handles qualified names)
 */
export function findStruct(name, registry) {
    // Try exact match first
    if (registry.structs.has(name)) {
        return registry.structs.get(name);
    }
    
    // Try without namespace (base name)
    const baseName = name.split('.').pop();
    for (const [key, struct] of registry.structs) {
        if (key === baseName || key.endsWith('.' + baseName)) {
            return struct;
        }
    }
    
    return null;
}

/**
 * Find an enum by name (handles qualified names)
 */
export function findEnum(name, registry) {
    // Try exact match first
    if (registry.enums.has(name)) {
        return registry.enums.get(name);
    }
    
    // Try without namespace (base name)
    const baseName = name.split('.').pop();
    for (const [key, enumDef] of registry.enums) {
        if (key === baseName || key.endsWith('.' + baseName)) {
            return enumDef;
        }
    }
    
    return null;
}

/**
 * Get all fields for a struct, including inherited fields
 */
export function getStructFields(structName, registry) {
    const struct = findStruct(structName, registry);
    if (!struct) return [];
    
    const fields = [];
    
    // Add fields from parent if extends is set
    if (struct.extends) {
        const parentFields = getStructFields(struct.extends, registry);
        fields.push(...parentFields);
    }
    
    // Add own fields
    if (struct.fields) {
        fields.push(...struct.fields);
    }
    
    return fields;
}

/**
 * Check if a type is optional (for method return types)
 */
export function isOptionalType(typeDef) {
    // This would be set on the method definition, not the type itself
    // For now, we'll check if the type allows null
    return typeDef === null || typeDef === undefined;
}

/**
 * Resolve a type definition to understand its structure
 */
export function resolveType(typeDef) {
    if (!typeDef) return { kind: 'unknown' };
    
    if (typeDef.builtIn) {
        return { kind: 'builtin', type: typeDef.builtIn };
    }
    
    if (typeDef.array) {
        return { kind: 'array', elementType: resolveType(typeDef.array) };
    }
    
    if (typeDef.mapValue) {
        return { kind: 'map', valueType: resolveType(typeDef.mapValue) };
    }
    
    if (typeDef.userDefined) {
        return { kind: 'userDefined', name: typeDef.userDefined };
    }
    
    return { kind: 'unknown' };
}

