/**
 * radium-fs — In-memory basic example
 *
 * Demonstrates:
 * - Defining kinds (recipes for spaces)
 * - Creating a store with the in-memory adapter (no disk I/O)
 * - Ensuring spaces (cache miss → build, cache hit → instant)
 * - Composing spaces via dep() (in-memory symlinks)
 * - Reading back file contents from memory
 */

import { defineKind, createStore } from '@radium-fs/core';
import { memoryAdapter } from '@radium-fs/memory';

// ---------------------------------------------------------------------------
// 1. Define kinds — pure recipes, identical to the node-basic example
// ---------------------------------------------------------------------------

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

const lib = defineKind<{ name: string; version: string }>({
  kind: 'lib',
  async onInit({ input, space }) {
    await space.writeFile(
      'index.js',
      `export const name = "${input.name}";\nexport const version = "${input.version}";\n`,
    );
  },
});

const app = defineKind<{ env: string }>({
  kind: 'app',
  async onInit({ input, space }) {
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
// 2. Create store — in-memory, no filesystem needed
// ---------------------------------------------------------------------------

const adapter = memoryAdapter();
const store = createStore({
  root: '/project',
  adapter,
});

// ---------------------------------------------------------------------------
// 3. Ensure spaces — first call builds, second call is instant (cache hit)
// ---------------------------------------------------------------------------

console.log('--- First ensure (cache miss, will build) ---');
console.time('first ensure');
const appSpace = await store.ensure(app, { env: 'prod' });
console.timeEnd('first ensure');

console.log(`\nApp space path: ${appSpace.path}`);
console.log('App exports:', appSpace.exports);

console.log('\n--- Second ensure (cache hit, instant) ---');
console.time('second ensure');
await store.ensure(app, { env: 'prod' });
console.timeEnd('second ensure');

// ---------------------------------------------------------------------------
// 4. Read back files from memory — prove everything is wired up
// ---------------------------------------------------------------------------

const decode = (buf: Uint8Array) => new TextDecoder().decode(buf);

console.log('\n--- File contents (read from memory) ---');

const mainJs = await adapter.readFile(`${appSpace.path}/main.js`);
console.log('main.js:');
console.log(decode(mainJs));

const settingsJson = await adapter.readFile(`${appSpace.path}/config/settings.json`);
console.log('config/settings.json:');
console.log(decode(settingsJson));

const libIndex = await adapter.readFile(`${appSpace.path}/lib/index.js`);
console.log('lib/index.js:');
console.log(decode(libIndex));
