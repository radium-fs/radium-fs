<p align="center">
  <img src="docs/assets/radium-fs-logo.png" alt="radium-fs" width="200" />
</p>

<h1 align="center">radium-fs</h1>

<p align="center">
  A filesystem space management system for managing and interconnecting folder spaces.
</p>

## What is radium-fs?

radium-fs lets you declaratively create, cache, and interconnect filesystem spaces. Each space is a managed folder with deterministic identity, dependency tracking, and lifecycle hooks.

### Core Concepts

- **Space** — A managed folder with a deterministic ID (`kind + input → dataId`), metadata manifest, and lifecycle hooks.
- **Kind** — A recipe (`defineKind`) that defines how a space is produced, with `onInit` and optional `onCommand` hooks.
- **Store** — The central API (`createStore`) that orchestrates space creation, caching, and dependency resolution.
- **Adapter** — A pluggable filesystem interface (`RfsFsAdapter`) that makes the core runtime-agnostic (Node.js, in-memory, etc.).

### Quick Example

```typescript
import { defineKind, createStore } from '@radium-fs/core';
import { nodeAdapter } from '@radium-fs/node';

const greeter = defineKind({
  kind: 'greeter',
  async onInit({ input, space }) {
    await space.writeFile('hello.txt', `Hello, ${input.name}!`);
  },
});

const store = createStore({ root: '/project', adapter: nodeAdapter() });
const space = await store.ensure(greeter, { name: 'world' });

console.log(space.path);    // deterministic path based on kind + input
console.log(space.exports); // { '.': '<absolute path to space dir>' }
```

## Packages

| Package | Description |
|---------|-------------|
| `@radium-fs/core` | Runtime-agnostic type definitions and constants |
| `@radium-fs/node` | Node.js filesystem adapter *(planned)* |
| `@radium-fs/memory` | In-memory filesystem adapter *(planned)* |

## Status

Work in progress. Core API definitions are in place, implementation coming soon.

## License

[MIT](LICENSE)
