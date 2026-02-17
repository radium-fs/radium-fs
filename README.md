<p align="center">
  <img src="docs/assets/radium-fs-logo.png" alt="radium-fs" width="200" />
</p>

<h1 align="center">radium-fs</h1>

<p align="center">
  A filesystem-level DAG caching engine for building interconnected spaces.
</p>

## What is radium-fs?

radium-fs manages a persistent pool of filesystem spaces. Each space is a real folder with a deterministic identity — same recipe, same input, same result. Spaces link to each other via symlinks, forming a dependency graph where nothing is duplicated and everything can be rebuilt.

**Why it matters:** Complex multi-agent systems need to share, compose, and reuse filesystem artifacts at scale. radium-fs gives them a shared infrastructure layer where spaces are created once, cached forever, linked instantly, and rebuilt on demand.

### Key Properties

- **Deterministic** — `kind + input → dataId`. Same input always produces the same space at the same path.
- **Composable** — Spaces declare dependencies via `dep()`. Symlinks wire them together in milliseconds, no copying.
- **Resilient** — Delete any space, it rebuilds from its recipe. Dependencies rebuild recursively.
- **Physical** — Every space is a real directory. Use grep, find, rg, or any tool you already have.
- **Runtime-agnostic** — Core has zero platform dependencies. Runs anywhere JavaScript runs.

### Quick Example

```typescript
import { defineKind, createStore } from '@radium-fs/core';
import { nodeAdapter } from '@radium-fs/node';

const lib = defineKind({
  kind: 'lib',
  async onInit({ input, space }) {
    await space.writeFile('index.js', `export const name = "${input.name}";`);
  },
});

const app = defineKind({
  kind: 'app',
  async onInit({ input, space }) {
    const libPath = await space.dep('lib', lib, { name: 'utils' });
    await space.writeFile('main.js', `import { name } from "${libPath}";`);
  },
});

const store = createStore({ root: '/project', adapter: nodeAdapter() });
const appSpace = await store.ensure(app, {});
// appSpace.path → deterministic, cached, with lib linked inside
```

## Packages

| Package | Description |
|---------|-------------|
| `@radium-fs/core` | Runtime-agnostic type definitions and constants |
| `@radium-fs/node` | Node.js filesystem adapter (requires Node.js >= 22) |
| `@radium-fs/memory` | In-memory filesystem adapter *(planned)* |

## Status

Work in progress. Core API definitions are in place, implementation coming soon.

## License

[MIT](LICENSE)
