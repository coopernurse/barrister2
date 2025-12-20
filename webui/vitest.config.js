import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test file patterns
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.{idea,git,cache,output,temp}/**'],

    // Environment - use jsdom for browser-like environment
    environment: 'jsdom',
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      enabled: false, // Enable via --coverage flag
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.js'],
      exclude: [
        '**/*.test.js',
        '**/*.spec.js',
        '**/test-utils.js',
        '**/node_modules/**',
        '**/dist/**',
        'src/app.js',
        'src/components/JsonViewer.js'
      ],
      thresholds: {
        lines: 40,
        functions: 50,
        branches: 70,
        statements: 40
      }
    },

    // Setup files
    setupFiles: ['./src/test-setup.js'],

    // Mocking behavior
    clearMocks: true,
    restoreMocks: true
  }
});

