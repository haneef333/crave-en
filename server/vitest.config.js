import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    fileParallelism: false, // the test files share one test database
    testTimeout: 20000,
    hookTimeout: 30000,
  },
})
