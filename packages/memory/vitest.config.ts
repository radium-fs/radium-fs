import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@radium-fs/core': resolve(__dirname, '../core/src/index.ts'),
      '@radium-fs/memory': resolve(__dirname, 'src/index.ts'),
    },
  },
});
