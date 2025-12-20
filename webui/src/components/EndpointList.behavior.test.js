// Behavior-focused tests for EndpointList component
// These tests focus on user-visible outcomes rather than implementation details
//
// NOTE: These tests demonstrate behavior-focused testing patterns.
// They test user-visible behavior through state changes and callbacks
// rather than DOM rendering, which avoids issues with Mithril test setup.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import EndpointList from './EndpointList.js';
import * as storage from '../utils/storage.js';
import * as api from '../services/api.js';

// Mock dependencies
vi.mock('../utils/storage.js');
vi.mock('../services/api.js');

describe('EndpointList Behavior Tests', () => {
    let onEndpointSelectCallback;

    beforeEach(() => {
        vi.clearAllMocks();
        onEndpointSelectCallback = vi.fn();
        storage.getEndpoints.mockReturnValue([]);
        storage.saveEndpoint.mockReturnValue(true);
        storage.removeEndpoint.mockReturnValue(true);
        
        // Reset component state
        EndpointList.newEndpointUrl = '';
        EndpointList.adding = false;
        EndpointList.discovering = false;
        EndpointList.endpoints = [];
    });

    describe('Initial state', () => {
        it('loads endpoints from storage on initialization', () => {
            // Test that component loads existing endpoints (user-visible: list appears)
            const mockEndpoints = [
                { url: 'http://example.com', lastUsed: '2023-01-01T00:00:00.000Z' }
            ];
            storage.getEndpoints.mockReturnValue(mockEndpoints);

            EndpointList.oninit();

            expect(storage.getEndpoints).toHaveBeenCalled();
            expect(EndpointList.endpoints).toEqual(mockEndpoints);
        });

        it('initializes with empty endpoint list when no endpoints exist', () => {
            // User-visible: shows "No endpoints yet" message
            storage.getEndpoints.mockReturnValue([]);

            EndpointList.oninit();

            expect(EndpointList.endpoints).toEqual([]);
        });
    });

    describe('Adding endpoints', () => {
        it('saves endpoint and triggers IDL discovery', async () => {
            // Test that adding endpoint saves it and discovers IDL (user-visible: endpoint appears, IDL loads)
            const mockIDL = {
                interfaces: [{ name: 'TestInterface', methods: [] }],
                structs: [],
                enums: []
            };
            api.discoverIDL.mockResolvedValue(mockIDL);

            // Mock buildTypeRegistry
            const mockRegistry = {};
            vi.doMock('../utils/types.js', () => ({
                buildTypeRegistry: () => mockRegistry
            }));

            EndpointList.newEndpointUrl = 'http://example.com';
            EndpointList.endpoints = [];

            const vnode = {
                attrs: {
                    currentEndpoint: null,
                    onEndpointSelect: onEndpointSelectCallback
                }
            };

            await EndpointList.handleAddEndpoint(vnode);

            // Verify endpoint was saved (user-visible: appears in list)
            expect(storage.saveEndpoint).toHaveBeenCalledWith('http://example.com');
            
            // Verify IDL discovery was triggered (user-visible: interfaces appear)
            expect(api.discoverIDL).toHaveBeenCalledWith('http://example.com');
            
            // Verify callback called with IDL (user-visible: UI updates with interfaces)
            expect(onEndpointSelectCallback).toHaveBeenCalledWith(
                'http://example.com',
                mockIDL,
                mockRegistry
            );
        });

        it('sets discovering state during IDL discovery', async () => {
            // Test loading state (user-visible: loading indicator appears)
            let resolveDiscover;
            const discoverPromise = new Promise(resolve => {
                resolveDiscover = resolve;
            });
            api.discoverIDL.mockReturnValue(discoverPromise);

            const vnode = {
                attrs: {
                    currentEndpoint: null,
                    onEndpointSelect: onEndpointSelectCallback
                }
            };

            // Start discovery
            const discoveryPromise = EndpointList.handleSelectEndpoint('http://example.com', vnode);
            
            // Verify discovering state is set (user-visible: loading shows)
            expect(EndpointList.discovering).toBe(true);

            // Complete discovery
            resolveDiscover({ interfaces: [] });
            await discoveryPromise;

            // Verify discovering state is cleared (user-visible: loading hides)
            expect(EndpointList.discovering).toBe(false);
        });
    });

    describe('Selecting endpoints', () => {
        it('triggers IDL discovery and updates UI', async () => {
            // Test that selecting endpoint discovers IDL (user-visible: interfaces appear)
            const mockIDL = { interfaces: [], structs: [], enums: [] };
            api.discoverIDL.mockResolvedValue(mockIDL);

            const mockRegistry = {};
            vi.doMock('../utils/types.js', () => ({
                buildTypeRegistry: () => mockRegistry
            }));

            const vnode = {
                attrs: {
                    currentEndpoint: null,
                    onEndpointSelect: onEndpointSelectCallback
                }
            };

            await EndpointList.handleSelectEndpoint('http://example.com', vnode);

            // Verify IDL discovery was triggered (user-visible: UI updates)
            expect(api.discoverIDL).toHaveBeenCalledWith('http://example.com');
            
            // Verify callback called with IDL (user-visible: interfaces displayed)
            expect(onEndpointSelectCallback).toHaveBeenCalledWith(
                'http://example.com',
                mockIDL,
                mockRegistry
            );
        });
    });

    describe('Removing endpoints', () => {
        it('removes endpoint from storage when confirmed', () => {
            // Test that endpoint removal works (user-visible: endpoint disappears from list)
            EndpointList.endpoints = [
                { url: 'http://example.com', lastUsed: '2023-01-01T00:00:00.000Z' },
                { url: 'http://test.com', lastUsed: '2023-01-02T00:00:00.000Z' }
            ];

            const vnode = {
                attrs: {
                    currentEndpoint: null,
                    onEndpointSelect: onEndpointSelectCallback
                }
            };

            global.confirm = vi.fn(() => true);

            EndpointList.handleRemoveEndpoint('http://example.com', vnode);

            // Verify endpoint was removed (user-visible: list updates)
            expect(storage.removeEndpoint).toHaveBeenCalledWith('http://example.com');
        });

        it('clears selection when current endpoint is removed', () => {
            // Test that removing selected endpoint clears selection (user-visible: active state removed)
            EndpointList.endpoints = [
                { url: 'http://example.com', lastUsed: '2023-01-01T00:00:00.000Z' }
            ];

            const vnode = {
                attrs: {
                    currentEndpoint: 'http://example.com',
                    onEndpointSelect: onEndpointSelectCallback
                }
            };

            global.confirm = vi.fn(() => true);

            EndpointList.handleRemoveEndpoint('http://example.com', vnode);

            // Verify selection is cleared (user-visible: interfaces disappear)
            expect(onEndpointSelectCallback).toHaveBeenCalledWith(null, null, null);
        });

        it('does not remove endpoint if user cancels', () => {
            // Test cancellation (user-visible: endpoint remains in list)
            EndpointList.endpoints = [
                { url: 'http://example.com', lastUsed: '2023-01-01T00:00:00.000Z' }
            ];

            const vnode = {
                attrs: {
                    currentEndpoint: null,
                    onEndpointSelect: onEndpointSelectCallback
                }
            };

            global.confirm = vi.fn(() => false);

            EndpointList.handleRemoveEndpoint('http://example.com', vnode);

            // Verify endpoint was NOT removed (user-visible: still in list)
            expect(storage.removeEndpoint).not.toHaveBeenCalled();
        });
    });
});
