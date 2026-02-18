import { describe, it, expect } from 'vitest';
import { defineKind } from '@radium-fs/core';
import type { RfsEvent } from '@radium-fs/core';
import { createTestStore } from './helpers';

describe('event system — store.on()', () => {
  it('emits init:start and init:done on cache miss', async () => {
    const { store } = createTestStore();
    const events: RfsEvent[] = [];
    store.on((e) => events.push(e));

    const kind = defineKind({ kind: 'ev', async onInit() {} });
    await store.ensure(kind, {});

    expect(events.map(e => e.type)).toEqual(['init:start', 'init:done']);
  });

  it('emits init:cached on cache hit', async () => {
    const { store } = createTestStore();
    const kind = defineKind({ kind: 'ev-cache', async onInit() {} });

    await store.ensure(kind, {});

    const events: RfsEvent[] = [];
    store.on((e) => events.push(e));
    await store.ensure(kind, {});

    expect(events.map(e => e.type)).toEqual(['init:cached']);
  });

  it('emits init:error when onInit throws', async () => {
    const { store } = createTestStore();
    const events: RfsEvent[] = [];
    store.on((e) => events.push(e));

    const kind = defineKind({
      kind: 'ev-err',
      async onInit() { throw new Error('boom'); },
    });

    await expect(store.ensure(kind, {})).rejects.toThrow('boom');
    expect(events.map(e => e.type)).toEqual(['init:start', 'init:error']);
    const errEvent = events[1] as { type: string; error: Error };
    expect(errEvent.error.message).toBe('boom');
  });

  it('emits command:start and command:done', async () => {
    const { store } = createTestStore();
    const events: RfsEvent[] = [];
    store.on((e) => events.push(e));

    const kind = defineKind<{}, { x: number }>({
      kind: 'ev-cmd',
      async onInit() {},
      async onCommand() {},
    });

    const space = await store.ensure(kind, {});
    events.length = 0;

    await space.send({ x: 1 });
    expect(events.map(e => e.type)).toEqual(['command:start', 'command:done']);
  });

  it('emits command:error when onCommand throws', async () => {
    const { store } = createTestStore();
    const events: RfsEvent[] = [];
    store.on((e) => events.push(e));

    const kind = defineKind<{}, { x: number }>({
      kind: 'ev-cmd-err',
      async onInit() {},
      async onCommand() { throw new Error('cmd-boom'); },
    });

    const space = await store.ensure(kind, {});
    events.length = 0;

    await expect(space.send({ x: 1 })).rejects.toThrow('cmd-boom');
    expect(events.map(e => e.type)).toEqual(['command:start', 'command:error']);
  });

  it('emits custom events via emit() in onInit', async () => {
    const { store } = createTestStore();
    const events: RfsEvent[] = [];
    store.on((e) => events.push(e));

    const kind = defineKind({
      kind: 'ev-custom',
      async onInit({ emit }) {
        emit({ progress: 50 });
        emit({ progress: 100 });
      },
    });

    await store.ensure(kind, {});
    const customs = events.filter(e => e.type === 'custom');
    expect(customs).toHaveLength(2);
    expect((customs[0] as { payload: unknown }).payload).toEqual({ progress: 50 });
  });

  it('unsubscribe stops event delivery', async () => {
    const { store } = createTestStore();
    const events: RfsEvent[] = [];
    const unsub = store.on((e) => events.push(e));

    const kind = defineKind({ kind: 'ev-unsub', async onInit() {} });
    await store.ensure(kind, {});
    expect(events.length).toBeGreaterThan(0);

    const count = events.length;
    unsub();

    const kind2 = defineKind({ kind: 'ev-unsub2', async onInit() {} });
    await store.ensure(kind2, {});
    expect(events.length).toBe(count);
  });

  it('listener errors do not break the engine', async () => {
    const { store } = createTestStore();
    store.on(() => { throw new Error('listener crash'); });

    const kind = defineKind({ kind: 'ev-safe', async onInit() {} });
    await expect(store.ensure(kind, {})).resolves.toBeDefined();
  });
});

describe('event system — ensure options callbacks', () => {
  it('onStart and onDone callbacks fire', async () => {
    const { store } = createTestStore();
    let started = false;
    let done = false;

    const kind = defineKind({ kind: 'cb', async onInit() {} });
    await store.ensure(kind, {}, {
      onStart: () => { started = true; },
      onDone: () => { done = true; },
    });

    expect(started).toBe(true);
    expect(done).toBe(true);
  });

  it('onCached callback fires on cache hit', async () => {
    const { store } = createTestStore();
    const kind = defineKind({ kind: 'cb-cache', async onInit() {} });

    await store.ensure(kind, {});

    let cached = false;
    await store.ensure(kind, {}, { onCached: () => { cached = true; } });
    expect(cached).toBe(true);
  });

  it('onError callback fires on failure', async () => {
    const { store } = createTestStore();
    let errorMsg = '';

    const kind = defineKind({
      kind: 'cb-err',
      async onInit() { throw new Error('init fail'); },
    });

    await expect(
      store.ensure(kind, {}, { onError: (ctx) => { errorMsg = ctx.error.message; } }),
    ).rejects.toThrow();
    expect(errorMsg).toBe('init fail');
  });
});

describe('event system — space.on() / space.onCustom()', () => {
  it('space.on receives command events', async () => {
    const { store } = createTestStore();
    const kind = defineKind<{}, { v: number }>({
      kind: 'sp-ev',
      async onInit() {},
      async onCommand() {},
    });

    const space = await store.ensure(kind, {});
    const events: string[] = [];
    space.on('command:start', () => events.push('start'));
    space.on('command:done', () => events.push('done'));

    await space.send({ v: 1 });
    expect(events).toEqual(['start', 'done']);
  });

  it('space.on unsubscribe works', async () => {
    const { store } = createTestStore();
    const kind = defineKind<{}, { v: number }>({
      kind: 'sp-unsub',
      async onInit() {},
      async onCommand() {},
    });

    const space = await store.ensure(kind, {});
    const events: string[] = [];
    const unsub = space.on('command:done', () => events.push('done'));

    await space.send({ v: 1 });
    expect(events).toHaveLength(1);

    unsub();
    await space.send({ v: 2 });
    expect(events).toHaveLength(1);
  });

  it('space.onCustom receives emit() from onCommand', async () => {
    const { store } = createTestStore();
    const kind = defineKind<{}, { msg: string }>({
      kind: 'sp-custom',
      async onInit() {},
      async onCommand({ command, emit }) {
        emit({ echo: command.msg });
      },
    });

    const space = await store.ensure(kind, {});
    const payloads: unknown[] = [];
    space.onCustom((p) => payloads.push(p));

    await space.send({ msg: 'hello' });
    expect(payloads).toEqual([{ echo: 'hello' }]);
  });
});
