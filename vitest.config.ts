import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.references/**',
      '**/examples/**',
    ],
  },
  resolve: {
    alias: {
      '@radium-fs/core': resolve(__dirname, 'packages/core/src/index.ts'),
      '@radium-fs/memory': resolve(__dirname, 'packages/memory/src/index.ts'),
    },
  },
});
