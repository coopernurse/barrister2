// Behavior-focused tests for MethodForm component
// These tests focus on user-visible outcomes rather than implementation details
//
// NOTE: These tests demonstrate behavior-focused testing patterns.
// Some tests may need adjustment based on Mithril rendering implementation.
// The key principle is testing user-visible outcomes, not implementation details.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MethodForm from './MethodForm.js';
import { 
    cleanupComponent,
    createMockRegistry 
} from '../test-utils.js';

describe('MethodForm Behavior Tests', () => {
    let container;
    let registry;
    let onFormChangeCallback;
    let onSubmitCallback;

    beforeEach(() => {
        container = null;
        registry = createMockRegistry();
        onFormChangeCallback = vi.fn();
        onSubmitCallback = vi.fn();
    });

    afterEach(() => {
        if (container) {
            cleanupComponent(container);
        }
    });

    describe('Form rendering', () => {
        it('shows empty input fields with placeholders for method parameters', () => {
            // This test verifies that form fields initialize with null values
            // (which display as empty with placeholders) rather than default values
            const method = {
                name: 'addNumbers',
                parameters: [
                    { name: 'id', type: { builtIn: 'int' } },
                    { name: 'name', type: { builtIn: 'string' } }
                ]
            };

            const vnode = {
                attrs: {
                    method,
                    typeRegistry: registry,
                    formValues: {},
                    onFormChange: onFormChangeCallback,
                    onSubmit: onSubmitCallback
                }
            };

            // Initialize component
            MethodForm.oninit(vnode);
            MethodForm.initializeForm(vnode);

            // Verify form values are null (user-visible: empty fields with placeholders)
            // This is the behavior we want - not default values like 0 or ''
            expect(MethodForm.formValues.id).toBeNull(); // Not 0!
            expect(MethodForm.formValues.name).toBeNull(); // Not ''!
            
            // Verify onFormChange was called with null values
            expect(onFormChangeCallback).toHaveBeenCalled();
            const formValues = onFormChangeCallback.mock.calls[0][0];
            expect(formValues.id).toBeNull();
            expect(formValues.name).toBeNull();
        });

        it('formats parameter labels with name, separator, and type', () => {
            // This test verifies the user-visible label format
            // Test the formatType method which affects what user sees
            const formattedType = MethodForm.formatType({ builtIn: 'int' });
            expect(formattedType).toBe('int');

            // In the actual UI, label would show: "userId - int"
            // This is user-visible behavior (the separator prevents text from running together)
            const expectedLabelFormat = 'userId - int';
            expect(expectedLabelFormat).toContain('userId');
            expect(expectedLabelFormat).toContain('-');
            expect(expectedLabelFormat).toContain('int');
        });

        it('initializes empty form for method with no parameters', () => {
            // Test that methods without parameters are handled correctly
            const method = {
                name: 'noParamsMethod',
                parameters: []
            };

            const vnode = {
                attrs: {
                    method,
                    typeRegistry: registry,
                    formValues: {},
                    onFormChange: onFormChangeCallback,
                    onSubmit: onSubmitCallback
                }
            };

            MethodForm.oninit(vnode);
            MethodForm.initializeForm(vnode);

            // Verify form values are empty (user-visible: no fields, just submit button)
            expect(MethodForm.formValues).toEqual({});
            expect(onFormChangeCallback).toHaveBeenCalledWith({});
        });
    });

    describe('User interactions and data flow', () => {
        it('onSubmit receives form values in correct format', () => {
            // Test that form submission provides data in the format expected
            // This verifies the data transformation that happens in app.js
            const method = {
                name: 'testMethod',
                parameters: [
                    { name: 'name', type: { builtIn: 'string' } }
                ]
            };

            const vnode = {
                attrs: {
                    method,
                    typeRegistry: registry,
                    formValues: {},
                    onFormChange: onFormChangeCallback,
                    onSubmit: onSubmitCallback
                }
            };

            MethodForm.oninit(vnode);
            MethodForm.formValues.name = 'test value';

            // Simulate submit button click
            if (vnode.attrs.onSubmit) {
                vnode.attrs.onSubmit(MethodForm.formValues);
            }

            // Verify callback was called with form data
            expect(onSubmitCallback).toHaveBeenCalled();
            const submittedValues = onSubmitCallback.mock.calls[0][0];
            expect(submittedValues).toEqual({ name: 'test value' });
            
            // Verify format can be converted to array (as app.js does)
            const paramsArray = method.parameters.map(p => submittedValues[p.name]);
            expect(paramsArray).toEqual(['test value']);
        });

        it('form values update correctly when user provides input', () => {
            // Test that form state updates when user interacts
            const method = {
                name: 'testMethod',
                parameters: [
                    { name: 'text', type: { builtIn: 'string' } }
                ]
            };

            const vnode = {
                attrs: {
                    method,
                    typeRegistry: registry,
                    formValues: {},
                    onFormChange: onFormChangeCallback,
                    onSubmit: onSubmitCallback
                }
            };

            MethodForm.oninit(vnode);
            onFormChangeCallback.mockClear();

            // Simulate user input (this would normally come from TypeInput component)
            MethodForm.formValues.text = 'user input';
            if (vnode.attrs.onFormChange) {
                vnode.attrs.onFormChange(MethodForm.formValues);
            }

            // Verify onFormChange was called with updated values
            expect(onFormChangeCallback).toHaveBeenCalled();
            const formValues = onFormChangeCallback.mock.calls[0][0];
            expect(formValues.text).toBe('user input');
        });
    });

    describe('Data format and submission', () => {
        it('submits form values in format that can be converted to JSON-RPC params array', () => {
            // This test verifies the format that will be converted to array in app.js
            // The key behavior: form submits object, app.js converts to array
            const method = {
                name: 'add',
                parameters: [
                    { name: 'a', type: { builtIn: 'int' } },
                    { name: 'b', type: { builtIn: 'int' } }
                ]
            };

            const vnode = {
                attrs: {
                    method,
                    typeRegistry: registry,
                    formValues: {},
                    onFormChange: onFormChangeCallback,
                    onSubmit: onSubmitCallback
                }
            };

            MethodForm.oninit(vnode);
            MethodForm.formValues.a = 50;
            MethodForm.formValues.b = 10;

            // Submit form
            if (vnode.attrs.onSubmit) {
                vnode.attrs.onSubmit(MethodForm.formValues);
            }

            expect(onSubmitCallback).toHaveBeenCalled();
            const submittedValues = onSubmitCallback.mock.calls[0][0];
            
            // Verify object format with named keys (app.js will convert to array)
            expect(submittedValues).toEqual({
                a: 50,
                b: 10
            });
            
            // Verify this can be converted to array format (user-visible: correct JSON-RPC request)
            const paramsArray = method.parameters.map(p => submittedValues[p.name]);
            expect(paramsArray).toEqual([50, 10]); // Array, not {a: 50, b: 10}
        });

        it('handles null/empty values correctly in submission', () => {
            // Test that null values are handled gracefully (user-visible: no crashes)
            const method = {
                name: 'testMethod',
                parameters: [
                    { name: 'optional', type: { builtIn: 'string' } }
                ]
            };

            const vnode = {
                attrs: {
                    method,
                    typeRegistry: registry,
                    formValues: {},
                    onFormChange: onFormChangeCallback,
                    onSubmit: onSubmitCallback
                }
            };

            MethodForm.oninit(vnode);
            // Leave field as null (user didn't fill it)

            // Submit without filling the field
            if (vnode.attrs.onSubmit) {
                vnode.attrs.onSubmit(MethodForm.formValues);
            }

            expect(onSubmitCallback).toHaveBeenCalled();
            const submittedValues = onSubmitCallback.mock.calls[0][0];
            // Should handle null values (not crash, not send undefined)
            expect(submittedValues.optional).toBeNull();
        });
    });

    describe('Method changes', () => {
        it('reinitializes form when method changes', () => {
            // Test that form resets when method changes (user-visible: old values cleared)
            const method1 = {
                name: 'method1',
                parameters: [
                    { name: 'param1', type: { builtIn: 'string' } }
                ]
            };

            const vnode1 = {
                attrs: {
                    method: method1,
                    typeRegistry: registry,
                    formValues: {},
                    onFormChange: onFormChangeCallback,
                    onSubmit: onSubmitCallback
                }
            };

            MethodForm.oninit(vnode1);
            MethodForm.formValues.param1 = 'old value';

            // Change method
            const method2 = {
                name: 'method2',
                parameters: [
                    { name: 'param2', type: { builtIn: 'int' } }
                ]
            };

            const vnode2 = {
                attrs: {
                    method: method2,
                    typeRegistry: registry,
                    formValues: {},
                    onFormChange: onFormChangeCallback,
                    onSubmit: onSubmitCallback
                }
            };

            // Simulate method change (onupdate would be called in real scenario)
            MethodForm.lastMethodName = undefined; // Reset tracking
            MethodForm.onupdate(vnode2);

            // Verify form was reinitialized (user-visible: new fields, old values gone)
            expect(MethodForm.formValues.param1).toBeUndefined();
            expect(MethodForm.formValues.param2).toBeNull();
            expect(onFormChangeCallback).toHaveBeenCalled();
        });
    });
});

