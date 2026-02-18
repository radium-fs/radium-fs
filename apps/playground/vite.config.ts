import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/radium-fs/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@radium-fs/core': resolve(__dirname, '../../packages/core/src/index.ts'),
      '@radium-fs/memory': resolve(__dirname, '../../packages/memory/src/index.ts'),
    },
  },
});
