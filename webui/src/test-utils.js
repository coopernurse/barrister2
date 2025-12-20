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

/**
 * Render a Mithril component to a DOM container and return the container
 * This allows testing actual rendered output rather than internal state
 * Uses the global window.m from test-setup.js which creates real DOM elements
 */
export function renderComponent(component, attrs = {}, container = null) {
    if (!container) {
        container = document.createElement('div');
        document.body.appendChild(container);
    }
    
    // Reset component state if it has shared state
    if (component.formValues) {
        component.formValues = {};
    }
    if (component.lastMethodName !== undefined) {
        component.lastMethodName = undefined;
    }
    
    // Create vnode for component
    const vnode = {
        attrs: attrs,
        children: [],
        dom: container
    };
    
    // Initialize component if needed
    if (component.oninit) {
        component.oninit(vnode);
    }
    
    // Render component view using global m (from test-setup.js)
    // This creates actual DOM elements via window.m()
    const result = component.view(vnode);
    
    // Clear container and append rendered result
    container.innerHTML = '';
    
    // Helper to safely append node
    const appendNode = (node) => {
        if (!node) return;
        if (node.nodeType === Node.ELEMENT_NODE) {
            container.appendChild(node);
        } else if (node.nodeType === Node.TEXT_NODE) {
            container.appendChild(node);
        } else if (typeof node === 'string') {
            container.appendChild(document.createTextNode(node));
        } else if (typeof node === 'number') {
            container.appendChild(document.createTextNode(String(node)));
        }
    };
    
    if (result) {
        if (result.nodeType === Node.ELEMENT_NODE || result.nodeType === Node.TEXT_NODE) {
            appendNode(result);
        } else if (Array.isArray(result)) {
            result.forEach(child => {
                if (Array.isArray(child)) {
                    child.forEach(subChild => appendNode(subChild));
                } else {
                    appendNode(child);
                }
            });
        } else if (typeof result === 'string' || typeof result === 'number') {
            appendNode(result);
        }
    }
    
    return container;
}

/**
 * Find an element in a container with helpful error messages
 * Supports CSS selectors and partial text matching
 */
export function findElement(container, selector) {
    if (!container) {
        throw new Error(`findElement: container is null or undefined`);
    }
    
    // Handle text content selectors like "*=Loading..."
    if (selector.includes('*=')) {
        const text = selector.split('*=')[1];
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            null
        );
        
        let node;
        while (node = walker.nextNode()) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.includes(text)) {
                return node.parentElement;
            }
            if (node.nodeType === Node.ELEMENT_NODE && node.textContent.includes(text)) {
                return node;
            }
        }
        return null;
    }
    
    const element = container.querySelector(selector);
    if (!element) {
        // Provide helpful error with available elements
        const availableTags = Array.from(container.querySelectorAll('*'))
            .map(el => el.tagName.toLowerCase())
            .filter((tag, index, arr) => arr.indexOf(tag) === index)
            .slice(0, 10);
        throw new Error(
            `findElement: Could not find element matching "${selector}". ` +
            `Available tags: ${availableTags.join(', ')}`
        );
    }
    return element;
}

/**
 * Wait for an element to appear in the DOM (useful for async updates)
 */
export async function waitForElement(container, selector, timeout = 1000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
        try {
            const element = findElement(container, selector);
            if (element) {
                return element;
            }
        } catch (e) {
            // Element not found yet, continue waiting
        }
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    throw new Error(`waitForElement: Element "${selector}" did not appear within ${timeout}ms`);
}

/**
 * Clean up rendered components (remove from DOM)
 */
export function cleanupComponent(container) {
    if (container && container.parentNode) {
        container.parentNode.removeChild(container);
    }
}

