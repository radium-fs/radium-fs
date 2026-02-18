import { defineKind } from '@radium-fs/core';
import { buildFileTree } from '../engine/file-tree';
import type { Scenario, StepResult } from '../engine/types';

const greeting = defineKind<{ name: string; lang: 'en' | 'zh' }>({
  kind: 'greeting',
  async onInit({ input, space }) {
    const text =
      input.lang === 'en'
        ? `Hello, ${input.name}!`
        : `你好，${input.name}！`;
    await space.writeFile('hello.txt', text);
    await space.writeFile(
      'meta.json',
      JSON.stringify(
        { name: input.name, lang: input.lang, generatedAt: new Date().toISOString() },
        null,
        2,
      ),
    );
    return { exports: { greeting: 'hello.txt' } };
  },
});

export const helloWorldScenario: Scenario = {
  id: 'hello-world',
  name: 'Hello World',
  steps: [
    {
      id: 'define-kind',
      label: 'Define the greeting kind',
      code: `const greeting = defineKind<{ name: string; lang: 'en' | 'zh' }>({
  kind: 'greeting',
  async onInit({ input, space }) {
    const text = input.lang === 'en'
      ? \`Hello, \${input.name}!\`
      : \`你好，\${input.name}！\`;

    await space.writeFile('hello.txt', text);
    await space.writeFile('meta.json', JSON.stringify({
      name: input.name,
      lang: input.lang,
      generatedAt: new Date().toISOString(),
    }, null, 2));

    return { exports: { greeting: 'hello.txt' } };
  },
});`,
      async run(): Promise<StepResult> {
        return { fileTree: null, events: [], durationMs: 0, cached: false };
      },
    },
    {
      id: 'ensure-miss',
      label: 'Create the space (cache miss)',
      code: `const space = await store.ensure(greeting, {
  name: 'World',
  lang: 'en',
});

// → init:start → onInit runs → init:done`,
      async run(ctx): Promise<StepResult> {
        const events: import('@radium-fs/core').RfsEvent[] = [];
        const unsub = ctx.store.on((e) => events.push(e));

        const start = performance.now();
        const space = await ctx.store.ensure(greeting, { name: 'World', lang: 'en' });
        const durationMs = Math.round(performance.now() - start);

        unsub();

        const fileTree = await buildFileTree(ctx.adapter, space.path);
        const cached = events.some((e) => e.type === 'init:cached');

        return { space, fileTree, events, durationMs, cached };
      },
    },
    {
      id: 'ensure-hit',
      label: 'Ensure again (cache hit)',
      code: `const space2 = await store.ensure(greeting, {
  name: 'World',
  lang: 'en',
});

// → init:cached (onInit skipped, same hash)`,
      async run(ctx): Promise<StepResult> {
        const events: import('@radium-fs/core').RfsEvent[] = [];
        const unsub = ctx.store.on((e) => events.push(e));

        const start = performance.now();
        const space = await ctx.store.ensure(greeting, { name: 'World', lang: 'en' });
        const durationMs = Math.round(performance.now() - start);

        unsub();

        const fileTree = await buildFileTree(ctx.adapter, space.path);
        const cached = events.some((e) => e.type === 'init:cached');

        return { space, fileTree, events, durationMs, cached };
      },
    },
  ],
};
