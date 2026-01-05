import { describe, it, expect, beforeEach, vi } from 'vitest';
import { discoverIDL, callMethod } from './api.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('API Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('discoverIDL', () => {
        it('should successfully discover IDL', async () => {
            const mockIDL = {
                interfaces: [{ name: 'TestInterface', methods: [] }],
                structs: [],
                enums: []
            };

            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({
                    result: mockIDL
                })
            };

            global.fetch.mockResolvedValue(mockResponse);

            const result = await discoverIDL('http://example.com');

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/proxy',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'X-Target-Endpoint': 'http://example.com'
                    }),
                    body: expect.stringContaining('barrister-idl')
                })
            );

            expect(result).toEqual(mockIDL);
        });

        it('should handle HTTP errors', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            };

            global.fetch.mockResolvedValue(mockResponse);

            await expect(discoverIDL('http://example.com')).rejects.toThrow();
        });

        it('should handle RPC errors', async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({
                    error: {
                        code: -32603,
                        message: 'Internal error'
                    }
                })
            };

            global.fetch.mockResolvedValue(mockResponse);

            await expect(discoverIDL('http://example.com')).rejects.toThrow('RPC error');
        });

        it('should handle missing result', async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({})
            };

            global.fetch.mockResolvedValue(mockResponse);

            await expect(discoverIDL('http://example.com')).rejects.toThrow('No IDL result');
        });

        it('should handle network errors', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));

            await expect(discoverIDL('http://example.com')).rejects.toThrow('Failed to discover IDL');
        });
    });

    describe('callMethod', () => {
        it('should successfully call method', async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({
                    result: { success: true },
                    id: 123
                })
            };

            global.fetch.mockResolvedValue(mockResponse);

            const params = { id: 1, name: 'Test' };
            const result = await callMethod(
                'http://example.com',
                'UserService',
                'getUser',
                params
            );

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/proxy',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'X-Target-Endpoint': 'http://example.com'
                    }),
                    body: expect.stringContaining('UserService.getUser')
                })
            );

            expect(result.result.success).toBe(true);
        });

        it('should handle HTTP errors', async () => {
            const mockResponse = {
                ok: false,
                status: 404,
                statusText: 'Not Found'
            };

            global.fetch.mockResolvedValue(mockResponse);

            await expect(callMethod(
                'http://example.com',
                'UserService',
                'getUser',
                {}
            )).rejects.toThrow('HTTP error');
        });

        it('should handle network errors', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));

            await expect(callMethod(
                'http://example.com',
                'UserService',
                'getUser',
                {}
            )).rejects.toThrow('RPC call failed');
        });

        it('should include correct method name in request', async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({ result: {} })
            };

            global.fetch.mockResolvedValue(mockResponse);

            await callMethod(
                'http://example.com',
                'UserService',
                'createUser',
                { name: 'Test' }
            );

            const callArgs = global.fetch.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);

            expect(body.method).toBe('UserService.createUser');
            expect(body.params).toEqual({ name: 'Test' });
        });

        it('should use timestamp as request ID', async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({ result: {} })
            };

            global.fetch.mockResolvedValue(mockResponse);

            const beforeTime = Date.now();
            await callMethod('http://example.com', 'Service', 'method', {});
            const afterTime = Date.now();

            const callArgs = global.fetch.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);

            expect(body.id).toBeGreaterThanOrEqual(beforeTime);
            expect(body.id).toBeLessThanOrEqual(afterTime);
        });
    });
});

