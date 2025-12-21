// Test utilities for Mithril components
import m from 'mithril';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';

/**
 * Mount a Mithril component and return the container
 * This uses real Mithril mounting, so components behave exactly as in production
 */
export function mountComponent(component, attrs = {}) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    
    // Reset component state if needed
    if (component.formValues) {
        component.formValues = {};
    }
    if (component.lastMethodName !== undefined) {
        component.lastMethodName = undefined;
    }
    if (component.expandedInterfaces) {
        component.expandedInterfaces.clear();
    }
    
    // Mount using real Mithril
    m.mount(container, {
        view: () => m(component, attrs)
    });
    
    return container;
}

/**
 * Unmount a component and clean up
 */
export function unmountComponent(container) {
    if (container) {
        m.mount(container, null);
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
    }
}

/**
 * Create a mock type registry for testing
 */
export function createMockRegistry() {
    return {
        structs: new Map([
            ['User', {
                name: 'User',
                fields: [
                    { name: 'id', type: { builtIn: 'int' } },
                    { name: 'name', type: { builtIn: 'string' } }
                ]
            }],
            ['Profile', {
                name: 'Profile',
                fields: [
                    { name: 'email', type: { builtIn: 'string' } }
                ]
            }]
        ]),
        enums: new Map([
            ['Status', {
                name: 'Status',
                values: [
                    { name: 'ACTIVE' },
                    { name: 'INACTIVE' }
                ]
            }]
        ]),
        interfaces: new Map()
    };
}

// Re-export Testing Library utilities for convenience
export { screen, within, userEvent };
