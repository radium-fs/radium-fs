import { defineKind } from '@radium-fs/core';
import type { RfsEvent } from '@radium-fs/core';
import { buildFileTree } from '../engine/file-tree';
import type { Scenario, StepResult, RunContext } from '../engine/types';

type CounterCommand = { type: 'increment'; amount: number } | { type: 'reset' };

const counter = defineKind<{ name: string }, CounterCommand>({
  kind: 'counter',
  async onInit({ input, space }) {
    await space.writeFile(
      'state.json',
      JSON.stringify({ name: input.name, count: 0 }),
    );
    return { exports: { state: 'state.json' } };
  },
  async onCommand({ command, space, emit }) {
    const raw = await space.readFile('state.json');
    const state = JSON.parse(raw);

    if (command.type === 'increment') {
      state.count += command.amount;
      emit({ type: 'incremented', count: state.count });
    } else if (command.type === 'reset') {
      state.count = 0;
      emit({ type: 'reset', count: 0 });
    }

    await space.writeFile('state.json', JSON.stringify(state));
    return { exports: { state: 'state.json' } };
  },
});

export const commandsDemoScenario: Scenario = {
  id: 'commands-demo',
  name: 'Commands Demo',
  steps: [
    {
      id: 'define-counter',
      label: 'Define a counter kind with onCommand',
      code: `type CounterCommand =
  | { type: 'increment'; amount: number }
  | { type: 'reset' };

const counter = defineKind<{ name: string }, CounterCommand>({
  kind: 'counter',
  async onInit({ input, space }) {
    await space.writeFile('state.json',
      JSON.stringify({ name: input.name, count: 0 }));
    return { exports: { state: 'state.json' } };
  },
  async onCommand({ command, space, emit }) {
    const raw = await space.readFile('state.json');
    const state = JSON.parse(raw);

    if (command.type === 'increment') {
      state.count += command.amount;
      emit({ type: 'incremented', count: state.count });
    } else if (command.type === 'reset') {
      state.count = 0;
      emit({ type: 'reset', count: 0 });
    }

    await space.writeFile('state.json', JSON.stringify(state));
    return { exports: { state: 'state.json' } };
  },
});`,
      async run(): Promise<StepResult> {
        return { fileTree: null, events: [], durationMs: 0, cached: false };
      },
    },
    {
      id: 'create-counter',
      label: 'Ensure counter space',
      code: `const space = await store.ensure(counter, { name: 'clicks' });
// Creates the space with count: 0`,
      async run(ctx): Promise<StepResult> {
        const events: RfsEvent[] = [];
        const unsub = ctx.store.on((e) => events.push(e));
        const start = performance.now();
        const space = await ctx.store.ensure(counter, { name: 'clicks' });
        const durationMs = Math.round(performance.now() - start);
        unsub();
        const fileTree = await buildFileTree(ctx.adapter, space.path);
        const cached = events.some((e) => e.type === 'init:cached');
        return { space, fileTree, events, durationMs, cached };
      },
    },
    {
      id: 'send-increment',
      label: 'Send increment command',
      code: `await space.send({ type: 'increment', amount: 5 });
// Emits custom event: { type: 'incremented', count: 5 }`,
      async run(ctx): Promise<StepResult> {
        const prev = ctx.results.get('create-counter');
        if (!prev?.space) throw new Error('Counter space not found');

        const events: RfsEvent[] = [];
        const unsub = ctx.store.on((e) => events.push(e));
        const start = performance.now();

        const space = prev.space as import('@radium-fs/core').RfsSpaceBase & {
          send: (cmd: CounterCommand) => Promise<unknown>;
        };
        await space.send({ type: 'increment', amount: 5 });

        const durationMs = Math.round(performance.now() - start);
        unsub();
        const fileTree = await buildFileTree(ctx.adapter, space.path);
        return { space, fileTree, events, durationMs, cached: false };
      },
    },
    {
      id: 'send-more',
      label: 'Send another increment',
      code: `await space.send({ type: 'increment', amount: 3 });
// count is now 8`,
      async run(ctx): Promise<StepResult> {
        const prev = ctx.results.get('create-counter');
        if (!prev?.space) throw new Error('Counter space not found');

        const events: RfsEvent[] = [];
        const unsub = ctx.store.on((e) => events.push(e));
        const start = performance.now();

        const space = prev.space as import('@radium-fs/core').RfsSpaceBase & {
          send: (cmd: CounterCommand) => Promise<unknown>;
        };
        await space.send({ type: 'increment', amount: 3 });

        const durationMs = Math.round(performance.now() - start);
        unsub();
        const fileTree = await buildFileTree(ctx.adapter, space.path);
        return { space, fileTree, events, durationMs, cached: false };
      },
    },
  ],
};
