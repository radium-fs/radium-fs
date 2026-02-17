# RfsData Space Structure

## Overview

RfsData is the filesystem data abstraction of radium-fs. Each space is an independent, traceable folder unit identified by a deterministic ID, supporting dependency references and command interaction.

## Directory Structure

### Storage Path

```
{root}/.radium-fs-data/{kind}/{shard}/{dataId}/
```

- `root` — Data root directory (specified via `createStore({ root })`)
- `.radium-fs-data` — Fixed top-level data directory name
- `kind` — Space type (corresponds to `defineKind({ kind })` value)
- `shard` — Shard directory (first two characters of dataId, distributes storage to avoid overly large directories)
- `dataId` — Deterministic unique identifier

### dataId Generation

```
dataId = sha256(kind + "\0" + canonicalStringify(cacheKey ?? input))
```

- If the Kind defines a `cacheKey` function, the result of `cacheKey(input)` is used
- Otherwise, the full `input` is used
- Same kind + same cacheKey/input = same dataId (deterministic)

#### Canonical Serialization

`JSON.stringify` does **not** guarantee key ordering — `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` may produce different strings depending on the runtime. To ensure deterministic dataId generation across any environment, radium-fs uses **canonical JSON serialization**:

1. Object keys are sorted **recursively** in lexicographic (Unicode code-point) order
2. No whitespace or formatting (compact output)
3. Values follow standard JSON serialization rules (`undefined` → omitted, `NaN`/`Infinity` → `null`)
4. A null byte (`\0`) separates the kind from the serialized payload to prevent ambiguity

The core provides a `canonicalStringify` utility that implements this specification.

#### Hash Algorithm

- **Algorithm**: SHA-256
- **Output**: lowercase hex-encoded digest (64 characters)
- **Constant**: `RFS_HASH_ALGORITHM = 'sha256'`
- **Implementation**: provided by the platform adapter via `adapter.hash()`

The full 64-character hex digest is used as the dataId. This gives a collision probability of ~2⁻¹²⁸ (birthday bound), which is effectively zero for any practical dataset.

### Shard Generation

```
shard = dataId.slice(0, 2)
```

The first two characters of the dataId are used as the shard directory name. For example, a dataId of `a1b2c3...` maps to shard directory `a1`.

### Temporary Path

A temporary directory is used during the build process, then atomically `rename`d to the final path upon completion:

