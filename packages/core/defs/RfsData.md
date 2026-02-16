# RfsData Space Structure

## Overview

RfsData is the filesystem data abstraction of radium-fs. Each space is an independent, traceable folder unit identified by a deterministic ID, supporting dependency references and command interaction.

## Directory Structure

### Storage Path

```
{root}/radium-fs-data/{kind}/{shard}/{dataId}/
```

- `root` — Data root directory (specified via `createStore({ root })`)
- `radium-fs-data` — Fixed top-level data directory name
- `kind` — Space type (corresponds to `defineKind({ kind })` value)
- `shard` — Shard directory (first two characters of dataId, distributes storage to avoid overly large directories)
- `dataId` — Deterministic unique identifier

### dataId Generation

```
dataId = hash(kind + JSON.stringify(cacheKey ?? input))
```

- If the Kind defines a `cacheKey` function, the result of `cacheKey(input)` is used
- Otherwise, the full `input` is used
- Same kind + same cacheKey/input = same dataId (deterministic)

### Shard Generation

```
shard = dataId.slice(0, 2)
```

The first two characters of the dataId are used as the shard directory name. For example, a dataId of `a1b2c3...` maps to shard directory `a1`.

### Temporary Path

A temporary directory is used during the build process, then atomically `rename`d to the final path upon completion:

```
{root}/radium-fs-data/{kind}/{shard}/.tmp-{dataId}-{random}/
```

- `.tmp-` — Temporary directory prefix
- `dataId` — Corresponding data identifier
- `random` — Random string to avoid concurrent conflicts

The internal structure of a temporary directory is identical to the final directory. Temporary directories are cleaned up on build failure.

### Single Space Internal Structure

```
{dataId}/
├── .radium-fs-manifest.json      ← Metadata file
├── space/                         ← Public content (operated on by onInit/onCommand)
│   ├── src/
│   ├── dist/
│   ├── deps/                      ← Dependency mount directory
│   │   ├── lib-a → <target export path>    ← symlink (shared scope)
│   │   └── lib-b → <target export path>    ← symlink (local scope)
│   └── ...
├── local/                         ← Private storage (operated on by space.local)
│   └── ...                        ← Not visible to space.readDir/glob
└── .radium-fs-deps/               ← Local-scope child dependency storage
    └── {child-kind}/{shard}/{childDataId}/
        ├── .radium-fs-manifest.json
        ├── space/
        ├── local/
        └── .radium-fs-deps/       ← Supports multi-level nesting
```

## Core Components

### Manifest (.radium-fs-manifest.json)

Metadata file containing the complete lifecycle information of a space:

| Field | Type | Description |
|-------|------|-------------|
| `version` | `1` | Protocol version |
| `origin` | `RfsOrigin` | Origin information (kind, input, cacheKey) |
| `exports` | `Record<string, string>` | Exports mapping (key = export name, value = path relative to space/) |
| `dependencies` | `RfsDependency[]?` | Dependency list |
| `commands` | `RfsCommandRecord[]?` | Command history |
| `metadata` | `Record<string, unknown>` | User-defined metadata |
| `createdAt` | `string` | Creation timestamp (ISO 8601) |
| `updatedAt` | `string` | Last update timestamp (ISO 8601) |

### Exports

The exports mapping is stored in the manifest with values as **paths relative to the space directory**.

At read time, these are automatically resolved to absolute paths: `RfsSpace.exports['.']` resolves to `{dataId}/space/{manifest.exports['.']}`

Conventions:
- `'.'` — Default export
- `'./xxx'` — Named export
- Default value is `{ '.': '.' }` (the entire space directory as the default export)

### Origin

Describes how the space was produced, used for lookup and regeneration:

| Field | Type | Description |
|-------|------|-------------|
| `kind` | `string` | Kind identifier |
| `input` | `Record<string, unknown>` | Runtime input parameters |
| `cacheKey` | `Record<string, unknown>?` | Cache key (optional) |

### Dependency

Dependencies are mounted via symlink at `space/deps/{mountPath}`:

| Field | Type | Description |
|-------|------|-------------|
| `mountPath` | `string` | Mount name |
| `origin` | `RfsOrigin` | Origin of the target space |
| `scope` | `'shared' \| 'local'` | Scope |
| `export` | `string?` | Selected export (defaults to `'.'`) |

Symlink target is determined by the `export` option:
- Omitted or `'.'` — points to the target space's default export path
- `'./src'` — points to the target space's `./src` export path
- `'*'` — points to the target space's `space/` directory (bypasses exports)

## Dependency Scopes

### shared (default)

Stored in the global `{root}/radium-fs-data/` directory:

```
{root}/radium-fs-data/{dep-kind}/{shard}/{depDataId}/
```

- Exists independently, not bound to any parent space
- Multiple spaces can share the same dependency
- Deleting the parent space does not affect shared dependencies

### local

Stored in the parent space's `.radium-fs-deps/` directory:

```
{parentDataId}/.radium-fs-deps/{dep-kind}/{shard}/{depDataId}/
```

- Physically belongs to the parent space, deleted when the parent is deleted
- Cannot be reused by other spaces
- Supports multi-level nesting (a local dependency can itself have local dependencies)

## Build Flow

1. Compute `dataId = hash(kind + JSON.stringify(cacheKey ?? input))`
2. Check if `{kind}/{shard}/{dataId}/` exists (cache hit check)
3. On cache hit: read the manifest and return an RfsSpace directly
4. On cache miss:
   a. Create temporary directory `.tmp-{dataId}-{random}/`
   b. Create `space/` and `local/` subdirectories inside the temp directory
   c. Execute `onInit`, writing files and mounting dependencies
   d. Write `.radium-fs-manifest.json`
   e. Atomically `rename` the temp directory to the final directory
   f. Return RfsSpace

## Design Principles

1. **Deterministic** — Same kind + input always produces the same dataId, providing natural deduplication
2. **Traceable** — Origin records the complete production method, supporting auditing and regeneration
3. **Sharded storage** — Shard directories distribute data to avoid overly large directories
4. **Tool-friendly** — Spaces are real directories, directly operable with grep/rg/find and other standard tools
5. **Physically isolated** — The local directory and space directory do not interfere with each other; dependency relationships are clear
6. **Atomic** — Temporary directory + rename ensures no half-built spaces exist
7. **Dependency tracking** — Manifest records all dependency relationships, supporting dependency graph analysis
