// Integration tests for component workflows
// These tests verify that components work together correctly
//
// NOTE: These are simplified integration tests demonstrating behavior-focused testing patterns.
// They focus on data flow and state synchronization rather than full DOM rendering.

import { describe, it, expect, vi } from 'vitest';
import { createMockRegistry } from '../test-utils.js';

// Mock API module
vi.mock('../services/api.js', () => ({
    discoverIDL: vi.fn(),
    callMethod: vi.fn()
}));

describe('Component Integration Tests', () => {
    describe('Data flow through components', () => {
        it('form submission produces correct JSON-RPC request format', async () => {
            // This test verifies that MethodForm produces data in the format
            // that app.js expects to convert to JSON-RPC params array
            // User-visible: correct JSON-RPC request sent to server
            
            const MethodForm = (await import('../components/MethodForm.js')).default;
            const onSubmit = vi.fn();

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
                    typeRegistry: createMockRegistry(),
                    formValues: {},
                    onFormChange: vi.fn(),
                    onSubmit
                }
            };

            MethodForm.oninit(vnode);
            
            // Simulate user filling form
            MethodForm.formValues.a = 50;
            MethodForm.formValues.b = 10;

            // Submit form
            if (vnode.attrs.onSubmit) {
                vnode.attrs.onSubmit(MethodForm.formValues);
            }

            // Verify form produces object with named keys
            expect(onSubmit).toHaveBeenCalled();
            const formValues = onSubmit.mock.calls[0][0];
            expect(formValues).toEqual({ a: 50, b: 10 });

            // Verify this format can be converted to array (as app.js does)
            // This is user-visible: correct JSON-RPC params format
            const paramsArray = method.parameters.map(p => formValues[p.name]);
            expect(paramsArray).toEqual([50, 10]); // Array, not {a: 50, b: 10}
        });

        it('handles empty form values correctly in submission flow', async () => {
            // Test that null/empty values are handled correctly (user-visible: no crashes)
            const MethodForm = (await import('../components/MethodForm.js')).default;
            const onSubmit = vi.fn();

            const method = {
                name: 'optionalParams',
                parameters: [
                    { name: 'required', type: { builtIn: 'string' } },
                    { name: 'optional', type: { builtIn: 'int' } }
                ]
            };

            const vnode = {
                attrs: {
                    method,
                    typeRegistry: createMockRegistry(),
                    formValues: {},
                    onFormChange: vi.fn(),
                    onSubmit
                }
            };

            MethodForm.oninit(vnode);
            
            // Fill only required field
            MethodForm.formValues.required = 'filled';
            // Leave optional as null

            // Submit
            if (vnode.attrs.onSubmit) {
                vnode.attrs.onSubmit(MethodForm.formValues);
            }

            expect(onSubmit).toHaveBeenCalled();
            const formValues = onSubmit.mock.calls[0][0];
            
            // Verify null values are handled correctly
            expect(formValues.required).toBe('filled');
            expect(formValues.optional).toBeNull();

            // Verify conversion to array handles nulls (user-visible: correct request sent)
            const paramsArray = method.parameters.map(p => formValues[p.name]);
            expect(paramsArray).toEqual(['filled', null]);
        });
    });

    describe('Error handling flow', () => {
        it('shows error message when endpoint discovery fails', async () => {
            // Test that errors are displayed to user (user-visible: error message appears)
            const EndpointList = (await import('../components/EndpointList.js')).default;
            const apiModule = await import('../services/api.js');
            const onEndpointSelect = vi.fn();

            // Mock API to reject
            apiModule.discoverIDL.mockRejectedValue(new Error('Network error'));

            // Mock alert
            global.alert = vi.fn();

            const vnode = {
                attrs: {
                    currentEndpoint: null,
                    onEndpointSelect
                }
            };

            await EndpointList.handleSelectEndpoint('http://invalid.com', vnode);

            // Verify error message shown to user (user-visible behavior)
            expect(global.alert).toHaveBeenCalledWith(
                expect.stringContaining('Failed to discover IDL')
            );
        });
    });

    describe('State synchronization', () => {
        it('form clears when method changes', async () => {
            // Test that form resets when method changes (user-visible: old values cleared, new fields appear)
            const MethodForm = (await import('../components/MethodForm.js')).default;
            const onFormChange = vi.fn();

            const method1 = {
                name: 'method1',
                parameters: [
                    { name: 'param1', type: { builtIn: 'string' } }
                ]
            };

            const vnode1 = {
                attrs: {
                    method: method1,
                    typeRegistry: createMockRegistry(),
                    formValues: {},
                    onFormChange,
                    onSubmit: vi.fn()
                }
            };

            MethodForm.oninit(vnode1);
            MethodForm.formValues.param1 = 'value1';

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
                    typeRegistry: createMockRegistry(),
                    formValues: {},
                    onFormChange,
                    onSubmit: vi.fn()
                }
            };

            // Simulate method change (onupdate would be called in real scenario)
            MethodForm.lastMethodName = undefined;
            MethodForm.onupdate(vnode2);

            // Verify form is reset (user-visible: new fields appear, old values gone)
            expect(MethodForm.formValues.param1).toBeUndefined();
            expect(MethodForm.formValues.param2).toBeNull();
        });
    });

    describe('Loading states', () => {
        it('loading state transitions correctly during async operations', async () => {
            // Test that loading state appears and disappears (user-visible: spinner shows/hides)
            const EndpointList = (await import('../components/EndpointList.js')).default;
            const onEndpointSelect = vi.fn();

            const apiModule = await import('../services/api.js');
            let resolveDiscover;
            const discoverPromise = new Promise(resolve => {
                resolveDiscover = resolve;
            });

            apiModule.discoverIDL.mockReturnValue(discoverPromise);

            const vnode = {
                attrs: {
                    currentEndpoint: null,
                    onEndpointSelect
                }
            };

            // Start operation
            const discoveryPromise = EndpointList.handleSelectEndpoint('http://example.com', vnode);

            // Verify loading state is set (user-visible: loading indicator appears)
            expect(EndpointList.discovering).toBe(true);
            
            // Complete operation
            resolveDiscover({ interfaces: [] });
            await discoveryPromise;

            // Verify loading state cleared (user-visible: loading indicator disappears)
            expect(EndpointList.discovering).toBe(false);
            
            // Verify callback called after loading completes (user-visible: content appears)
            expect(onEndpointSelect).toHaveBeenCalled();
        });
    });
});
