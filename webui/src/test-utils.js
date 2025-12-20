// Test utilities and mocks

/**
 * Mock Mithril for testing
 */
export function createMockMithril() {
    const m = {
        calls: [],
        createElement: (tag, attrs, children) => {
            return {
                tag,
                attrs: attrs || {},
                children: Array.isArray(children) ? children : (children ? [children] : []),
                text: typeof children === 'string' ? children : undefined
            };
        }
    };

    // Mock m() function
    m.m = (tag, attrs, ...children) => {
        if (typeof tag === 'string') {
            return m.createElement(tag, attrs, children.flat());
        } else if (typeof tag === 'object' && tag.view) {
            // Component
            const vnode = {
                attrs: attrs || {},
                children: children.flat(),
                dom: null
            };
            if (tag.oninit) {
                tag.oninit(vnode);
            }
            return tag.view(vnode);
        }
        return null;
    };

    return m;
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

/**
 * Helper to simulate DOM events
 */
export function simulateInput(element, value) {
    if (element) {
        element.value = value;
        const event = new Event('input', { bubbles: true });
        element.dispatchEvent(event);
    }
}

export function simulateChange(element, value) {
    if (element) {
        element.value = value;
        const event = new Event('change', { bubbles: true });
        element.dispatchEvent(event);
    }
}

export function simulateClick(element) {
    if (element) {
        const event = new MouseEvent('click', { bubbles: true });
        element.dispatchEvent(event);
    }
}

