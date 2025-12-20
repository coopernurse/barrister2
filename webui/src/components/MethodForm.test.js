import { describe, it, expect, beforeEach, vi } from 'vitest';
import MethodForm from './MethodForm.js';
import { createMockRegistry } from '../test-utils.js';

describe('MethodForm Component', () => {
    let registry;
    let onFormChangeCallback;
    let onSubmitCallback;

    beforeEach(() => {
        registry = createMockRegistry();
        onFormChangeCallback = vi.fn();
        onSubmitCallback = vi.fn();
    });

    describe('Form initialization', () => {
        it('should initialize form with default values based on parameter types', () => {
            const method = {
                name: 'testMethod',
                parameters: [
                    { name: 'id', type: { builtIn: 'int' } },
                    { name: 'name', type: { builtIn: 'string' } },
                    { name: 'active', type: { builtIn: 'bool' } }
                ]
            };

            const vnode = {
                attrs: {
                    method: method,
                    typeRegistry: registry,
                    formValues: {},
                    onFormChange: onFormChangeCallback,
                    onSubmit: onSubmitCallback
                }
            };

            MethodForm.oninit(vnode);
            MethodForm.initializeForm(vnode);

            expect(onFormChangeCallback).toHaveBeenCalled();
            const formValues = onFormChangeCallback.mock.calls[0][0];
            // Form fields now initialize with null to show placeholder text
            expect(formValues.id).toBeNull();
            expect(formValues.name).toBeNull();
            expect(formValues.active).toBeNull();
        });

        it('should handle method with no parameters', () => {
            const method = {
                name: 'noParamsMethod',
                parameters: []
            };

            const vnode = {
                attrs: {
                    method: method,
                    typeRegistry: registry,
                    formValues: {},
                    onFormChange: onFormChangeCallback,
                    onSubmit: onSubmitCallback
                }
            };

            MethodForm.oninit(vnode);
            MethodForm.initializeForm(vnode);

            expect(onFormChangeCallback).toHaveBeenCalled();
            const formValues = onFormChangeCallback.mock.calls[0][0];
            expect(Object.keys(formValues).length).toBe(0);
        });

        it('should re-initialize when method changes', () => {
            const method1 = {
                name: 'method1',
                parameters: [{ name: 'param1', type: { builtIn: 'string' } }]
            };

            const method2 = {
                name: 'method2',
                parameters: [{ name: 'param2', type: { builtIn: 'int' } }]
            };

            const vnode = {
                attrs: {
                    method: method1,
                    typeRegistry: registry,
                    formValues: {},
                    onFormChange: onFormChangeCallback,
                    onSubmit: onSubmitCallback
                }
            };

            MethodForm.oninit(vnode);
            MethodForm.initializeForm(vnode);
            
            // Clear the callback count
            onFormChangeCallback.mockClear();

            // Change method
            vnode.attrs.method = method2;
            MethodForm.lastMethodName = undefined; // Reset to trigger re-init
            MethodForm.onupdate(vnode);

            expect(onFormChangeCallback).toHaveBeenCalled();
        });
    });

    describe('Form value updates', () => {
        it('should trigger onFormChange when form values change', () => {
            const method = {
                name: 'testMethod',
                parameters: [
                    { name: 'name', type: { builtIn: 'string' } }
                ]
            };

            const vnode = {
                attrs: {
                    method: method,
                    typeRegistry: registry,
                    formValues: { name: 'initial' },
                    onFormChange: onFormChangeCallback,
                    onSubmit: onSubmitCallback
                }
            };

            MethodForm.oninit(vnode);
            MethodForm.initializeForm(vnode);
            
            // Clear initial call
            onFormChangeCallback.mockClear();
            
            // Update form values
            MethodForm.formValues = { name: 'updated' };

            // Simulate change
            if (vnode.attrs.onFormChange) {
                vnode.attrs.onFormChange(MethodForm.formValues);
            }

            expect(onFormChangeCallback).toHaveBeenCalled();
            const lastCall = onFormChangeCallback.mock.calls[onFormChangeCallback.mock.calls.length - 1];
            expect(lastCall[0].name).toBe('updated');
        });
    });

    describe('Type formatting', () => {
        it('should format builtin types', () => {
            expect(MethodForm.formatType({ builtIn: 'string' })).toBe('string');
            expect(MethodForm.formatType({ builtIn: 'int' })).toBe('int');
        });

        it('should format array types', () => {
            const formatted = MethodForm.formatType({ array: { builtIn: 'string' } });
            expect(formatted).toBe('[]string');
        });

        it('should format map types', () => {
            const formatted = MethodForm.formatType({ mapValue: { builtIn: 'int' } });
            expect(formatted).toBe('map[string]int');
        });

        it('should format user-defined types', () => {
            const formatted = MethodForm.formatType({ userDefined: 'User' });
            expect(formatted).toBe('User');
        });

        it('should handle null/undefined types', () => {
            expect(MethodForm.formatType(null)).toBe('void');
            expect(MethodForm.formatType(undefined)).toBe('void');
        });
    });

    describe('Method submission', () => {
        it('should call onSubmit with form values', () => {
            const method = {
                name: 'testMethod',
                parameters: [
                    { name: 'id', type: { builtIn: 'int' } }
                ]
            };

            const vnode = {
                attrs: {
                    method: method,
                    typeRegistry: registry,
                    formValues: { id: 123 },
                    onFormChange: onFormChangeCallback,
                    onSubmit: onSubmitCallback
                }
            };

            MethodForm.oninit(vnode);
            MethodForm.formValues = { id: 123 };

            // Simulate submit
            if (vnode.attrs.onSubmit) {
                vnode.attrs.onSubmit(MethodForm.formValues);
            }

            expect(onSubmitCallback).toHaveBeenCalled();
            expect(onSubmitCallback.mock.calls[0][0]).toEqual({ id: 123 });
        });

        it('should handle method with no parameters on submit', () => {
            const method = {
                name: 'noParamsMethod',
                parameters: []
            };

            const vnode = {
                attrs: {
                    method: method,
                    typeRegistry: registry,
                    formValues: {},
                    onFormChange: onFormChangeCallback,
                    onSubmit: onSubmitCallback
                }
            };

            MethodForm.oninit(vnode);

            // Simulate submit
            if (vnode.attrs.onSubmit) {
                vnode.attrs.onSubmit({});
            }

            expect(onSubmitCallback).toHaveBeenCalled();
            expect(onSubmitCallback.mock.calls[0][0]).toEqual({});
        });
    });

    describe('getDefaultValue', () => {
        it('should return default for string', () => {
            expect(MethodForm.getDefaultValue({ builtIn: 'string' })).toBe('');
        });

        it('should return default for int', () => {
            expect(MethodForm.getDefaultValue({ builtIn: 'int' })).toBe(0);
        });

        it('should return default for float', () => {
            expect(MethodForm.getDefaultValue({ builtIn: 'float' })).toBe(0.0);
        });

        it('should return default for bool', () => {
            expect(MethodForm.getDefaultValue({ builtIn: 'bool' })).toBe(false);
        });

        it('should return default for array', () => {
            expect(MethodForm.getDefaultValue({ array: { builtIn: 'string' } })).toEqual([]);
        });

        it('should return default for map', () => {
            expect(MethodForm.getDefaultValue({ mapValue: { builtIn: 'string' } })).toEqual({});
        });

        it('should return null for user-defined types', () => {
            expect(MethodForm.getDefaultValue({ userDefined: 'User' })).toBeNull();
        });
    });
});

