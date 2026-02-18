# memory-basic

The simplest radium-fs in-memory example. Demonstrates space creation, caching, and dependency composition using the memory adapter — no disk I/O, runs anywhere.

## What it does

1. Defines three kinds: `config`, `lib`, and `app` (same recipes as `node-basic`)
2. `app` depends on `config` and `lib` via `dep()` — these become in-memory symlinks
3. First `ensure()` builds everything (cache miss)
4. Second `ensure()` returns instantly (cache hit)
5. Reads back file contents from the in-memory store, including through symlinked dependencies

## Run

```bash
pnpm install
pnpm start
```

## Expected output

```
--- First ensure (cache miss, will build) ---
first ensure: ~Xms

App space path: /project/.radium-fs-data/app/…
App exports: { '.': '/project/.radium-fs-data/app/…' }

--- Second ensure (cache hit, instant) ---
second ensure: ~Xms

--- File contents (read from memory) ---
main.js:
import { name, version } from "./lib/index.js";
import config from "./config/settings.json" with { type: "json" };

console.log(`App: ${name}@${version}, env: ${config.env}`);

config/settings.json:
{
  "env": "prod",
  "debug": false
}

lib/index.js:
export const name = "utils";
export const version = "1.0.0";
```

## Key difference from node-basic

Same kind definitions, same result — but everything lives in memory. No files on disk. This makes the memory adapter ideal for testing, browser environments, and playgrounds.
