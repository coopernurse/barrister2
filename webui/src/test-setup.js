// Global test setup - sets up Mithril mock for all tests
import { JSDOM } from 'jsdom';

// Setup jsdom
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;

// Mock Mithril - create a simple mock that returns DOM elements
global.window.m = (tag, attrs, ...children) => {
    // Handle component objects
    if (typeof tag === 'object' && tag !== null && tag.view) {
        const vnode = {
            attrs: attrs || {},
            children: children.flat().filter(child => child !== null && child !== undefined && child !== false),
            dom: null
        };
        if (tag.oninit) {
            tag.oninit(vnode);
        }
        return tag.view(vnode);
    }

    // Skip falsy values (from conditional rendering)
    if (!tag || tag === false || tag === null || tag === undefined) {
        return null;
    }

    if (typeof tag === 'string') {
        // Handle Mithril selector syntax like 'div.class#id' or 'option[value=]'
        // Extract tag name - everything before first ., #, or [
        let tagName = tag;
        const firstSpecial = tag.search(/[.#\[]/);
        if (firstSpecial > 0) {
            tagName = tag.substring(0, firstSpecial);
        } else if (firstSpecial === 0) {
            // Starts with . or #, default to div
            tagName = 'div';
        }
        
        // Ensure valid tag name
        if (!tagName || tagName.length === 0) {
            tagName = 'div';
        }
        
        const element = document.createElement(tagName);
        
        // Extract classes and id from selector
        const classMatches = tag.match(/\.[\w-]+/g);
        if (classMatches) {
            classMatches.forEach(cls => {
                element.classList.add(cls.substring(1));
            });
        }
        
        const idMatch = tag.match(/#[\w-]+/);
        if (idMatch) {
            element.id = idMatch[0].substring(1);
        }
        
        // Handle attribute selectors like [value=], [type=text], etc.
        const attrMatches = tag.match(/\[([\w-]+)(?:=([^\]]*))?\]/g);
        if (attrMatches) {
            attrMatches.forEach(attrMatch => {
                const match = attrMatch.match(/\[([\w-]+)(?:=([^\]]*))?\]/);
                if (match) {
                    const attrName = match[1];
                    const attrValue = match[2] !== undefined ? match[2] : '';
                    element.setAttribute(attrName, attrValue);
                }
            });
        }
        
        if (attrs) {
            Object.keys(attrs).forEach(key => {
                if (key.startsWith('on')) {
                    const eventName = key.substring(2).toLowerCase();
                    element.addEventListener(eventName, (e) => {
                        if (typeof attrs[key] === 'function') {
                            attrs[key](e);
                        }
                    });
                } else if (key === 'class') {
                    element.className = attrs[key];
                } else if (key === 'id') {
                    element.id = attrs[key];
                } else if (key === 'value') {
                    element.value = attrs[key];
                } else if (key === 'checked') {
                    element.checked = attrs[key];
                } else if (key === 'placeholder') {
                    element.placeholder = attrs[key];
                } else if (key === 'step') {
                    element.setAttribute('step', attrs[key]);
                    element.step = attrs[key];
                } else if (key === 'for') {
                    element.setAttribute('for', attrs[key]);
                } else if (key === 'style') {
                    if (typeof attrs[key] === 'object') {
                        Object.assign(element.style, attrs[key]);
                    } else {
                        element.style.cssText = attrs[key];
                    }
                } else {
                    element.setAttribute(key, attrs[key]);
                }
            });
        }
        
        const processChildren = (childList) => {
            childList.forEach(child => {
                // Skip falsy values except 0 and ''
                if (child === null || child === undefined || child === false) {
                    return;
                }
                if (typeof child === 'string' || typeof child === 'number') {
                    element.appendChild(document.createTextNode(String(child)));
                } else if (child && child.nodeType) {
                    element.appendChild(child);
                } else if (Array.isArray(child)) {
                    processChildren(child.filter(c => c !== null && c !== undefined && c !== false));
                } else if (typeof child === 'object' && child.tagName) {
                    element.appendChild(child);
                }
                // Skip other falsy values
            });
        };

        // Filter children before processing
        const filteredChildren = children.filter(child => child !== null && child !== undefined && child !== false);
        processChildren(filteredChildren);
        return element;
    }
    return null;
};

