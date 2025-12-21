// Behavior-focused tests for EndpointList component
// These tests focus on user-visible outcomes through DOM interactions

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EndpointList from './EndpointList.js';
import { mountComponent, unmountComponent, screen, userEvent } from '../test-utils.js';
import * as storage from '../utils/storage.js';
import * as api from '../services/api.js';

// Mock dependencies
vi.mock('../utils/storage.js');
vi.mock('../services/api.js');

describe('EndpointList Behavior Tests', () => {
    let container;
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

    afterEach(() => {
        if (container) {
            unmountComponent(container);
        }
    });

    describe('Initial state', () => {
        it('loads endpoints from storage on initialization', () => {
            const mockEndpoints = [
                { url: 'http://example.com', lastUsed: '2023-01-01T00:00:00.000Z' }
            ];
            storage.getEndpoints.mockReturnValue(mockEndpoints);

            container = mountComponent(EndpointList, {
                currentEndpoint: null,
                onEndpointSelect: onEndpointSelectCallback
            });

            expect(storage.getEndpoints).toHaveBeenCalled();
            expect(screen.getByText('http://example.com')).toBeInTheDocument();
        });

        it('initializes with empty endpoint list when no endpoints exist', () => {
            storage.getEndpoints.mockReturnValue([]);

            container = mountComponent(EndpointList, {
                currentEndpoint: null,
                onEndpointSelect: onEndpointSelectCallback
            });

            expect(screen.getByText('No endpoints yet')).toBeInTheDocument();
        });
    });

    describe('Adding endpoints', () => {
        it('saves endpoint and triggers IDL discovery', async () => {
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

            container = mountComponent(EndpointList, {
                currentEndpoint: null,
                onEndpointSelect: onEndpointSelectCallback
            });

            // Type endpoint URL
            const input = screen.getByPlaceholderText('Endpoint URL');
            await userEvent.type(input, 'http://example.com');

            // Click add button
            const addButton = screen.getByRole('button', { name: '+' });
            await userEvent.click(addButton);

            // Verify endpoint was saved
            expect(storage.saveEndpoint).toHaveBeenCalledWith('http://example.com');
            
            // Verify IDL discovery was triggered
            await vi.waitFor(() => {
                expect(api.discoverIDL).toHaveBeenCalledWith('http://example.com');
            });
            
            // Verify callback called with IDL
            await vi.waitFor(() => {
                expect(onEndpointSelectCallback).toHaveBeenCalledWith(
                    'http://example.com',
                    mockIDL,
                    mockRegistry
                );
            });
        });

        it('sets discovering state during IDL discovery', async () => {
            let resolveDiscover;
            const discoverPromise = new Promise(resolve => {
                resolveDiscover = resolve;
            });
            api.discoverIDL.mockReturnValue(discoverPromise);

            // Set up endpoint in storage first
            storage.getEndpoints.mockReturnValue([
                { url: 'http://example.com', lastUsed: '2023-01-01T00:00:00.000Z' }
            ]);

            container = mountComponent(EndpointList, {
                currentEndpoint: null,
                onEndpointSelect: onEndpointSelectCallback
            });

            // Start discovery directly (not through click, as that's async)
            const discoveryPromise = EndpointList.handleSelectEndpoint('http://example.com', {
                attrs: {
                    currentEndpoint: null,
                    onEndpointSelect: onEndpointSelectCallback
                }
            });

            // Verify discovering state is set
            expect(EndpointList.discovering).toBe(true);

            // Complete discovery
            resolveDiscover({ interfaces: [] });
            await discoveryPromise;

            // Verify discovering state is cleared
            expect(EndpointList.discovering).toBe(false);
        });
    });

    describe('Selecting endpoints', () => {
        it('triggers IDL discovery and updates UI', async () => {
            const mockIDL = { interfaces: [], structs: [], enums: [] };
            api.discoverIDL.mockResolvedValue(mockIDL);

            const mockRegistry = {};
            vi.doMock('../utils/types.js', () => ({
                buildTypeRegistry: () => mockRegistry
            }));

            storage.getEndpoints.mockReturnValue([
                { url: 'http://example.com', lastUsed: '2023-01-01T00:00:00.000Z' }
            ]);

            container = mountComponent(EndpointList, {
                currentEndpoint: null,
                onEndpointSelect: onEndpointSelectCallback
            });

            // Click endpoint
            const endpointItem = screen.getByText('http://example.com');
            await userEvent.click(endpointItem);

            // Verify IDL discovery was triggered
            await vi.waitFor(() => {
                expect(api.discoverIDL).toHaveBeenCalledWith('http://example.com');
            });
            
            // Verify callback called with IDL
            await vi.waitFor(() => {
                expect(onEndpointSelectCallback).toHaveBeenCalledWith(
                    'http://example.com',
                    mockIDL,
                    mockRegistry
                );
            });
        });
    });

    describe('Removing endpoints', () => {
        it('removes endpoint from storage when confirmed', async () => {
            storage.getEndpoints.mockReturnValue([
                { url: 'http://example.com', lastUsed: '2023-01-01T00:00:00.000Z' },
                { url: 'http://test.com', lastUsed: '2023-01-02T00:00:00.000Z' }
            ]);

            container = mountComponent(EndpointList, {
                currentEndpoint: null,
                onEndpointSelect: onEndpointSelectCallback
            });

            global.confirm = vi.fn(() => true);

            // Click remove button
            const removeButtons = screen.getAllByRole('button', { name: '×' });
            await userEvent.click(removeButtons[0]);

            // Verify endpoint was removed
            expect(storage.removeEndpoint).toHaveBeenCalledWith('http://example.com');
        });

        it('clears selection when current endpoint is removed', async () => {
            storage.getEndpoints.mockReturnValue([
                { url: 'http://example.com', lastUsed: '2023-01-01T00:00:00.000Z' }
            ]);

            container = mountComponent(EndpointList, {
                currentEndpoint: 'http://example.com',
                onEndpointSelect: onEndpointSelectCallback
            });

            global.confirm = vi.fn(() => true);

            // Click remove button
            const removeButton = screen.getByRole('button', { name: '×' });
            await userEvent.click(removeButton);

            // Verify selection is cleared
            await vi.waitFor(() => {
                expect(onEndpointSelectCallback).toHaveBeenCalledWith(null, null, null);
            });
        });

        it('does not remove endpoint if user cancels', async () => {
            storage.getEndpoints.mockReturnValue([
                { url: 'http://example.com', lastUsed: '2023-01-01T00:00:00.000Z' }
            ]);

            container = mountComponent(EndpointList, {
                currentEndpoint: null,
                onEndpointSelect: onEndpointSelectCallback
            });

            global.confirm = vi.fn(() => false);

            // Click remove button
            const removeButton = screen.getByRole('button', { name: '×' });
            await userEvent.click(removeButton);

            // Verify endpoint was NOT removed
            expect(storage.removeEndpoint).not.toHaveBeenCalled();
        });
    });
});
