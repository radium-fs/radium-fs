import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

function spaFallback(): Plugin {
  return {
    name: 'spa-fallback-404',
    closeBundle() {
      const dist = resolve(__dirname, 'dist');
      copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'));
    },
  };
}

export default defineConfig({
  base: '/radium-fs/',
  plugins: [
    {
      enforce: 'pre' as const,
      ...mdx({
        providerImportSource: '@mdx-js/react',
        remarkPlugins: [remarkGfm, remarkFrontmatter],
      }),
    },
    react({ include: /\.(tsx?|mdx?)$/ }),
    tailwindcss(),
    spaFallback(),
  ],
  resolve: {
    alias: {
      '@radium-fs/core': resolve(__dirname, '../../packages/core/src/index.ts'),
      '@radium-fs/memory': resolve(__dirname, '../../packages/memory/src/index.ts'),
    },
  },
});
