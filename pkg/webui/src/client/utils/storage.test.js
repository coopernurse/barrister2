import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getEndpoints,
    saveEndpoint,
    removeEndpoint
} from './storage.js';

describe('storage utilities', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
    });

    describe('getEndpoints', () => {
        it('should return empty array when no endpoints exist', () => {
            const endpoints = getEndpoints();
            expect(endpoints).toEqual([]);
        });

        it('should retrieve and sort endpoints by lastUsed (newest first)', () => {
            const endpoints = [
                { url: 'http://old.com', lastUsed: '2023-01-01T00:00:00.000Z' },
                { url: 'http://new.com', lastUsed: '2023-12-31T00:00:00.000Z' }
            ];
            localStorage.setItem('pulserpc_endpoints', JSON.stringify(endpoints));

            const result = getEndpoints();
            expect(result.length).toBe(2);
            expect(result[0].url).toBe('http://new.com');
            expect(result[1].url).toBe('http://old.com');
        });

        it('should handle corrupted localStorage data gracefully', () => {
            localStorage.setItem('pulserpc_endpoints', 'invalid json');
            
            // Should not throw, should return empty array
            const endpoints = getEndpoints();
            expect(endpoints).toEqual([]);
        });
    });

    describe('saveEndpoint', () => {
        it('should add new endpoint', () => {
            const url = 'http://example.com';
            const result = saveEndpoint(url);

            expect(result).toBe(true);
            const endpoints = getEndpoints();
            expect(endpoints.length).toBe(1);
            expect(endpoints[0].url).toBe(url);
            expect(endpoints[0].lastUsed).toBeDefined();
        });

        it('should update existing endpoint', () => {
            const url = 'http://example.com';
            saveEndpoint(url);

            // Update the endpoint
            saveEndpoint(url);
            const endpoints = getEndpoints();
            
            expect(endpoints.length).toBe(1);
            expect(endpoints[0].url).toBe(url);
            // Timestamp should be updated (or at least present)
            expect(endpoints[0].lastUsed).toBeDefined();
        });

        it('should handle localStorage errors gracefully', () => {
            // Mock localStorage.setItem to throw
            const originalSetItem = Storage.prototype.setItem;
            Storage.prototype.setItem = vi.fn(() => {
                throw new Error('Storage quota exceeded');
            });

            const result = saveEndpoint('http://example.com');
            expect(result).toBe(false);

            // Restore
            Storage.prototype.setItem = originalSetItem;
        });
    });

    describe('removeEndpoint', () => {
        it('should remove endpoint by URL', () => {
            saveEndpoint('http://example.com');
            saveEndpoint('http://other.com');

            const result = removeEndpoint('http://example.com');
            expect(result).toBe(true);

            const endpoints = getEndpoints();
            expect(endpoints.length).toBe(1);
            expect(endpoints[0].url).toBe('http://other.com');
        });

        it('should handle removing non-existent endpoint', () => {
            saveEndpoint('http://example.com');

            const result = removeEndpoint('http://nonexistent.com');
            expect(result).toBe(true);

            const endpoints = getEndpoints();
            expect(endpoints.length).toBe(1);
        });

        it('should handle localStorage errors gracefully', () => {
            saveEndpoint('http://example.com');

            // Mock localStorage.setItem to throw
            const originalSetItem = Storage.prototype.setItem;
            Storage.prototype.setItem = vi.fn(() => {
                throw new Error('Storage quota exceeded');
            });

            const result = removeEndpoint('http://example.com');
            expect(result).toBe(false);

            // Restore
            Storage.prototype.setItem = originalSetItem;
        });
    });
});