```
{root}/.radium-fs-data/{kind}/{shard}/.tmp-{dataId}-{random}/
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
│   ├── lib-a → <target export path>    ← dependency symlink (mountPath = "lib-a")
│   ├── vendor/
│   │   └── lib-b → <target export path>  ← dependency symlink (mountPath = "vendor/lib-b")
│   └── ...
├── local/                         ← Private storage (operated on by space.local)
│   └── ...                        ← Not visible to space.readDir/glob
└── .radium-fs-local-deps/         ← Local-scope child dependency storage
    └── {child-kind}/{shard}/{childDataId}/
        ├── .radium-fs-manifest.json
        ├── space/
        ├── local/
        └── .radium-fs-local-deps/ ← Supports multi-level nesting
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

Dependencies are mounted via symlink at `space/{mountPath}`:

| Field | Type | Description |
|-------|------|-------------|
| `mountPath` | `string` | Mount path (relative to space/) |
| `origin` | `RfsOrigin` | Origin of the target space |
| `scope` | `'shared' \| 'local'` | Scope |
| `export` | `string?` | Selected export (defaults to `'.'`) |

Symlink target is determined by the `export` option:
- Omitted or `'.'` — points to the target space's default export path
- `'./src'` — points to the target space's `./src` export path
- `'*'` — points to the target space's `space/` directory (bypasses exports)

## Dependency Scopes

### shared (default)

Stored in the global `{root}/.radium-fs-data/` directory:

```
{root}/.radium-fs-data/{dep-kind}/{shard}/{depDataId}/
```

- Exists independently, not bound to any parent space
- Multiple spaces can share the same dependency
- Deleting the parent space does not affect shared dependencies

### local

Stored in the parent space's `.radium-fs-local-deps/` directory:

```
{parentDataId}/.radium-fs-local-deps/{dep-kind}/{shard}/{depDataId}/
```

- Physically belongs to the parent space, deleted when the parent is deleted
- Cannot be reused by other spaces
- Supports multi-level nesting (a local dependency can itself have local dependencies)

## Build Flow

1. Compute `dataId = sha256(kind + "\0" + canonicalStringify(cacheKey ?? input))`
2. If `locker` is provided: acquire exclusive lock on `dataId`
3. Check if `{kind}/{shard}/{dataId}/` exists (cache hit check)
4. On cache hit: read the manifest and return an RfsSpace directly
5. On cache miss:
   a. Create temporary directory `.tmp-{dataId}-{random}/`
   b. Create `space/` and `local/` subdirectories inside the temp directory
   c. Execute `onInit`, writing files and mounting dependencies
   d. Write `.radium-fs-manifest.json`
   e. Atomically `rename` the temp directory to the final directory
   f. Return RfsSpace
6. Release lock (in a `finally` block, ensuring release even on error)

## Concurrency

### Single-process (default)

No special configuration needed. radium-fs uses atomic `rename` to finalize spaces, so there are no partial/corrupt spaces even if an error occurs mid-build.

### Multi-process / multi-node

When multiple processes or machines share the same store directory (e.g. via NFS, EFS, or a shared volume), concurrent `ensure()` calls for the same `dataId` may trigger redundant builds. To avoid this, provide an `RfsLocker` implementation:

```typescript
const store = createStore({
  root: '/shared-mount/project',
  adapter: nodeAdapter(),
  locker: redisLocker(redisClient), // or fileLockLocker(), etc.
});
```

The locker wraps the **cache-check + build** sequence in an exclusive lock keyed by `dataId`. This ensures only one process builds a given space; others wait and then get the cached result.

**Important:** The locker is an optimization, not a correctness requirement. Without it, concurrent builds produce identical results (deterministic) and atomic rename prevents corruption. The only cost is wasted compute.

## Adapter Layer

The core (`@radium-fs/core`) is **runtime-agnostic** — it contains only type definitions and no platform-specific code (no Node.js `fs`, no `Buffer`, no `crypto`, etc.).

All platform-specific operations (filesystem I/O and cryptographic hashing) are abstracted behind the `RfsAdapter` interface. When creating a store, the caller must provide an adapter implementation:

```typescript
import { createStore } from '@radium-fs/core';
import { nodeAdapter } from '@radium-fs/node';

const store = createStore({
  root: '/project',
  adapter: nodeAdapter(),
});
```

### Built-in Adapter Implementations (planned)

| Package | Runtime | Description |
|---------|---------|-------------|
| `@radium-fs/node` | Node.js / Bun | Wraps `node:fs/promises` + `node:crypto` |
| `@radium-fs/memory` | Any | In-memory filesystem + SubtleCrypto (tests, browser) |

### RfsAdapter Interface

The adapter must implement these operations:

**Crypto:**

- `hash` — Compute SHA-256 digest (returns lowercase hex, 64 chars)

**Filesystem:**

- `readFile` — Read a file as raw bytes (`Uint8Array`)
- `writeFile` — Write string or `Uint8Array` content
- `mkdir` — Create directories (always recursive)
- `readDir` — List directory entries
- `stat` — Get file/directory metadata
- `exists` — Check path existence
- `remove` — Delete files or directories
- `rename` — Atomically rename/move (used for temp → final)
- `symlink` — Create symbolic links (used for dependency mounting)
- `glob` — Find files matching a glob pattern
- `grep` — Search file contents for a pattern

Binary data uses `Uint8Array` (not `Buffer`) to maintain runtime neutrality. The adapter returns raw bytes from `readFile`; the core layer handles text decoding (UTF-8) when needed.

## Design Principles

- **Deterministic** — Same kind + input always produces the same dataId via canonical serialization + SHA-256, providing natural deduplication across any environment
- **Traceable** — Origin records the complete production method, supporting auditing and regeneration
- **Sharded storage** — Shard directories distribute data to avoid overly large directories
- **Tool-friendly** — Spaces are real directories, directly operable with grep/rg/find and other standard tools
- **Physically isolated** — The local directory and space directory do not interfere with each other; dependency relationships are clear
- **Atomic** — Temporary directory + rename ensures no half-built spaces exist
- **Dependency tracking** — Manifest records all dependency relationships, supporting dependency graph analysis
- **Runtime-agnostic** — Core uses `Uint8Array` instead of `Buffer` and delegates all platform-specific operations (I/O + crypto) to an adapter, running on any JavaScript runtime
