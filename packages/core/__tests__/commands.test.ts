import { describe, it, expect } from 'vitest';
import { defineKind } from '@radium-fs/core';
import { createTestStore } from './helpers';

describe('command system', () => {
  const counter = defineKind<{}, { action: 'inc' | 'dec' }>({
    kind: 'counter',
    async onInit({ space }) {
      await space.writeFile('count.txt', '0');
      return { metadata: { count: 0 } };
    },
    async onCommand({ command, current, space }) {
      const count = (current.metadata.count as number) + (command.action === 'inc' ? 1 : -1);
      await space.writeFile('count.txt', String(count));
      return { metadata: { count } };
    },
  });

  it('kind with onCommand has send method', async () => {
    const { store } = createTestStore();
    const space = await store.ensure(counter, {});

    expect(typeof space.send).toBe('function');
    expect(typeof space.on).toBe('function');
    expect(typeof space.onCustom).toBe('function');
  });

  it('kind without onCommand has no send method', async () => {
    const { store } = createTestStore();
    const kind = defineKind({ kind: 'nosend', async onInit() {} });
    const space = await store.ensure(kind, {});

    expect((space as Record<string, unknown>).send).toBeUndefined();
  });

  it('send calls onCommand and returns updated state', async () => {
    const { store } = createTestStore();
    const space = await store.ensure(counter, {});

    const r1 = await space.send({ action: 'inc' });
    expect(r1.metadata.count).toBe(1);

    const r2 = await space.send({ action: 'inc' });
    expect(r2.metadata.count).toBe(2);

    const r3 = await space.send({ action: 'dec' });
    expect(r3.metadata.count).toBe(1);
  });

  it('send updates the manifest on disk', async () => {
    const { store, adapter } = createTestStore();
    const space = await store.ensure(counter, {});

    await space.send({ action: 'inc' });

    const manifestPath = space.path.replace(/\/space$/, '/.radium-fs-manifest.json');
    const raw = new TextDecoder().decode(await adapter.readFile(manifestPath));
    const manifest = JSON.parse(raw);

    expect(manifest.metadata.count).toBe(1);
    expect(manifest.commands).toHaveLength(1);
    expect(manifest.commands[0].command).toEqual({ action: 'inc' });
  });

  it('multiple sends accumulate command history', async () => {
    const { store, adapter } = createTestStore();
    const space = await store.ensure(counter, {});

    await space.send({ action: 'inc' });
    await space.send({ action: 'inc' });
    await space.send({ action: 'dec' });

    const manifestPath = space.path.replace(/\/space$/, '/.radium-fs-manifest.json');
    const raw = new TextDecoder().decode(await adapter.readFile(manifestPath));
    const manifest = JSON.parse(raw);

    expect(manifest.commands).toHaveLength(3);
  });

  it('onCommand receives current state', async () => {
    const { store } = createTestStore();
    let capturedCurrent: { exports: Record<string, string>; metadata: Record<string, unknown> } | null = null;

    const kind = defineKind<{}, { x: number }>({
      kind: 'capture-current',
      async onInit() {
        return { metadata: { initial: true } };
      },
      async onCommand({ current }) {
        capturedCurrent = current;
      },
    });

    const space = await store.ensure(kind, {});
    await space.send({ x: 1 });

    expect(capturedCurrent!.metadata).toEqual({ initial: true });
    expect(capturedCurrent!.exports).toEqual({ '.': '.' });
  });

  it('onCommand error propagates as rejection', async () => {
    const { store } = createTestStore();

    const kind = defineKind<{}, { cmd: string }>({
      kind: 'err-cmd',
      async onInit() {},
      async onCommand() {
        throw new Error('command failed');
      },
    });

    const space = await store.ensure(kind, {});
    await expect(space.send({ cmd: 'x' })).rejects.toThrow('command failed');
  });
});
