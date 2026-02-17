# node-basic

The simplest radium-fs example. Demonstrates space creation, caching, and dependency composition using the Node.js adapter.

## What it does

1. Defines three kinds: `config`, `lib`, and `app`
2. `app` depends on `config` and `lib` via `dep()` — these become real symlinks
3. First `ensure()` builds everything (cache miss)
4. Second `ensure()` returns instantly (cache hit)

## Run

```bash
pnpm install
pnpm start
```

## Expected output

```
--- First ensure (cache miss, will build) ---
first ensure: ~XXms

App space path: radium-fs-data/app-XXXXXXXX
App exports: { '.': '.' }

--- Second ensure (cache hit, instant) ---
second ensure: ~Xms

--- Disk structure ---
Run the following to inspect:
  tree radium-fs-data/
  ...
```

## Expected disk structure

```
radium-fs-data/
├── config-a1b2c3d4/
│   ├── .radium-fs-manifest.json
│   └── space/
│       └── settings.json              ← {"env":"prod","debug":false}
│
├── lib-e5f6a7b8/
│   ├── .radium-fs-manifest.json
│   └── space/
│       └── index.js                   ← export const name = "utils"; ...
│
└── app-c9d0e1f2/
    ├── .radium-fs-manifest.json
    └── space/
        ├── main.js
        ├── config → ../../config-a1b2c3d4/space/   ← symlink
        └── lib → ../../lib-e5f6a7b8/space/          ← symlink
```

Every space is a real directory. Dependencies are symlinks — zero duplication, instant wiring.
