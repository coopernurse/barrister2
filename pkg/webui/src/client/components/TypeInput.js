// TypeInput component - recursive component for rendering inputs based on type

import m from 'mithril'
import { resolveType, findStruct, findEnum, getStructFields } from '../utils/types.js';

const TypeInput = {
    view(vnode) {
        const { type, value, onchange, registry, optional = false, path = '' } = vnode.attrs;
        
        if (!type) {
            return m('div.text-muted', 'No type specified');
        }
        
        const resolved = resolveType(type);
        const isOptional = optional;
        
        // Handle optional types - show checkbox to include/exclude
        if (isOptional && (value === null || value === undefined)) {
            return m('div.type-input-container', [
                m('div.form-check', [
                    m('input.form-check-input[type=checkbox]', {
                        checked: value !== null && value !== undefined,
                        onchange: (e) => {
                            if (e.target.checked) {
                                // Initialize with default based on type
                                const defaultValue = this.getDefaultValue(type, registry);
                                onchange(defaultValue);
                            } else {
                                onchange(null);
                            }
                        }
                    }),
                    m('label.form-check-label', 'Include (optional)')
                ])
            ]);
        }
        
        switch (resolved.kind) {
            case 'builtin':
                return this.renderBuiltin(resolved.type, value, onchange, path);
            case 'array':
                return this.renderArray(resolved.elementType, type.array, value, onchange, registry, path);
            case 'map':
                return this.renderMap(resolved.valueType, type.mapValue, value, onchange, registry, path);
            case 'userDefined':
                return this.renderUserDefined(resolved.name, value, onchange, registry, path);
            default:
                return m('div.text-danger', 'Unknown type: ' + JSON.stringify(type));
        }
    },
    
    renderBuiltin(builtinType, value, onchange, path) {
        const inputId = path || 'input-' + Math.random().toString(36).substr(2, 9);
        
        switch (builtinType) {
            case 'string':
                return m('input.form-control[type=text]', {
                    id: inputId,
                    value: value || '',
                    oninput: (e) => onchange(e.target.value),
                    placeholder: 'Enter string'
                });
            case 'int':
                return m('input.form-control[type=number][step=1]', {
                    id: inputId,
                    value: value !== null && value !== undefined ? value : '',
                    oninput: (e) => {
                        const val = e.target.value;
                        onchange(val === '' ? null : parseInt(val, 10));
                    },
                    placeholder: 'Enter integer'
                });
            case 'float':
                return m('input.form-control[type=number][step=any]', {
                    id: inputId,
                    value: value !== null && value !== undefined ? value : '',
                    oninput: (e) => {
                        const val = e.target.value;
                        onchange(val === '' ? null : parseFloat(val));
                    },
                    placeholder: 'Enter number'
                });
            case 'bool':
                return m('div.form-check', [
                    m('input.form-check-input[type=checkbox]', {
                        id: inputId,
                        checked: value === true,
                        onchange: (e) => onchange(e.target.checked)
                    }),
                    m('label.form-check-label', { for: inputId }, 'True')
                ]);
            default:
                return m('div.text-danger', 'Unknown builtin type: ' + builtinType);
        }
    },
    
    renderArray(elementType, elementTypeDef, value, onchange, registry, path) {
        const items = value || [];
        
        return m('div.type-input-container', [
            m('div.d-flex.justify-content-between.align-items-center.mb-2', [
                m('strong', 'Array'),
                m('button.btn.btn-sm.btn-primary', {
                    onclick: () => {
                        const newItem = this.getDefaultValue(elementTypeDef, registry);
                        onchange([...items, newItem]);
                    }
                }, '+ Add Item')
            ]),
            items.map((item, index) =>
                m('div.array-item', {
                    key: path + '[' + index + ']'
                }, [
                    m('div.flex-grow-1', 
                        m(TypeInput, {
                            type: elementTypeDef,
                            value: item,
                            onchange: (newValue) => {
                                const newItems = [...items];
                                newItems[index] = newValue;
                                onchange(newItems);
                            },
                            registry: registry,
                            path: path + '[' + index + ']'
                        })
                    ),
                    m('button.btn.btn-sm.btn-outline-danger', {
                        onclick: () => {
                            const newItems = items.filter((_, i) => i !== index);
                            onchange(newItems);
                        }
                    }, '−')
                ])
            ),
            items.length === 0 && m('div.text-muted.small', 'No items. Click "+ Add Item" to add one.')
        ]);
    },
    
    renderMap(valueType, valueTypeDef, value, onchange, registry, path) {
        const entries = value || {};
        const entriesList = Object.entries(entries);
        
        return m('div.type-input-container', [
            m('div.d-flex.justify-content-between.align-items-center.mb-2', [
                m('strong', 'Map'),
                m('button.btn.btn-sm.btn-primary', {
                    onclick: () => {
                        const newKey = '';
                        const newValue = this.getDefaultValue(valueTypeDef, registry);
                        onchange({ ...entries, [newKey]: newValue });
                    }
                }, '+ Add Entry')
            ]),
            entriesList.map(([key, val]) =>
                m('div.map-item', {
                    key: path + '.' + key
                }, [
                    m('input.form-control[type=text][placeholder=Key]', {
                        value: key,
                        oninput: (e) => {
                            const newKey = e.target.value;
                            const newEntries = { ...entries };
                            delete newEntries[key];
                            newEntries[newKey] = val;
                            onchange(newEntries);
                        }
                    }),
                    m('div.flex-grow-1',
                        m(TypeInput, {
                            type: valueTypeDef,
                            value: val,
                            onchange: (newValue) => {
                                onchange({ ...entries, [key]: newValue });
                            },
                            registry: registry,
                            path: path + '.' + key
                        })
                    ),
                    m('button.btn.btn-sm.btn-outline-danger', {
                        onclick: () => {
                            const newEntries = { ...entries };
                            delete newEntries[key];
                            onchange(newEntries);
                        }
                    }, '−')
                ])
            ),
            entriesList.length === 0 && m('div.text-muted.small', 'No entries. Click "+ Add Entry" to add one.')
        ]);
    },
    
    renderUserDefined(typeName, value, onchange, registry, path) {
        // Check if it's a struct
        const struct = findStruct(typeName, registry);
        if (struct) {
            return this.renderStruct(struct, value, onchange, registry, path);
        }
        
        // Check if it's an enum
        const enumDef = findEnum(typeName, registry);
        if (enumDef) {
            return this.renderEnum(enumDef, value, onchange);
        }
        
        return m('div.text-warning', 'Unknown user-defined type: ' + typeName);
    },
    
    renderStruct(struct, value, onchange, registry, path) {
        const fields = getStructFields(struct.name, registry);
        const currentValue = value || {};
        
        return m('div.type-input-container.nested', [
            m('div.mb-2', [
                m('strong', struct.name),
                struct.comment && m('div.small.text-muted', struct.comment)
            ]),
            fields.map(field => {
                const fieldPath = path ? path + '.' + field.name : field.name;
                return m('div.mb-2', [
                    m('label.form-label.small', [
                        field.name,
                        field.optional && m('span.text-muted', ' (optional)'),
                        field.comment && m('span.text-muted.ml-1', '// ' + field.comment)
                    ]),
                    m(TypeInput, {
                        type: field.type,
                        value: currentValue[field.name],
                        onchange: (newValue) => {
                            onchange({ ...currentValue, [field.name]: newValue });
                        },
                        registry: registry,
                        optional: field.optional,
                        path: fieldPath
                    })
                ]);
            })
        ]);
    },
    
    renderEnum(enumDef, value, onchange) {
        return m('select.form-select', {
            value: value || '',
            onchange: (e) => onchange(e.target.value || null)
        }, [
            m('option[value=]', '-- Select --'),
            ...enumDef.values.map(enumValue =>
                m('option[value=' + enumValue.name + ']', enumValue.name)
            )
        ]);
    },
    
    getDefaultValue(typeDef, registry) {
        if (!typeDef) return null;
        
        const resolved = resolveType(typeDef);
        
        switch (resolved.kind) {
            case 'builtin':
                switch (resolved.type) {
                    case 'string': return '';
                    case 'int': return 0;
                    case 'float': return 0.0;
                    case 'bool': return false;
                    default: return null;
                }
            case 'array':
                return [];
            case 'map':
                return {};
            case 'userDefined': {
                const struct = findStruct(resolved.name, registry);
                if (struct) {
                    const fields = getStructFields(struct.name, registry);
                    const obj = {};
                    fields.forEach(field => {
                        if (!field.optional) {
                            obj[field.name] = this.getDefaultValue(field.type, registry);
                        }
                    });
                    return obj;
                }
                return null;
            }
            default:
                return null;
        }
    }
};

export default TypeInput;

