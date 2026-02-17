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

### What it looks like on disk

```
.radium-fs-data/
├── lib/
│   └── a3/
│       └── a3f2c18e…/                    ← kind:lib + {name:"utils"}
│           ├── .radium-fs-manifest.json
│           └── space/
│               └── index.js
│
├── config/
│   └── 9d/
│       └── 9d4e7b01…/                    ← kind:config + {env:"prod"}
│           ├── .radium-fs-manifest.json
│           └── space/
│               └── settings.json
│
└── app/
    └── 7b/
        └── 7b9e4d5f…/                    ← kind:app + {name:"web"}
            ├── .radium-fs-manifest.json
            └── space/
                ├── main.js
                ├── lib → ../../../lib/a3/a3f2c18e…/space/      ← symlink
                └── config → ../../../config/9d/9d4e7b01…/space/ ← symlink
```

Every space is a **real directory** with a **deterministic path** (kind → shard → hash). Dependencies are **symlinks** — no duplication, instant wiring, and any tool (grep, find, VS Code) just works.

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
// appSpace.path → /project/.radium-fs-data/app/7b/7b9e4d5f…
```

## Packages

| Package | Description |
|---------|-------------|
| `@radium-fs/core` | Runtime-agnostic core engine (defineKind, createStore, types) |
| `@radium-fs/node` | Node.js filesystem adapter (requires Node.js >= 22) |
| `@radium-fs/memory` | In-memory filesystem adapter *(planned)* |

## Status

Core engine and Node.js adapter are implemented. See `examples/node-basic/` for a runnable demo.

## License

[MIT](LICENSE)
