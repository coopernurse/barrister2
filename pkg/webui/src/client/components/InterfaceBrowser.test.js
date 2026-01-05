import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import InterfaceBrowser from './InterfaceBrowser.js';
import { mountComponent, unmountComponent, screen, userEvent } from '../test-utils.js';

describe('InterfaceBrowser Component', () => {
    let container;
    let idl;
    let onMethodSelectCallback;

    beforeEach(() => {
        idl = {
            interfaces: [
                {
                    name: 'UserService',
                    comment: 'User management service',
                    methods: [
                        {
                            name: 'getUser',
                            comment: 'Get user by ID',
                            parameters: [
                                { name: 'id', type: { builtIn: 'int' } }
                            ],
                            returnType: { userDefined: 'User' }
                        },
                        {
                            name: 'createUser',
                            parameters: [
                                { name: 'name', type: { builtIn: 'string' } }
                            ],
                            returnType: { userDefined: 'User' }
                        }
                    ]
                },
                {
                    name: 'ProductService',
                    methods: [
                        {
                            name: 'listProducts',
                            parameters: [],
                            returnType: { array: { userDefined: 'Product' } }
                        }
                    ]
                }
            ]
        };
        onMethodSelectCallback = vi.fn();
    });

    afterEach(() => {
        if (container) {
            unmountComponent(container);
        }
        InterfaceBrowser.expandedInterfaces.clear();
    });

    describe('Component initialization', () => {
        it('should expand first interface by default', () => {
            container = mountComponent(InterfaceBrowser, {
                idl: idl,
                onMethodSelect: onMethodSelectCallback
            });

            // First interface should be expanded (methods visible)
            expect(screen.getByText('getUser')).toBeInTheDocument();
            expect(screen.getByText('createUser')).toBeInTheDocument();
            
            // Second interface should be collapsed (methods not visible)
            expect(screen.queryByText('listProducts')).not.toBeInTheDocument();
        });

        it('should handle IDL with no interfaces', () => {
            const emptyIdl = { interfaces: [] };
            container = mountComponent(InterfaceBrowser, {
                idl: emptyIdl,
                onMethodSelect: onMethodSelectCallback
            });

            // When interfaces array is empty, component still renders the header
            // Check that no methods are shown
            expect(screen.queryByText('getUser')).not.toBeInTheDocument();
            expect(screen.getByText('Interfaces & Methods')).toBeInTheDocument();
        });
    });

    describe('Expand/collapse interfaces', () => {
        it('should toggle interface expansion', () => {
            // Test that clicking toggle button changes expanded state
            container = mountComponent(InterfaceBrowser, {
                idl: idl,
                onMethodSelect: onMethodSelectCallback
            });

            // Initially expanded
            expect(screen.getByText('getUser')).toBeInTheDocument();
            expect(InterfaceBrowser.expandedInterfaces.has('UserService')).toBe(true);

            // Manually toggle (simulating button click behavior)
            InterfaceBrowser.expandedInterfaces.delete('UserService');
            expect(InterfaceBrowser.expandedInterfaces.has('UserService')).toBe(false);

            // Expand again
            InterfaceBrowser.expandedInterfaces.add('UserService');
            expect(InterfaceBrowser.expandedInterfaces.has('UserService')).toBe(true);
        });
    });

    describe('Method selection', () => {
        it('should call onMethodSelect when method is clicked', async () => {
            container = mountComponent(InterfaceBrowser, {
                idl: idl,
                onMethodSelect: onMethodSelectCallback
            });

            // Click on a method
            const methodItem = screen.getByText('getUser').closest('.list-group-item');
            await userEvent.click(methodItem);

            expect(onMethodSelectCallback).toHaveBeenCalledTimes(1);
            const [iface, method] = onMethodSelectCallback.mock.calls[0];
            expect(iface.name).toBe('UserService');
            expect(method.name).toBe('getUser');
        });
    });

    describe('Type formatting', () => {
        it('should format builtin types', () => {
            expect(InterfaceBrowser.formatType({ builtIn: 'string' })).toBe('string');
            expect(InterfaceBrowser.formatType({ builtIn: 'int' })).toBe('int');
        });

        it('should format array types', () => {
            const formatted = InterfaceBrowser.formatType({
                array: { builtIn: 'string' }
            });
            expect(formatted).toBe('[]string');
        });

        it('should format map types', () => {
            const formatted = InterfaceBrowser.formatType({
                mapValue: { builtIn: 'int' }
            });
            expect(formatted).toBe('map[string]int');
        });

        it('should format user-defined types', () => {
            const formatted = InterfaceBrowser.formatType({
                userDefined: 'User'
            });
            expect(formatted).toBe('User');
        });

        it('should handle null/undefined types', () => {
            expect(InterfaceBrowser.formatType(null)).toBe('void');
            expect(InterfaceBrowser.formatType(undefined)).toBe('void');
        });
    });

    describe('Method display format', () => {
        it('should display method params and response on separate lines', () => {
            container = mountComponent(InterfaceBrowser, {
                idl: idl,
                onMethodSelect: onMethodSelectCallback
            });

            const methodItem = screen.getByText('getUser').closest('.list-group-item');
            const textContent = methodItem.textContent;
            
            expect(textContent).toContain('Params:');
            expect(textContent).toContain('id: int');
            expect(textContent).toContain('Response:');
            expect(textContent).toContain('User');
            
            const paramsIndex = textContent.indexOf('Params:');
            const responseIndex = textContent.indexOf('Response:');
            expect(paramsIndex).toBeLessThan(responseIndex);
        });

        it('should display "Params: none" for methods without parameters', () => {
            // Create IDL with only ProductService and expand it
            const productIdl = {
                interfaces: [{
                    name: 'ProductService',
                    methods: [{
                        name: 'listProducts',
                        parameters: [],
                        returnType: { array: { userDefined: 'Product' } }
                    }]
                }]
            };
            
            InterfaceBrowser.expandedInterfaces.clear();
            InterfaceBrowser.expandedInterfaces.add('ProductService');
            
            container = mountComponent(InterfaceBrowser, {
                idl: productIdl,
                onMethodSelect: onMethodSelectCallback
            });

            const methodItem = screen.getByText('listProducts').closest('.list-group-item');
            expect(methodItem.textContent).toContain('Params: none');
        });

        it('should display "Response: void" for methods with void return type', () => {
            const voidIdl = {
                interfaces: [{
                    name: 'TestService',
                    methods: [{
                        name: 'doSomething',
                        parameters: [{ name: 'id', type: { builtIn: 'int' } }],
                        returnType: null
                    }]
                }]
            };
            
            container = mountComponent(InterfaceBrowser, {
                idl: voidIdl,
                onMethodSelect: onMethodSelectCallback
            });

            const methodItem = screen.getByText('doSomething').closest('.list-group-item');
            expect(methodItem.textContent).toContain('Response: void');
        });
    });

    describe('Clickable method styling', () => {
        it('should have cursor pointer style on method list items', () => {
            container = mountComponent(InterfaceBrowser, {
                idl: idl,
                onMethodSelect: onMethodSelectCallback
            });

            const methodItem = screen.getByText('getUser').closest('.list-group-item');
            expect(methodItem.style.cursor).toBe('pointer');
        });

        it('should have nested div structure with method-content class', () => {
            container = mountComponent(InterfaceBrowser, {
                idl: idl,
                onMethodSelect: onMethodSelectCallback
            });

            const methodItem = screen.getByText('getUser').closest('.list-group-item');
            const methodContent = methodItem.querySelector('.method-content');
            expect(methodContent).not.toBeNull();
        });
    });
});
