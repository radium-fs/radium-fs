import { describe, it, expect } from 'vitest';
import { defineKind } from '@radium-fs/core';
import { createTestStore, decode } from './helpers';

describe('dep() — dependency system', () => {
  const lib = defineKind<{ name: string }>({
    kind: 'lib',
    async onInit({ input, space }) {
      await space.writeFile('index.js', `export const name = "${input.name}";`);
    },
  });

  const config = defineKind<{ env: string }>({
    kind: 'config',
    async onInit({ input, space }) {
      await space.writeFile('config.json', JSON.stringify({ env: input.env }));
      return { exports: { '.': '.' } };
    },
  });

  it('creates symlink and returns absolute path', async () => {
    const { store, adapter } = createTestStore();

    const app = defineKind<{ env: string }>({
      kind: 'app',
      async onInit({ space }) {
        const libPath = await space.dep('lib', lib, { name: 'utils' });
        expect(libPath).toContain('.radium-fs-data/lib/');
      },
    });

    await store.ensure(app, { env: 'prod' });
  });

  it('symlinked content is readable through the mount path', async () => {
    const { store, adapter } = createTestStore();

    const app = defineKind({
      kind: 'app-read',
      async onInit({ space }) {
        await space.dep('mylib', lib, { name: 'hello' });
      },
    });

    const space = await store.ensure(app, {});
    const content = await adapter.readFile(`${space.path}/mylib/index.js`);
    expect(decode(content)).toBe('export const name = "hello";');
  });

  it('multiple deps mount independently', async () => {
    const { store, adapter } = createTestStore();

    const app = defineKind({
      kind: 'multi-dep',
      async onInit({ input, space }) {
        await space.dep('config', config, { env: 'prod' });
        await space.dep('lib', lib, { name: 'core' });
        await space.writeFile('main.js', 'ok');
      },
    });

    const space = await store.ensure(app, {});
    const cfg = decode(await adapter.readFile(`${space.path}/config/config.json`));
    expect(JSON.parse(cfg)).toEqual({ env: 'prod' });

    const libContent = decode(await adapter.readFile(`${space.path}/lib/index.js`));
    expect(libContent).toContain('core');
  });

  it('records dependencies in manifest', async () => {
    const { store } = createTestStore();

    const app = defineKind({
      kind: 'dep-manifest',
      async onInit({ space }) {
        await space.dep('lib', lib, { name: 'x' });
      },
    });

    const space = await store.ensure(app, {});
    expect(space.manifest.dependencies).toHaveLength(1);
    expect(space.manifest.dependencies![0].mountPath).toBe('lib');
    expect(space.manifest.dependencies![0].origin.kind).toBe('lib');
    expect(space.manifest.dependencies![0].scope).toBe('shared');
  });

  it('dep export selection: named export', async () => {
    const { store, adapter } = createTestStore();

    const multi = defineKind({
      kind: 'multi-export',
      async onInit({ space }) {
        await space.writeFile('dist/bundle.js', 'bundled');
        await space.writeFile('src/index.ts', 'source');
        return { exports: { '.': 'dist', './src': 'src' } };
      },
    });

    const consumer = defineKind({
      kind: 'consumer',
      async onInit({ space }) {
        await space.dep('source', multi, {}, { export: './src' });
      },
    });

    const space = await store.ensure(consumer, {});
    const content = decode(await adapter.readFile(`${space.path}/source/index.ts`));
    expect(content).toBe('source');
  });

  it('dep export not found throws', async () => {
    const { store } = createTestStore();

    const consumer = defineKind({
      kind: 'bad-export',
      async onInit({ space }) {
        await space.dep('x', lib, { name: 'a' }, { export: './nonexistent' });
      },
    });

    await expect(store.ensure(consumer, {})).rejects.toThrow('export "./nonexistent" not found');
  });

  it('dep export: * selects entire space directory', async () => {
    const { store, adapter } = createTestStore();

    const consumer = defineKind({
      kind: 'star-export',
      async onInit({ space }) {
        await space.dep('all', lib, { name: 'full' }, { export: '*' });
      },
    });

    const space = await store.ensure(consumer, {});
    const content = decode(await adapter.readFile(`${space.path}/all/index.js`));
    expect(content).toContain('full');
  });

  it('nested deps: A → B → C', async () => {
    const { store, adapter } = createTestStore();

    const c = defineKind<{ val: string }>({
      kind: 'c',
      async onInit({ input, space }) {
        await space.writeFile('c.txt', input.val);
      },
    });

    const b = defineKind({
      kind: 'b',
      async onInit({ space }) {
        await space.dep('c', c, { val: 'deep' });
        await space.writeFile('b.txt', 'middle');
      },
    });

    const a = defineKind({
      kind: 'a',
      async onInit({ space }) {
        await space.dep('b', b, {});
      },
    });

    const space = await store.ensure(a, {});
    const bContent = decode(await adapter.readFile(`${space.path}/b/b.txt`));
    expect(bContent).toBe('middle');
  });

  it('dep extraRuntime is passed to child', async () => {
    const { store } = createTestStore({ runtime: { base: 'store' } });
    let childRuntime: Record<string, unknown> | null = null;

    const child = defineKind({
      kind: 'child-rt',
      async onInit({ space }) {
        childRuntime = space.runtime as Record<string, unknown>;
      },
    });

    const parent = defineKind({
      kind: 'parent-rt',
      async onInit({ space }) {
        await space.dep('child', child, {}, { extraRuntime: { extra: 'val' } });
      },
    });

    await store.ensure(parent, {});
    expect(childRuntime).toEqual({ base: 'store', extra: 'val' });
  });
});
