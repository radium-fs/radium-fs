/**
 * radium-fs — Node.js basic example
 *
 * Demonstrates:
 * - Defining kinds (recipes for spaces)
 * - Creating a store with the Node.js adapter
 * - Ensuring spaces (cache miss → build, cache hit → instant)
 * - Composing spaces via dep() (symlink-based dependencies)
 */

import { defineKind, createStore } from '@radium-fs/core';
import { nodeAdapter } from '@radium-fs/node';

// ---------------------------------------------------------------------------
// 1. Define kinds — pure recipes, no platform dependency
// ---------------------------------------------------------------------------

/** A config space that generates a settings file */
const config = defineKind<{ env: string }>({
  kind: 'config',
  async onInit({ input, space }) {
    await space.writeFile(
      'settings.json',
      JSON.stringify({ env: input.env, debug: input.env !== 'prod' }, null, 2),
    );
    return { exports: { '.': '.' } };
  },
});

/** A lib space that generates a utility module */
const lib = defineKind<{ name: string; version: string }>({
  kind: 'lib',
  async onInit({ input, space }) {
    await space.writeFile(
      'index.js',
      `export const name = "${input.name}";\nexport const version = "${input.version}";\n`,
    );
  },
});

/** An app space that composes config + lib via dependencies */
const app = defineKind<{ env: string }>({
  kind: 'app',
  async onInit({ input, space }) {
    // Mount dependencies — these become real symlinks on disk
    await space.dep('config', config, { env: input.env });
    await space.dep('lib', lib, { name: 'utils', version: '1.0.0' });

    await space.writeFile(
      'main.js',
      [
        'import { name, version } from "./lib/index.js";',
        'import config from "./config/settings.json" with { type: "json" };',
        '',
        `console.log(\`App: \${name}@\${version}, env: \${config.env}\`);`,
        '',
      ].join('\n'),
    );
  },
});

// ---------------------------------------------------------------------------
// 2. Create store — this is where you pick the platform adapter
// ---------------------------------------------------------------------------

const store = createStore({
  root: '..',
  adapter: nodeAdapter(),
});

// ---------------------------------------------------------------------------
// 3. Ensure spaces — first call builds, second call is instant (cache hit)
// ---------------------------------------------------------------------------

console.log('--- First ensure (cache miss, will build) ---');
console.time('first ensure');
const appSpace = await store.ensure(app, { env: 'prod' });
console.timeEnd('first ensure');

console.log(`\nApp space path: ${appSpace.path}`);
console.log(`App exports:`, appSpace.exports);

console.log('\n--- Second ensure (cache hit, instant) ---');
console.time('second ensure');
await store.ensure(app, { env: 'prod' });
console.timeEnd('second ensure');

// ---------------------------------------------------------------------------
// 4. Inspect — use tree, ls, cat on the real directories
// ---------------------------------------------------------------------------

console.log('\n--- Disk structure ---');
console.log('Run the following to inspect:');
console.log(`  tree .radium-fs-data/`);
console.log(`  cat ${appSpace.path}/main.js`);
console.log(`  ls -la ${appSpace.path}/   # notice the symlinks`);
