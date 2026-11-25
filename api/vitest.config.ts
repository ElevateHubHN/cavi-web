import { defineConfig } from 'vitest/config';

// Los archivos comparten la base cavi_test y cada uno la vacía al empezar: se ejecutan uno por uno.
export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
    globalSetup: ['./src/testing/global-setup.ts'],
    include: ['src/**/*.spec.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
