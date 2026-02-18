import { describe, it, expect } from 'vitest';
import { defineKind } from '@radium-fs/core';
import { createTestStore, decode } from './helpers';

describe('createStore — lifecycle', () => {
  it('cache miss: calls onInit and creates space', async () => {
    const { store, adapter } = createTestStore();
    let initCalled = false;

    const kind = defineKind<{ name: string }>({
      kind: 'test',
      async onInit({ input, space }) {
        initCalled = true;
        await space.writeFile('out.txt', `hi ${input.name}`);
      },
    });

    const space = await store.ensure(kind, { name: 'alice' });

    expect(initCalled).toBe(true);
    expect(space.path).toContain('.radium-fs-data/test/');
    expect(space.kind).toBe('test');
    expect(space.dataId).toBeTypeOf('string');
    expect(space.dataId.length).toBe(64);

    const content = await adapter.readFile(`${space.path}/out.txt`);
    expect(decode(content)).toBe('hi alice');
  });

  it('cache hit: does not call onInit again', async () => {
    const { store } = createTestStore();
    let callCount = 0;

    const kind = defineKind<{ n: number }>({
      kind: 'counter',
      async onInit() { callCount++; },
    });

    const s1 = await store.ensure(kind, { n: 1 });
    const s2 = await store.ensure(kind, { n: 1 });

    expect(callCount).toBe(1);
    expect(s1.path).toBe(s2.path);
    expect(s1.dataId).toBe(s2.dataId);
  });

  it('different input produces different space', async () => {
    const { store } = createTestStore();
    const kind = defineKind<{ v: string }>({
      kind: 'k',
      async onInit() {},
    });

    const s1 = await store.ensure(kind, { v: 'a' });
    const s2 = await store.ensure(kind, { v: 'b' });

    expect(s1.dataId).not.toBe(s2.dataId);
    expect(s1.path).not.toBe(s2.path);
  });

  it('cache: false forces rebuild', async () => {
    const { store } = createTestStore();
    let callCount = 0;

    const kind = defineKind<{ x: number }>({
      kind: 'rebuild',
      async onInit() { callCount++; },
    });

    await store.ensure(kind, { x: 1 });
    expect(callCount).toBe(1);

    await store.ensure(kind, { x: 1 }, { cache: false });
    expect(callCount).toBe(2);
  });
});

describe('createStore — exports', () => {
  it('defaults to { ".": "." } when onInit returns void', async () => {
    const { store } = createTestStore();
    const kind = defineKind({ kind: 'void', async onInit() {} });
    const space = await store.ensure(kind, {});

    expect(space.exports['.']).toBe(space.path);
  });

  it('string shorthand export', async () => {
    const { store } = createTestStore();
    const kind = defineKind({
      kind: 'str-export',
      async onInit() {
        return { exports: 'dist' };
      },
    });
    const space = await store.ensure(kind, {});

    expect(space.exports['.']).toBe(`${space.path}/dist`);
  });

  it('full exports map', async () => {
    const { store } = createTestStore();
    const kind = defineKind({
      kind: 'full-export',
      async onInit() {
        return { exports: { '.': 'dist', './src': 'src' } };
      },
    });
    const space = await store.ensure(kind, {});

    expect(space.exports['.']).toBe(`${space.path}/dist`);
    expect(space.exports['./src']).toBe(`${space.path}/src`);
  });

  it('exports "." resolves to spaceDir itself', async () => {
    const { store } = createTestStore();
    const kind = defineKind({
      kind: 'dot-export',
      async onInit() {
        return { exports: { '.': '.' } };
      },
    });
    const space = await store.ensure(kind, {});

    expect(space.exports['.']).toBe(space.path);
    expect(space.exports['.'].endsWith('/.')).toBe(false);
  });
});

describe('createStore — metadata', () => {
  it('stores metadata from onInit', async () => {
    const { store } = createTestStore();
    const kind = defineKind({
      kind: 'meta',
      async onInit() {
        return { metadata: { version: 42 } };
      },
    });
    const space = await store.ensure(kind, {});

    expect(space.manifest.metadata).toEqual({ version: 42 });
  });

  it('defaults to empty object when not returned', async () => {
    const { store } = createTestStore();
    const kind = defineKind({ kind: 'nometa', async onInit() {} });
    const space = await store.ensure(kind, {});

    expect(space.manifest.metadata).toEqual({});
  });
});

describe('createStore — cacheKey', () => {
  it('same cacheKey with different input hits cache', async () => {
    const { store } = createTestStore();
    let callCount = 0;

    const kind = defineKind<{ name: string; debug: boolean }>({
      kind: 'ck',
      cacheKey: (input) => ({ name: input.name }),
      async onInit() { callCount++; },
    });

    const s1 = await store.ensure(kind, { name: 'a', debug: true });
    const s2 = await store.ensure(kind, { name: 'a', debug: false });

    expect(callCount).toBe(1);
    expect(s1.dataId).toBe(s2.dataId);
  });

  it('different cacheKey produces different space', async () => {
    const { store } = createTestStore();

    const kind = defineKind<{ name: string; debug: boolean }>({
      kind: 'ck2',
      cacheKey: (input) => ({ name: input.name }),
      async onInit() {},
    });

    const s1 = await store.ensure(kind, { name: 'a', debug: true });
    const s2 = await store.ensure(kind, { name: 'b', debug: true });

    expect(s1.dataId).not.toBe(s2.dataId);
  });
});

