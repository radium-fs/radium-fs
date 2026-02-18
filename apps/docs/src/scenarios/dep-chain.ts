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
      ].join('\n'),
    );
  },
});

async function runEnsure<TInput, TCommand, TRuntime>(
  ctx: RunContext,
  kind: import('@radium-fs/core').RfsKind<TInput, TCommand, TRuntime>,
  input: TInput,
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

export const depChainScenario: Scenario = {
  id: 'dep-chain',
  name: 'Dependency Chain',
  steps: [
    {
      id: 'define-kinds',
      label: 'Define three kinds: config, lib, app',
      code: `const config = defineKind<{ env: string }>({
  kind: 'config',
  async onInit({ input, space }) {
    await space.writeFile('settings.json',
      JSON.stringify({ env: input.env, debug: input.env !== 'prod' }, null, 2));
    return { exports: { '.': '.' } };
  },
});

const lib = defineKind<{ name: string; version: string }>({
  kind: 'lib',
  async onInit({ input, space }) {
    await space.writeFile('index.js',
      \`export const name = "\${input.name}";\\nexport const version = "\${input.version}";\\n\`);
  },
});

const app = defineKind<{ env: string }>({
  kind: 'app',
  async onInit({ input, space }) {
    await space.dep('config', config, { env: input.env });
    await space.dep('lib', lib, { name: 'utils', version: '1.0.0' });

    await space.writeFile('main.js', '...');
  },
});`,
      async run(): Promise<StepResult> {
        return { fileTree: null, events: [], durationMs: 0, cached: false };
      },
    },
    {
      id: 'ensure-app',
      label: 'Ensure app (triggers full dependency chain)',
      code: `const appSpace = await store.ensure(app, { env: 'prod' });

// dep() inside onInit auto-ensures config and lib first:
//   init:start app
//   init:start config → init:done config
//   init:start lib    → init:done lib
//   init:done app
//
// app/config/ → symlink to config space exports
// app/lib/    → symlink to lib space exports`,
      async run(ctx): Promise<StepResult> {
        return runEnsure(ctx, app, { env: 'prod' });
      },
    },
    {
      id: 'ensure-cached',
      label: 'Ensure again (all three spaces cached)',
      code: `await store.ensure(app, { env: 'prod' });

// App already exists — one init:cached event.
// onInit never runs, so dep() is never called
// for config or lib either. Instant.`,
      async run(ctx): Promise<StepResult> {
        return runEnsure(ctx, app, { env: 'prod' });
      },
    },
    {
      id: 'change-input',
      label: 'Change env to "dev" (partial rebuild)',
      code: `await store.ensure(app, { env: 'dev' });

// config input changed → config rebuilds → app rebuilds
// But lib input unchanged → lib stays cached!
// This is the power of content-addressed spaces.`,
      async run(ctx): Promise<StepResult> {
        return runEnsure(ctx, app, { env: 'dev' });
      },
    },
  ],
};
