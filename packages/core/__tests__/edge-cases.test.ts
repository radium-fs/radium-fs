import { describe, it, expect } from 'vitest';
import { defineKind } from '@radium-fs/core';
import type { RfsLockHandle, RfsLocker, RfsEvent } from '@radium-fs/core';
import { createTestStore } from './helpers';

describe('edge cases — error handling', () => {
  it('onInit error cleans up temp directory', async () => {
    const { store, adapter } = createTestStore();

    const kind = defineKind({
      kind: 'err-cleanup',
      async onInit() {
        throw new Error('init explosion');
      },
    });

    await expect(store.ensure(kind, {})).rejects.toThrow('init explosion');

    // The .radium-fs-data/err-cleanup/ shard dir should exist but contain no finalized space
    // (temp dirs are cleaned up on error)
    const has = await store.has({ kind: 'err-cleanup', input: {} });
    expect(has).toBe(false);
  });

  it('onInit returning void results in default exports', async () => {
    const { store } = createTestStore();
    const kind = defineKind({ kind: 'void-return', async onInit() {} });
    const space = await store.ensure(kind, {});

    expect(space.exports['.']).toBe(space.path);
    expect(space.manifest.exports).toEqual({ '.': '.' });
  });
});

describe('edge cases — input variations', () => {
  it('empty object input', async () => {
    const { store } = createTestStore();
    const kind = defineKind({ kind: 'empty-input', async onInit() {} });
    const space = await store.ensure(kind, {});

    expect(space.dataId).toBeTypeOf('string');
    expect(space.dataId.length).toBe(64);
  });

  it('null-ish input is treated as empty object', async () => {
    const { store } = createTestStore();
    const kind = defineKind({ kind: 'null-input', async onInit() {} });

    const s1 = await store.ensure(kind, null as never);
    const s2 = await store.ensure(kind, undefined as never);
    const s3 = await store.ensure(kind, {} as never);

    expect(s1.dataId).toBe(s2.dataId);
    expect(s2.dataId).toBe(s3.dataId);
  });
});

describe('edge cases — locker integration', () => {
  it('acquires and releases lock around ensure', async () => {
    const log: string[] = [];

    const mockLocker: RfsLocker = {
      async acquire(key: string): Promise<RfsLockHandle> {
        log.push(`acquire:${key}`);
        return {
          async release() { log.push(`release:${key}`); },
        };
      },
    };

    const adapter = (await import('@radium-fs/memory')).memoryAdapter();
    const { createStore } = await import('@radium-fs/core');
    const store = createStore({ root: '/locked', adapter, locker: mockLocker });

    const kind = defineKind({ kind: 'locked', async onInit() {} });
    const space = await store.ensure(kind, {});

    expect(log).toHaveLength(2);
    expect(log[0]).toBe(`acquire:${space.dataId}`);
    expect(log[1]).toBe(`release:${space.dataId}`);
  });

  it('releases lock even when onInit throws', async () => {
    let released = false;

    const mockLocker: RfsLocker = {
      async acquire(): Promise<RfsLockHandle> {
        return { async release() { released = true; } };
      },
    };

    const adapter = (await import('@radium-fs/memory')).memoryAdapter();
    const { createStore } = await import('@radium-fs/core');
    const store = createStore({ root: '/locked2', adapter, locker: mockLocker });

    const kind = defineKind({
      kind: 'locked-err',
      async onInit() { throw new Error('fail'); },
    });

    await expect(store.ensure(kind, {})).rejects.toThrow('fail');
    expect(released).toBe(true);
  });
});

describe('edge cases — AbortSignal', () => {
  it('aborted signal rejects ensure', async () => {
    const { store } = createTestStore();
    const kind = defineKind({ kind: 'abort', async onInit() {} });

    const controller = new AbortController();
    controller.abort();

    await expect(
      store.ensure(kind, {}, { signal: controller.signal }),
    ).rejects.toThrow('aborted');
  });
});

describe('edge cases — manifest integrity', () => {
  it('manifest contains correct version and origin', async () => {
    const { store } = createTestStore();
    const kind = defineKind<{ x: number }>({
      kind: 'manifest-check',
      async onInit() {},
    });
    const space = await store.ensure(kind, { x: 42 });

    expect(space.manifest.version).toBe(1);
    expect(space.manifest.origin.kind).toBe('manifest-check');
    expect(space.manifest.origin.input).toEqual({ x: 42 });
    expect(space.manifest.createdAt).toBeTypeOf('string');
    expect(space.manifest.updatedAt).toBeTypeOf('string');
  });

  it('manifest stores cacheKey in origin when present', async () => {
    const { store } = createTestStore();
    const kind = defineKind<{ name: string; debug: boolean }>({
      kind: 'ck-origin',
      cacheKey: (input) => ({ name: input.name }),
      async onInit() {},
    });
    const space = await store.ensure(kind, { name: 'a', debug: true });

    expect(space.manifest.origin.cacheKey).toEqual({ name: 'a' });
  });
});