describe('createStore — runtime', () => {
  it('passes store-level runtime to onInit', async () => {
    const { store } = createTestStore({ runtime: { apiKey: 'secret' } });
    let captured: unknown;

    const kind = defineKind({
      kind: 'rt',
      async onInit({ space }) {
        captured = space.runtime;
      },
    });

    await store.ensure(kind, {});
    expect(captured).toEqual({ apiKey: 'secret' });
  });
});

describe('createStore — space file operations', () => {
  it('writeFile + readFile roundtrip', async () => {
    const { store } = createTestStore();
    let readResult = '';

    const kind = defineKind({
      kind: 'fops',
      async onInit({ space }) {
        await space.writeFile('test.txt', 'content here');
        readResult = await space.readFile('test.txt');
      },
    });

    await store.ensure(kind, {});
    expect(readResult).toBe('content here');
  });

  it('readFile with startLine and maxLines', async () => {
    const { store } = createTestStore();
    let partial = '';

    const kind = defineKind({
      kind: 'lines',
      async onInit({ space }) {
        await space.writeFile('lines.txt', 'one\ntwo\nthree\nfour\nfive');
        partial = await space.readFile('lines.txt', { startLine: 2, maxLines: 2 });
      },
    });

    await store.ensure(kind, {});
    expect(partial).toBe('two\nthree');
  });

  it('mkdir + readDir', async () => {
    const { store } = createTestStore();
    let entries: string[] = [];

    const kind = defineKind({
      kind: 'dirs',
      async onInit({ space }) {
        await space.mkdir('sub');
        await space.writeFile('sub/a.txt', 'a');
        await space.writeFile('sub/b.txt', 'b');
        entries = await space.readDir('sub');
      },
    });

    await store.ensure(kind, {});
    expect(entries).toContain('a.txt');
    expect(entries).toContain('b.txt');
  });

  it('stat returns correct info', async () => {
    const { store } = createTestStore();
    let fileStat: { isFile: boolean; isDirectory: boolean; size: number } | null = null;
    let dirStat: { isFile: boolean; isDirectory: boolean } | null = null;

    const kind = defineKind({
      kind: 'stat',
      async onInit({ space }) {
        await space.writeFile('f.txt', 'hello');
        await space.mkdir('d');
        fileStat = await space.stat('f.txt');
        dirStat = await space.stat('d');
      },
    });

    await store.ensure(kind, {});
    expect(fileStat!.isFile).toBe(true);
    expect(fileStat!.isDirectory).toBe(false);
    expect(fileStat!.size).toBe(5);
    expect(dirStat!.isFile).toBe(false);
    expect(dirStat!.isDirectory).toBe(true);
  });

  it('copy and move', async () => {
    const { store } = createTestStore();
    let copyContent = '';
    let moveContent = '';
    let srcExists = true;

    const kind = defineKind({
      kind: 'copymove',
      async onInit({ space }) {
        await space.writeFile('a.txt', 'data');
        await space.copy('a.txt', 'b.txt');
        copyContent = await space.readFile('b.txt');

        await space.writeFile('c.txt', 'moved');
        await space.move('c.txt', 'd.txt');
        moveContent = await space.readFile('d.txt');
        try {
          await space.readFile('c.txt');
        } catch {
          srcExists = false;
        }
      },
    });

    await store.ensure(kind, {});
    expect(copyContent).toBe('data');
    expect(moveContent).toBe('moved');
    expect(srcExists).toBe(false);
  });

  it('remove file', async () => {
    const { store } = createTestStore();
    let exists = true;

    const kind = defineKind({
      kind: 'rm',
      async onInit({ space }) {
        await space.writeFile('tmp.txt', 'x');
        await space.remove('tmp.txt');
        try {
          await space.readFile('tmp.txt');
        } catch {
          exists = false;
        }
      },
    });

    await store.ensure(kind, {});
    expect(exists).toBe(false);
  });

  it('glob finds matching files', async () => {
    const { store } = createTestStore();
    let found: string[] = [];

    const kind = defineKind({
      kind: 'glob',
      async onInit({ space }) {
        await space.writeFile('a.ts', '');
        await space.writeFile('b.js', '');
        await space.writeFile('c.ts', '');
        found = await space.glob('**/*.ts');
      },
    });

    await store.ensure(kind, {});
    expect(found).toContain('a.ts');
    expect(found).toContain('c.ts');
    expect(found).not.toContain('b.js');
  });

  it('grep searches file contents', async () => {
    const { store } = createTestStore();
    let found: string[] = [];

    const kind = defineKind({
      kind: 'grep',
      async onInit({ space }) {
        await space.writeFile('code.ts', 'const x = 1;\nconst y = 2;\nfunction hello() {}');
        found = await space.grep('const');
      },
    });

    await store.ensure(kind, {});
    expect(found.length).toBe(2);
    expect(found[0]).toContain('const x');
    expect(found[1]).toContain('const y');
  });

  it('local storage is isolated', async () => {
    const { store } = createTestStore();
    let localContent = '';

    const kind = defineKind({
      kind: 'local',
      async onInit({ space }) {
        await space.local.writeFile('private.txt', 'secret');
        localContent = await space.local.readFile('private.txt');
      },
    });

    await store.ensure(kind, {});
    expect(localContent).toBe('secret');
  });
});
