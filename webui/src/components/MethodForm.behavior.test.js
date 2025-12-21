// Behavior-focused tests for MethodForm component
// These tests focus on user-visible outcomes through DOM interactions

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MethodForm from './MethodForm.js';
import { 
    mountComponent,
    unmountComponent,
    createMockRegistry,
    screen,
    userEvent
} from '../test-utils.js';

describe('MethodForm Behavior Tests', () => {
    let container;
    let registry;
    let onFormChangeCallback;
    let onSubmitCallback;

    beforeEach(() => {
        registry = createMockRegistry();
        onFormChangeCallback = vi.fn();
        onSubmitCallback = vi.fn();
    });

    afterEach(() => {
        if (container) {
            unmountComponent(container);
        }
    });

    describe('Form rendering', () => {
        it('shows empty input fields with placeholders for method parameters', () => {
            const method = {
                name: 'addNumbers',
                parameters: [
                    { name: 'id', type: { builtIn: 'int' } },
                    { name: 'name', type: { builtIn: 'string' } }
                ]
            };

            container = mountComponent(MethodForm, {
                method,
                typeRegistry: registry,
                formValues: {},
                onFormChange: onFormChangeCallback,
                onSubmit: onSubmitCallback
            });

            // Verify form fields render with placeholders
            const idInput = screen.getByPlaceholderText('Enter integer');
            const nameInput = screen.getByPlaceholderText('Enter string');
            
            expect(idInput).toBeInTheDocument();
            expect(nameInput).toBeInTheDocument();
            expect(idInput.value).toBe('');
            expect(nameInput.value).toBe('');
            
            // Verify onFormChange was called with null values
            expect(onFormChangeCallback).toHaveBeenCalled();
            const formValues = onFormChangeCallback.mock.calls[0][0];
            expect(formValues.id).toBeNull();
            expect(formValues.name).toBeNull();
        });

        it('formats parameter labels with name, separator, and type', () => {
            const method = {
                name: 'testMethod',
                parameters: [
                    { name: 'userId', type: { builtIn: 'int' } }
                ]
            };

            container = mountComponent(MethodForm, {
                method,
                typeRegistry: registry,
                formValues: {},
                onFormChange: onFormChangeCallback,
                onSubmit: onSubmitCallback
            });

            // Verify label format - check for userId and int separately since they're in different elements
            const userIdLabel = screen.getByText('userId');
            expect(userIdLabel).toBeInTheDocument();
            // Check that the label contains the type information
            const labelContainer = userIdLabel.closest('label');
            expect(labelContainer.textContent).toContain('int');
        });

        it('initializes empty form for method with no parameters', () => {
            const method = {
                name: 'noParamsMethod',
                parameters: []
            };

            container = mountComponent(MethodForm, {
                method,
                typeRegistry: registry,
                formValues: {},
                onFormChange: onFormChangeCallback,
                onSubmit: onSubmitCallback
            });

            // Verify no input fields, just submit button
            const inputs = screen.queryAllByRole('textbox');
            const numberInputs = screen.queryAllByRole('spinbutton');
            expect(inputs.length + numberInputs.length).toBe(0);
            
            // Verify submit button exists
            const submitButton = screen.getByRole('button', { name: /call method/i });
            expect(submitButton).toBeInTheDocument();
            
            expect(onFormChangeCallback).toHaveBeenCalledWith({});
        });
    });

    describe('User interactions and data flow', () => {
        it('onSubmit receives form values in correct format', async () => {
            const method = {
                name: 'testMethod',
                parameters: [
                    { name: 'name', type: { builtIn: 'string' } }
                ]
            };

            container = mountComponent(MethodForm, {
                method,
                typeRegistry: registry,
                formValues: {},
                onFormChange: onFormChangeCallback,
                onSubmit: onSubmitCallback
            });

            // Type in the input field
            const input = screen.getByPlaceholderText('Enter string');
            await userEvent.type(input, 'test value');

            // Submit form
            const submitButton = screen.getByRole('button', { name: /call method/i });
            await userEvent.click(submitButton);

            // Verify callback was called with form data
            expect(onSubmitCallback).toHaveBeenCalled();
            const submittedValues = onSubmitCallback.mock.calls[0][0];
            expect(submittedValues.name).toBe('test value');
            
            // Verify format can be converted to array (as app.js does)
            const paramsArray = method.parameters.map(p => submittedValues[p.name]);
            expect(paramsArray).toEqual(['test value']);
        });

        it('form values update correctly when user provides input', async () => {
            const method = {
                name: 'testMethod',
                parameters: [
                    { name: 'text', type: { builtIn: 'string' } }
                ]
            };

            container = mountComponent(MethodForm, {
                method,
                typeRegistry: registry,
                formValues: {},
                onFormChange: onFormChangeCallback,
                onSubmit: onSubmitCallback
            });

            onFormChangeCallback.mockClear();

            // Type in the input field
            const input = screen.getByPlaceholderText('Enter string');
            await userEvent.type(input, 'user input');

            // Verify onFormChange was called with updated values
            expect(onFormChangeCallback).toHaveBeenCalled();
            const formValues = onFormChangeCallback.mock.calls[onFormChangeCallback.mock.calls.length - 1][0];
            expect(formValues.text).toBe('user input');
        });
    });

    describe('Data format and submission', () => {
        it('submits form values in format that can be converted to JSON-RPC params array', async () => {
            const method = {
                name: 'add',
                parameters: [
                    { name: 'a', type: { builtIn: 'int' } },
                    { name: 'b', type: { builtIn: 'int' } }
                ]
            };

            container = mountComponent(MethodForm, {
                method,
                typeRegistry: registry,
                formValues: {},
                onFormChange: onFormChangeCallback,
                onSubmit: onSubmitCallback
            });

            // Fill form fields
            const inputA = screen.getAllByPlaceholderText('Enter integer')[0];
            const inputB = screen.getAllByPlaceholderText('Enter integer')[1];
            await userEvent.type(inputA, '50');
            await userEvent.type(inputB, '10');

            // Submit form
            const submitButton = screen.getByRole('button', { name: /call method/i });
            await userEvent.click(submitButton);

            expect(onSubmitCallback).toHaveBeenCalled();
            const submittedValues = onSubmitCallback.mock.calls[0][0];
            
            // Verify object format with named keys (app.js will convert to array)
            expect(submittedValues.a).toBe(50);
            expect(submittedValues.b).toBe(10);
            
            // Verify this can be converted to array format (user-visible: correct JSON-RPC request)
            const paramsArray = method.parameters.map(p => submittedValues[p.name]);
            expect(paramsArray).toEqual([50, 10]); // Array, not {a: 50, b: 10}
        });

        it('handles null/empty values correctly in submission', async () => {
            const method = {
                name: 'testMethod',
                parameters: [
                    { name: 'optional', type: { builtIn: 'string' } }
                ]
            };

            container = mountComponent(MethodForm, {
                method,
                typeRegistry: registry,
                formValues: {},
                onFormChange: onFormChangeCallback,
                onSubmit: onSubmitCallback
            });

            // Don't fill the field, leave it empty

            // Submit form
            const submitButton = screen.getByRole('button', { name: /call method/i });
            await userEvent.click(submitButton);

            expect(onSubmitCallback).toHaveBeenCalled();
            const submittedValues = onSubmitCallback.mock.calls[0][0];
            // Should handle null values (not crash, not send undefined)
            expect(submittedValues.optional).toBeNull();
        });
    });

    describe('Method changes', () => {
        it('reinitializes form when method changes', () => {
            const method1 = {
                name: 'method1',
                parameters: [
                    { name: 'param1', type: { builtIn: 'string' } }
                ]
            };

            container = mountComponent(MethodForm, {
                method: method1,
                typeRegistry: registry,
                formValues: {},
                onFormChange: onFormChangeCallback,
                onSubmit: onSubmitCallback
            });

            // Verify first method's field is present
            expect(screen.getByPlaceholderText('Enter string')).toBeInTheDocument();

            // Change method
            const method2 = {
                name: 'method2',
                parameters: [
                    { name: 'param2', type: { builtIn: 'int' } }
                ]
            };

            // Remount with new method
            unmountComponent(container);
            onFormChangeCallback.mockClear();
            container = mountComponent(MethodForm, {
                method: method2,
                typeRegistry: registry,
                formValues: {},
                onFormChange: onFormChangeCallback,
                onSubmit: onSubmitCallback
            });

            // Verify new method's field is present, old field is gone
            expect(screen.queryByPlaceholderText('Enter string')).not.toBeInTheDocument();
            expect(screen.getByPlaceholderText('Enter integer')).toBeInTheDocument();
            
            // Verify form was reinitialized
            expect(onFormChangeCallback).toHaveBeenCalled();
            const formValues = onFormChangeCallback.mock.calls[0][0];
            expect(formValues.param1).toBeUndefined();
            expect(formValues.param2).toBeNull();
        });
    });
});
