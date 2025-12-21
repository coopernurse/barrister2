// Global test setup - uses real Mithril
import { JSDOM } from 'jsdom';
import m from 'mithril';
import '@testing-library/jest-dom/vitest';

// Setup jsdom
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;

// Use real Mithril
global.window.m = m;
global.m = m;

// Add m.redraw mock (no-op in tests)
global.window.m.redraw = () => {
    // No-op in tests
};
