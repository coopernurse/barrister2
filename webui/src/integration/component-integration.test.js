// Integration tests for component workflows
// These tests verify that components work together correctly through DOM interactions

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mountComponent, unmountComponent, createMockRegistry, screen, userEvent } from '../test-utils.js';
import MethodForm from '../components/MethodForm.js';
import EndpointList from '../components/EndpointList.js';
import * as api from '../services/api.js';

// Mock API module
vi.mock('../services/api.js', () => ({
    discoverIDL: vi.fn(),
    callMethod: vi.fn()
}));

describe('Component Integration Tests', () => {
    let container;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        if (container) {
            unmountComponent(container);
        }
    });

    describe('Data flow through components', () => {
        it('form submission produces correct JSON-RPC request format', async () => {
            const onSubmit = vi.fn();

            const method = {
                name: 'add',
                parameters: [
                    { name: 'a', type: { builtIn: 'int' } },
                    { name: 'b', type: { builtIn: 'int' } }
                ]
            };

            container = mountComponent(MethodForm, {
                method,
                typeRegistry: createMockRegistry(),
                formValues: {},
                onFormChange: vi.fn(),
                onSubmit
            });

            // Wait for component to initialize (oninit runs synchronously, but wait a tick)
            await new Promise(resolve => setTimeout(resolve, 10));

            // MethodForm.formValues is shared, so set values directly
            // The onclick handler uses this.formValues which is the same object
            MethodForm.formValues.a = 50;
            MethodForm.formValues.b = 10;

            // Verify values are set before submitting
            expect(MethodForm.formValues.a).toBe(50);
            expect(MethodForm.formValues.b).toBe(10);

            // Submit form through button click
            const submitButton = screen.getByRole('button', { name: /call method/i });
            await userEvent.click(submitButton);

            // Verify form produces object with named keys
            expect(onSubmit).toHaveBeenCalled();
            const formValues = onSubmit.mock.calls[0][0];
            expect(formValues).toEqual({ a: 50, b: 10 });

            // Verify this format can be converted to array (as app.js does)
            const paramsArray = method.parameters.map(p => formValues[p.name]);
            expect(paramsArray).toEqual([50, 10]); // Array, not {a: 50, b: 10}
        });

        it('handles empty form values correctly in submission flow', async () => {
            const onSubmit = vi.fn();

            const method = {
                name: 'optionalParams',
                parameters: [
                    { name: 'required', type: { builtIn: 'string' } },
                    { name: 'optional', type: { builtIn: 'int' } }
                ]
            };

            container = mountComponent(MethodForm, {
                method,
                typeRegistry: createMockRegistry(),
                formValues: {},
                onFormChange: vi.fn(),
                onSubmit
            });

            // Wait for component to initialize
            await new Promise(resolve => setTimeout(resolve, 10));

            // Set form values directly on the shared formValues object
            MethodForm.formValues.required = 'filled';
            // Leave optional as null (it should already be null from initialization)

            // Submit form
            const submitButton = screen.getByRole('button', { name: /call method/i });
            await userEvent.click(submitButton);

            expect(onSubmit).toHaveBeenCalled();
            const formValues = onSubmit.mock.calls[0][0];
            
            // Verify null values are handled correctly
            expect(formValues.required).toBe('filled');
            expect(formValues.optional).toBeNull();

            // Verify conversion to array handles nulls
            const paramsArray = method.parameters.map(p => formValues[p.name]);
            expect(paramsArray).toEqual(['filled', null]);
        });
    });

    describe('Error handling flow', () => {
        it('shows error message when endpoint discovery fails', async () => {
            api.discoverIDL.mockRejectedValue(new Error('Network error'));

            // Mock alert
            global.alert = vi.fn();

            container = mountComponent(EndpointList, {
                currentEndpoint: null,
                onEndpointSelect: vi.fn()
            });

            // Trigger endpoint selection that will fail
            await EndpointList.handleSelectEndpoint('http://invalid.com', {
                attrs: {
                    currentEndpoint: null,
                    onEndpointSelect: vi.fn()
                }
            });

            // Verify error message shown to user
            expect(global.alert).toHaveBeenCalledWith(
                expect.stringContaining('Failed to discover IDL')
            );
        });
    });

    describe('State synchronization', () => {
        it('form clears when method changes', () => {
            const onFormChange = vi.fn();

            const method1 = {
                name: 'method1',
                parameters: [
                    { name: 'param1', type: { builtIn: 'string' } }
                ]
            };

            container = mountComponent(MethodForm, {
                method: method1,
                typeRegistry: createMockRegistry(),
                formValues: {},
                onFormChange,
                onSubmit: vi.fn()
            });

            // Verify first method's field is present
            expect(screen.getByPlaceholderText('Enter string')).toBeInTheDocument();

            // Change method by remounting
            const method2 = {
                name: 'method2',
                parameters: [
                    { name: 'param2', type: { builtIn: 'int' } }
                ]
            };

            unmountComponent(container);
            onFormChange.mockClear();
            container = mountComponent(MethodForm, {
                method: method2,
                typeRegistry: createMockRegistry(),
                formValues: {},
                onFormChange,
                onSubmit: vi.fn()
            });

            // Verify new method's field is present, old field is gone
            expect(screen.queryByPlaceholderText('Enter string')).not.toBeInTheDocument();
            expect(screen.getByPlaceholderText('Enter integer')).toBeInTheDocument();
            
            // Verify form was reinitialized
            expect(onFormChange).toHaveBeenCalled();
            const formValues = onFormChange.mock.calls[0][0];
            expect(formValues.param1).toBeUndefined();
            expect(formValues.param2).toBeNull();
        });
    });

    describe('Loading states', () => {
        it('loading state transitions correctly during async operations', async () => {
            let resolveDiscover;
            const discoverPromise = new Promise(resolve => {
                resolveDiscover = resolve;
            });

            api.discoverIDL.mockReturnValue(discoverPromise);

            container = mountComponent(EndpointList, {
                currentEndpoint: null,
                onEndpointSelect: vi.fn()
            });

            // Start operation
            const discoveryPromise = EndpointList.handleSelectEndpoint('http://example.com', {
                attrs: {
                    currentEndpoint: null,
                    onEndpointSelect: vi.fn()
                }
            });

            // Verify loading state is set (check for loading indicator in DOM)
            await vi.waitFor(() => {
                expect(EndpointList.discovering).toBe(true);
            });
            
            // Complete operation
            resolveDiscover({ interfaces: [] });
            await discoveryPromise;

            // Verify loading state cleared
            await vi.waitFor(() => {
                expect(EndpointList.discovering).toBe(false);
            });
        });
    });
});
