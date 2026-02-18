import { describe, it, expect } from 'vitest';
import { defineKind } from '@radium-fs/core';
import { createTestStore } from './helpers';

const kind = defineKind<{ id: string }>({
  kind: 'item',
  async onInit({ input, space }) {
    await space.writeFile('data.txt', input.id);
  },
});

describe('store.find()', () => {
  it('returns space when it exists', async () => {
    const { store } = createTestStore();
    await store.ensure(kind, { id: 'a' });

    const found = await store.find({ kind: 'item', input: { id: 'a' } });
    expect(found).not.toBeNull();
    expect(found!.kind).toBe('item');
    expect(found!.origin.input).toEqual({ id: 'a' });
  });

  it('returns null when not found', async () => {
    const { store } = createTestStore();
    const found = await store.find({ kind: 'item', input: { id: 'missing' } });
    expect(found).toBeNull();
  });
});

describe('store.has()', () => {
  it('returns true when space exists', async () => {
    const { store } = createTestStore();
    await store.ensure(kind, { id: 'x' });
    expect(await store.has({ kind: 'item', input: { id: 'x' } })).toBe(true);
  });

  it('returns false when space does not exist', async () => {
    const { store } = createTestStore();
    expect(await store.has({ kind: 'item', input: { id: 'nope' } })).toBe(false);
  });
});

describe('store.remove()', () => {
  it('removes an existing space', async () => {
    const { store } = createTestStore();
    await store.ensure(kind, { id: 'del' });

    expect(await store.has({ kind: 'item', input: { id: 'del' } })).toBe(true);
    await store.remove({ kind: 'item', input: { id: 'del' } });
    expect(await store.has({ kind: 'item', input: { id: 'del' } })).toBe(false);
  });

  it('remove cleans up event listeners (no memory leak)', async () => {
    const { store } = createTestStore();

    const cmdKind = defineKind<{ id: string }, { cmd: string }>({
      kind: 'cmd-rm',
      async onInit() {},
      async onCommand() {},
    });

    const space = await store.ensure(cmdKind, { id: 'leak-test' });
    let eventCount = 0;
    space.on('command:done', () => { eventCount++; });

    await space.send({ cmd: 'a' });
    expect(eventCount).toBe(1);

    await store.remove({ kind: 'cmd-rm', input: { id: 'leak-test' } });

    // Re-create and send — old listener should NOT fire
    const space2 = await store.ensure(cmdKind, { id: 'leak-test' }, { cache: false });
    await space2.send({ cmd: 'b' });
    expect(eventCount).toBe(1);
  });
});

describe('store.list()', () => {
  it('lists all spaces', async () => {
    const { store } = createTestStore();

    await store.ensure(kind, { id: '1' });
    await store.ensure(kind, { id: '2' });

    const all = await store.list();
    expect(all.length).toBe(2);
    expect(all.map(s => s.kind)).toEqual(['item', 'item']);
  });

  it('filters by kind', async () => {
    const { store } = createTestStore();

    const other = defineKind<{ v: number }>({
      kind: 'other',
      async onInit() {},
    });

    await store.ensure(kind, { id: 'a' });
    await store.ensure(other, { v: 1 });

    const items = await store.list('item');
    expect(items.length).toBe(1);
    expect(items[0].kind).toBe('item');

    const others = await store.list('other');
    expect(others.length).toBe(1);
    expect(others[0].kind).toBe('other');
  });

  it('returns empty array for empty store', async () => {
    const { store } = createTestStore();
    const all = await store.list();
    expect(all).toEqual([]);
  });

  it('returns empty array for unknown kind', async () => {
    const { store } = createTestStore();
    await store.ensure(kind, { id: 'a' });
    const none = await store.list('nonexistent');
    expect(none).toEqual([]);
  });
});
