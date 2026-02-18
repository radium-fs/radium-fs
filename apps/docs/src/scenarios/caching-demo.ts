import { defineKind } from '@radium-fs/core';
import type { RfsEvent } from '@radium-fs/core';
import { buildFileTree } from '../engine/file-tree';
import type { Scenario, StepResult, RunContext } from '../engine/types';

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

const bundle = defineKind<{ env: string }>({
  kind: 'bundle',
  async onInit({ input, space }) {
    await space.dep('config', config, { env: input.env });
    await space.writeFile(
      'bundle.js',
      `// Built for ${input.env}\nconsole.log("env:", "${input.env}");`,
    );
  },
});

async function runEnsure<T>(
  ctx: RunContext,
  kind: import('@radium-fs/core').RfsKind<T, never, Record<string, unknown>>,
  input: T,
): Promise<StepResult> {
  const events: RfsEvent[] = [];
  const unsub = ctx.store.on((e) => events.push(e));
  const start = performance.now();
  const space = await ctx.store.ensure(kind, input);
  const durationMs = Math.round(performance.now() - start);
  unsub();
  const fileTree = await buildFileTree(ctx.adapter, space.path);
  const cached = events.length > 0 && events.every(
    (e) => e.type === 'init:cached' || e.type === 'custom',
  );
  return { space, fileTree, events, durationMs, cached };
}

export const cachingDemoScenario: Scenario = {
  id: 'caching-demo',
  name: 'Caching Demo',
  steps: [
    {
      id: 'define-kinds',
      label: 'Define config and bundle kinds',
      code: `const config = defineKind<{ env: string }>({
  kind: 'config',
  async onInit({ input, space }) {
    await space.writeFile('settings.json',
      JSON.stringify({ env: input.env, debug: input.env !== 'prod' }, null, 2));
    return { exports: { '.': '.' } };
  },
});

const bundle = defineKind<{ env: string }>({
  kind: 'bundle',
  async onInit({ input, space }) {
    await space.dep('config', config, { env: input.env });
    await space.writeFile('bundle.js',
      \`// Built for \${input.env}\\nconsole.log("env:", "\${input.env}");\`);
  },
});`,
      async run(): Promise<StepResult> {
        return { fileTree: null, events: [], durationMs: 0, cached: false };
      },
    },
    {
      id: 'first-build',
      label: 'First build (cache miss)',
      code: `await store.ensure(bundle, { env: 'prod' });
// config: init:start → init:done
// bundle: init:start → init:done`,
      async run(ctx): Promise<StepResult> {
        return runEnsure(ctx, bundle, { env: 'prod' });
      },
    },
    {
      id: 'second-build',
      label: 'Same input again (cache hit)',
      code: `await store.ensure(bundle, { env: 'prod' });
// bundle: init:cached (onInit never runs)`,
      async run(ctx): Promise<StepResult> {
        return runEnsure(ctx, bundle, { env: 'prod' });
      },
    },
    {
      id: 'change-env',
      label: 'Change env to "staging" (partial rebuild)',
      code: `await store.ensure(bundle, { env: 'staging' });
// config: new input → rebuilds
// bundle: new input → rebuilds
// But a second "prod" ensure would still be cached!`,
      async run(ctx): Promise<StepResult> {
        return runEnsure(ctx, bundle, { env: 'staging' });
      },
    },
  ],
};
