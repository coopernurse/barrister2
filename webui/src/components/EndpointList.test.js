import { describe, it, expect, beforeEach, vi } from 'vitest';
import EndpointList from './EndpointList.js';
import * as storage from '../utils/storage.js';
import * as api from '../services/api.js';

// Mock dependencies
vi.mock('../utils/storage.js');
vi.mock('../services/api.js');

describe('EndpointList Component', () => {
    let onEndpointSelectCallback;

    beforeEach(() => {
        vi.clearAllMocks();
        onEndpointSelectCallback = vi.fn();
        storage.getEndpoints.mockReturnValue([]);
        storage.saveEndpoint.mockReturnValue(true);
        storage.removeEndpoint.mockReturnValue(true);
    });

    describe('Component initialization', () => {
        it('should load endpoints on init', () => {
            const mockEndpoints = [
                { url: 'http://example.com', lastUsed: '2023-01-01T00:00:00.000Z' }
            ];
            storage.getEndpoints.mockReturnValue(mockEndpoints);

            EndpointList.oninit();

            expect(storage.getEndpoints).toHaveBeenCalled();
            expect(EndpointList.endpoints).toEqual(mockEndpoints);
        });
    });

    describe('Add endpoint', () => {
        it('should add new endpoint', async () => {
            const mockIDL = {
                interfaces: [],
                structs: [],
                enums: []
            };
            api.discoverIDL.mockResolvedValue(mockIDL);

            EndpointList.newEndpointUrl = 'http://new.com';
            EndpointList.endpoints = [];

            const vnode = {
                attrs: {
                    currentEndpoint: null,
                    onEndpointSelect: onEndpointSelectCallback
                }
            };

            await EndpointList.handleAddEndpoint(vnode);

            expect(storage.saveEndpoint).toHaveBeenCalledWith('http://new.com');
            expect(EndpointList.newEndpointUrl).toBe('');
        });

        it('should not add empty endpoint', async () => {
            EndpointList.newEndpointUrl = '';
            EndpointList.endpoints = [];

            const vnode = {
                attrs: {
                    currentEndpoint: null,
                    onEndpointSelect: onEndpointSelectCallback
                }
            };

            await EndpointList.handleAddEndpoint(vnode);

            expect(storage.saveEndpoint).not.toHaveBeenCalled();
        });

        it('should handle errors when adding endpoint', async () => {
            storage.saveEndpoint.mockImplementation(() => {
                throw new Error('Storage error');
            });

            EndpointList.newEndpointUrl = 'http://example.com';
            const vnode = {
                attrs: {
                    currentEndpoint: null,
                    onEndpointSelect: onEndpointSelectCallback
                }
            };

            // Mock alert to avoid actual alert in tests
            global.alert = vi.fn();

            await EndpointList.handleAddEndpoint(vnode);

            expect(global.alert).toHaveBeenCalled();
            expect(EndpointList.adding).toBe(false);
        });
    });

    describe('Select endpoint', () => {
        it('should select endpoint and discover IDL', async () => {
            const mockIDL = {
                interfaces: [{ name: 'TestInterface', methods: [] }],
                structs: [],
                enums: []
            };
            api.discoverIDL.mockResolvedValue(mockIDL);

            const vnode = {
                attrs: {
                    currentEndpoint: null,
                    onEndpointSelect: onEndpointSelectCallback
                }
            };

            await EndpointList.handleSelectEndpoint('http://example.com', vnode);

            expect(api.discoverIDL).toHaveBeenCalledWith('http://example.com');
            expect(onEndpointSelectCallback).toHaveBeenCalled();
            expect(EndpointList.discovering).toBe(false);
        });

        it('should handle IDL discovery errors', async () => {
            api.discoverIDL.mockRejectedValue(new Error('Discovery failed'));

            const vnode = {
                attrs: {
                    currentEndpoint: null,
                    onEndpointSelect: onEndpointSelectCallback
                }
            };

            // Mock alert
            global.alert = vi.fn();

            await EndpointList.handleSelectEndpoint('http://example.com', vnode);

            expect(global.alert).toHaveBeenCalled();
            expect(EndpointList.discovering).toBe(false);
        });
    });

    describe('Remove endpoint', () => {
        it('should remove endpoint', () => {
            EndpointList.endpoints = [
                { url: 'http://example.com', lastUsed: '2023-01-01T00:00:00.000Z' },
                { url: 'http://other.com', lastUsed: '2023-01-02T00:00:00.000Z' }
            ];

            const vnode = {
                attrs: {
                    currentEndpoint: 'http://other.com',
                    onEndpointSelect: onEndpointSelectCallback
                }
            };

            // Mock confirm
            global.confirm = vi.fn(() => true);

            EndpointList.handleRemoveEndpoint('http://example.com', vnode);

            expect(storage.removeEndpoint).toHaveBeenCalledWith('http://example.com');
            expect(global.confirm).toHaveBeenCalled();
        });

        it('should clear selection if removing current endpoint', () => {
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

            expect(onEndpointSelectCallback).toHaveBeenCalledWith(null, null, null);
        });

        it('should not remove if user cancels', () => {
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

            expect(storage.removeEndpoint).not.toHaveBeenCalled();
        });
    });
});

