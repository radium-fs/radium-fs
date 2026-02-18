import { createStore } from '@radium-fs/core';
import { memoryAdapter } from '@radium-fs/memory';
import type { RfsAdapter, RfsStore } from '@radium-fs/core';

export function createTestStore(opts?: { runtime?: Record<string, unknown> }): {
  store: RfsStore;
  adapter: RfsAdapter;
} {
  const adapter = memoryAdapter();
  const store = createStore({
    root: '/test',
    adapter,
    runtime: opts?.runtime,
  });
  return { store, adapter };
}

export const decode = (buf: Uint8Array) => new TextDecoder().decode(buf);
