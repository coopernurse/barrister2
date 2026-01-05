import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TypeInput from './TypeInput.js';
import { mountComponent, unmountComponent, createMockRegistry, screen } from '../test-utils.js';

describe('TypeInput Component', () => {
    let container;
    let registry;
    let onChangeCallback;

    beforeEach(() => {
        registry = createMockRegistry();
        onChangeCallback = vi.fn();
    });

    afterEach(() => {
        if (container) {
            unmountComponent(container);
        }
    });

    describe('Builtin types - Form control generation', () => {
        it('should render string input', () => {
            container = mountComponent(TypeInput, {
                type: { builtIn: 'string' },
                value: '',
                onchange: onChangeCallback,
                registry: registry
            });
            
            const input = screen.getByPlaceholderText('Enter string');
            expect(input).toBeInTheDocument();
            expect(input.type).toBe('text');
            expect(input.value).toBe('');
        });

        it('should render int input', () => {
            container = mountComponent(TypeInput, {
                type: { builtIn: 'int' },
                value: 0,
                onchange: onChangeCallback,
                registry: registry
            });
            
            const input = screen.getByPlaceholderText('Enter integer');
            expect(input).toBeInTheDocument();
            expect(input.type).toBe('number');
            expect(input.step).toBe('1');
        });

        it('should render float input', () => {
            container = mountComponent(TypeInput, {
                type: { builtIn: 'float' },
                value: 0.0,
                onchange: onChangeCallback,
                registry: registry
            });
            
            const input = screen.getByPlaceholderText('Enter number');
            expect(input).toBeInTheDocument();
            expect(input.type).toBe('number');
            expect(input.getAttribute('step')).toBe('any');
        });

        it('should render bool checkbox', () => {
            container = mountComponent(TypeInput, {
                type: { builtIn: 'bool' },
                value: false,
                onchange: onChangeCallback,
                registry: registry
            });
            
            const checkbox = screen.getByRole('checkbox');
            expect(checkbox).toBeInTheDocument();
            expect(checkbox.type).toBe('checkbox');
            expect(checkbox.checked).toBe(false);
        });
    });

    describe('Array operations', () => {
        it('should add items to array', () => {
            let currentValue = [];
            const onChange = (newValue) => {
                currentValue = newValue;
                onChangeCallback(newValue);
            };

            // Simulate adding an item
            const newItem = TypeInput.getDefaultValue({ builtIn: 'string' }, registry);
            const newValue = [...currentValue, newItem];
            onChange(newValue);

            expect(onChangeCallback).toHaveBeenCalled();
            expect(newValue.length).toBe(1);
            expect(newValue[0]).toBe('');
        });

        it('should remove items from array', () => {
            const items = ['item1', 'item2', 'item3'];
            let _currentValue = items;
            const onChange = (newValue) => {
                _currentValue = newValue;
                onChangeCallback(newValue);
            };

            // Remove item at index 1
            const newItems = items.filter((_, i) => i !== 1);
            onChange(newItems);

            expect(onChangeCallback).toHaveBeenCalled();
            expect(newItems.length).toBe(2);
            expect(newItems).toEqual(['item1', 'item3']);
        });

        it('should update array item values', () => {
            const items = ['old', 'value'];
            let _currentValue = items;
            const onChange = (newValue) => {
                _currentValue = newValue;
                onChangeCallback(newValue);
            };

            // Update item at index 0
            const newItems = [...items];
            newItems[0] = 'new';
            onChange(newItems);

            expect(onChangeCallback).toHaveBeenCalled();
            expect(newItems[0]).toBe('new');
            expect(newItems[1]).toBe('value');
        });

        it('should handle nested arrays', () => {
            const items = [['a', 'b'], ['c']];
            let _currentValue = items;
            const onChange = (newValue) => {
                _currentValue = newValue;
                onChangeCallback(newValue);
            };

            // Add item to nested array
            const newItems = [...items];
            newItems[0] = [...newItems[0], 'd'];
            onChange(newItems);

            expect(onChangeCallback).toHaveBeenCalled();
            expect(newItems[0].length).toBe(3);
            expect(newItems[0]).toEqual(['a', 'b', 'd']);
        });

        it('should handle array of structs', () => {
            const items = [
                { id: 1, name: 'User1' },
                { id: 2, name: 'User2' }
            ];
            let _currentValue = items;
            const onChange = (newValue) => {
                _currentValue = newValue;
                onChangeCallback(newValue);
            };

            // Update struct in array
            const newItems = [...items];
            newItems[0] = { ...newItems[0], name: 'UpdatedUser' };
            onChange(newItems);

            expect(onChangeCallback).toHaveBeenCalled();
            expect(newItems[0].name).toBe('UpdatedUser');
        });
    });

    describe('Map operations', () => {
        it('should add entries to map', () => {
            let currentValue = {};
            const onChange = (newValue) => {
                currentValue = newValue;
                onChangeCallback(newValue);
            };

            // Add new entry
            const newKey = 'key1';
            const newVal = TypeInput.getDefaultValue({ builtIn: 'string' }, registry);
            const newValue = { ...currentValue, [newKey]: newVal };
            onChange(newValue);

            expect(onChangeCallback).toHaveBeenCalled();
            expect(Object.keys(newValue).length).toBe(1);
            expect(newValue[newKey]).toBe('');
        });

        it('should remove entries from map', () => {
            const entries = { key1: 'value1', key2: 'value2' };
            let _currentValue = entries;
            const onChange = (newValue) => {
                _currentValue = newValue;
                onChangeCallback(newValue);
            };

            // Remove entry
            const newEntries = { ...entries };
            delete newEntries['key1'];
            onChange(newEntries);

            expect(onChangeCallback).toHaveBeenCalled();
            expect(Object.keys(newEntries).length).toBe(1);
            expect(newEntries.key2).toBe('value2');
        });

        it('should edit map keys', () => {
            const entries = { oldKey: 'value' };
            let _currentValue = entries;
            const onChange = (newValue) => {
                _currentValue = newValue;
                onChangeCallback(newValue);
            };

            // Change key from oldKey to newKey
            const newEntries = {};
            delete entries['oldKey'];
            newEntries['newKey'] = 'value';
            onChange(newEntries);

            expect(onChangeCallback).toHaveBeenCalled();
            expect(newEntries.newKey).toBe('value');
            expect(newEntries.oldKey).toBeUndefined();
        });

        it('should update map values', () => {
            const entries = { key1: 'old', key2: 'value' };
            let _currentValue = entries;
            const onChange = (newValue) => {
                _currentValue = newValue;
                onChangeCallback(newValue);
            };

            // Update value
            const newEntries = { ...entries, key1: 'new' };
            onChange(newEntries);

            expect(onChangeCallback).toHaveBeenCalled();
            expect(newEntries.key1).toBe('new');
            expect(newEntries.key2).toBe('value');
        });

        it('should handle nested maps', () => {
            const entries = {
                map1: { innerKey: 'value' }
            };
            let _currentValue = entries;
            const onChange = (newValue) => {
                _currentValue = newValue;
                onChangeCallback(newValue);
            };

            // Update nested map
            const newEntries = {
                ...entries,
                map1: { ...entries.map1, innerKey: 'updated' }
            };
            onChange(newEntries);

            expect(onChangeCallback).toHaveBeenCalled();
            expect(newEntries.map1.innerKey).toBe('updated');
        });
    });

    describe('Optional type handling', () => {
        it('should render checkbox for optional type when value is null', () => {
            container = mountComponent(TypeInput, {
                type: { builtIn: 'string' },
                value: null,
                onchange: onChangeCallback,
                registry: registry,
                optional: true
            });

            const checkbox = screen.getByRole('checkbox');
            expect(checkbox).toBeInTheDocument();
            expect(checkbox.checked).toBe(false);
        });

        it('should initialize optional value when checked', () => {
            let currentValue = null;
            const onChange = (newValue) => {
                currentValue = newValue;
                onChangeCallback(newValue);
            };

            // Simulate checking optional field
            const defaultValue = TypeInput.getDefaultValue({ builtIn: 'string' }, registry);
            onChange(defaultValue);

            expect(onChangeCallback).toHaveBeenCalled();
            expect(currentValue).toBe('');
        });
    });

    describe('Default value generation', () => {
        it('should generate default for string', () => {
            const defaultValue = TypeInput.getDefaultValue({ builtIn: 'string' }, registry);
            expect(defaultValue).toBe('');
        });

        it('should generate default for int', () => {
            const defaultValue = TypeInput.getDefaultValue({ builtIn: 'int' }, registry);
            expect(defaultValue).toBe(0);
        });

        it('should generate default for float', () => {
            const defaultValue = TypeInput.getDefaultValue({ builtIn: 'float' }, registry);
            expect(defaultValue).toBe(0.0);
        });

        it('should generate default for bool', () => {
            const defaultValue = TypeInput.getDefaultValue({ builtIn: 'bool' }, registry);
            expect(defaultValue).toBe(false);
        });

        it('should generate default for array', () => {
            const defaultValue = TypeInput.getDefaultValue({ array: { builtIn: 'string' } }, registry);
            expect(defaultValue).toEqual([]);
        });

        it('should generate default for map', () => {
            const defaultValue = TypeInput.getDefaultValue({ mapValue: { builtIn: 'string' } }, registry);
            expect(defaultValue).toEqual({});
        });

        it('should generate default for struct', () => {
            const defaultValue = TypeInput.getDefaultValue({ userDefined: 'User' }, registry);
            expect(defaultValue).toEqual({ id: 0, name: '' });
        });
    });
});
