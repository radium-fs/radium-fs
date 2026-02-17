/**
 * createStore — Core runtime engine
 *
 * Implements the full radium-fs lifecycle: space creation, caching,
 * dependency mounting, command handling, and event emission.
 */

import { canonicalStringify } from './canonical';
import type {
  RfsAdapter,
  RfsManifest,
  RfsOrigin,
  RfsDependency,
  RfsCommandRecord,
  RfsKind,
  RfsInitResult,
  RfsCommandResult,
  RfsOnInitContext,
  RfsOnCommandContext,
  RfsSpaceApi,
  RfsCommandSpaceApi,
  RfsLocalApi,
  RfsDepOptions,
  RfsReadFileOptions,
  RfsReadDirOptions,
  RfsStatResult,
  RfsRemoveOptions,
  RfsGlobOptions,
  RfsGrepOptions,
  RfsEvent,
  RfsUnsubscribe,
  RfsCommandEventMap,
  RfsStoreOptions,
  RfsEnsureOptions,
  RfsStore,
  RfsSpace,
  RfsSpaceBase,
  RfsSpaceWithCommands,
  RfsLockHandle,
} from './defs';
import {
  RFS_MANIFEST_FILENAME,
  RFS_SPACE_DIRNAME,
  RFS_LOCAL_DIRNAME,
  RFS_LOCAL_DEPS_DIRNAME,
  RFS_DATA_DIRNAME,
  RFS_TEMP_PREFIX,
  RFS_MANIFEST_VERSION,
} from './defs';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function joinPath(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/');
}

/**
 * Compute a relative path from a symlink location to a target.
 * Both paths must share a common prefix (e.g. both rooted under the same store root).
 */
function computeRelativePath(fromFile: string, toPath: string): string {
  const fromParts = fromFile.split('/').slice(0, -1); // directory containing the symlink
  const toParts = toPath.split('/');

  // Find common prefix length
  let common = 0;
  while (
    common < fromParts.length &&
    common < toParts.length &&
    fromParts[common] === toParts[common]
  ) {
    common++;
  }

  // Build relative path: go up from symlink dir, then down to target
  const ups = fromParts.length - common;
  const parts: string[] = [];
  for (let i = 0; i < ups; i++) parts.push('..');
  parts.push(...toParts.slice(common));

  return parts.join('/') || '.';
}

async function computeDataId(
  adapter: RfsAdapter,
  kind: string,
  input: Record<string, unknown>,
  cacheKeyFn?: (input: unknown) => Record<string, unknown>,
): Promise<string> {
  const payload = cacheKeyFn ? cacheKeyFn(input) : input;
  const raw = kind + '\0' + canonicalStringify(payload);
  return adapter.hash(encoder.encode(raw));
}

function getShard(dataId: string): string {
  return dataId.slice(0, 2);
}

function buildDataDir(root: string, kind: string, dataId: string): string {
  return joinPath(root, RFS_DATA_DIRNAME, kind, getShard(dataId), dataId);
}

function buildTempDir(root: string, kind: string, dataId: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return joinPath(
    root,
    RFS_DATA_DIRNAME,
    kind,
    getShard(dataId),
    RFS_TEMP_PREFIX + dataId + '-' + random,
  );
}

function manifestPath(dir: string): string {
  return joinPath(dir, RFS_MANIFEST_FILENAME);
}

async function readManifest(adapter: RfsAdapter, dir: string): Promise<RfsManifest> {
  const bytes = await adapter.readFile(manifestPath(dir));
  return JSON.parse(decoder.decode(bytes)) as RfsManifest;
}

async function writeManifest(adapter: RfsAdapter, dir: string, manifest: RfsManifest): Promise<void> {
  await adapter.writeFile(manifestPath(dir), JSON.stringify(manifest, null, 2));
}

async function spaceExists(adapter: RfsAdapter, dir: string): Promise<boolean> {
  return adapter.exists(manifestPath(dir));
}

function normalizeExports(raw: RfsInitResult['exports']): Record<string, string> {
  if (!raw) return { '.': '.' };
  if (typeof raw === 'string') return { '.': raw };
  return { ...raw };
}

function resolveAbsoluteExports(
  spaceDir: string,
  relativeExports: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, rel] of Object.entries(relativeExports)) {
    result[name] = rel === '.' ? spaceDir : joinPath(spaceDir, rel);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Space API factories
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Shared file operations (used by localApi, spaceApi, and commandSpaceApi)
// ---------------------------------------------------------------------------

interface FileOps {
  writeFile(path: string, content: string | Uint8Array): Promise<void>;
  readFile(path: string, options?: RfsReadFileOptions): Promise<string>;
  mkdir(path: string): Promise<void>;
  readDir(path: string, options?: RfsReadDirOptions): Promise<string[]>;
  stat(path: string): Promise<RfsStatResult>;
  remove(path: string, options?: RfsRemoveOptions): Promise<void>;
}

interface FullFileOps extends FileOps {
  copy(src: string, dest: string): Promise<void>;
  move(src: string, dest: string): Promise<void>;
  glob(pattern: string, options?: RfsGlobOptions): Promise<string[]>;
  grep(pattern: string, options?: RfsGrepOptions): Promise<string[]>;
}

function createFileOps(adapter: RfsAdapter, baseDir: string): FileOps {
  return {
    writeFile(path: string, content: string | Uint8Array) {
      return adapter.writeFile(joinPath(baseDir, path), content);
    },
    async readFile(path: string, options?: RfsReadFileOptions): Promise<string> {
      const bytes = await adapter.readFile(joinPath(baseDir, path));
      return applyLineOptions(decoder.decode(bytes), options);
    },
    mkdir(path: string) {
      return adapter.mkdir(joinPath(baseDir, path));
    },
    async readDir(path: string, options?: RfsReadDirOptions): Promise<string[]> {
      return readDirRecursive(adapter, joinPath(baseDir, path), options);
    },
    stat(path: string): Promise<RfsStatResult> {
      return adapter.stat(joinPath(baseDir, path));
    },
    remove(path: string, options?: RfsRemoveOptions) {
      return adapter.remove(joinPath(baseDir, path), options);
    },
  };
}

function createFullFileOps(adapter: RfsAdapter, baseDir: string): FullFileOps {
  return {
    ...createFileOps(adapter, baseDir),
    async copy(src: string, dest: string) {
      const bytes = await adapter.readFile(joinPath(baseDir, src));
      await adapter.writeFile(joinPath(baseDir, dest), bytes);
    },
    async move(src: string, dest: string) {
      await adapter.rename(joinPath(baseDir, src), joinPath(baseDir, dest));
    },
    glob(pattern: string, options?: RfsGlobOptions) {
      return adapter.glob(baseDir, pattern, options);
    },
    grep(pattern: string, options?: RfsGrepOptions) {
      return adapter.grep(baseDir, pattern, options);
    },
  };
}

// ---------------------------------------------------------------------------
// API factories
// ---------------------------------------------------------------------------

function createLocalApi(adapter: RfsAdapter, localDir: string): RfsLocalApi {
  return {
    get path() { return localDir; },
    ...createFileOps(adapter, localDir),
  };
}

interface CreateSpaceApiParams {
  adapter: RfsAdapter;
  spaceDir: string;
  localDir: string;
  runtime: Record<string, unknown>;
  ensureInternal: <TI, TC, TR>(
    kind: RfsKind<TI, TC, TR>,
    input: TI,
    parentLocalDepsDir: string | null,
    ensureOptions?: RfsEnsureOptions,
    extraRuntime?: Record<string, unknown>,
  ) => Promise<{ space: RfsSpaceBase; dataDir: string }>;
  parentDataDir: string;
  deps: RfsDependency[];
}

function createSpaceApi<TRuntime>(params: CreateSpaceApiParams): RfsSpaceApi<TRuntime> {
  const { adapter, spaceDir, localDir, runtime, ensureInternal, parentDataDir, deps } = params;

  return {
    get path() { return spaceDir; },
    get runtime() { return runtime as TRuntime; },
    get local() { return createLocalApi(adapter, localDir); },
    ...createFullFileOps(adapter, spaceDir),

    async dep<TDepInput, TDepCommand, TDepRuntime>(
      mountPath: string,
      kind: RfsKind<TDepInput, TDepCommand, TDepRuntime>,
      input: TDepInput,
      options?: RfsDepOptions,
    ): Promise<string> {
      const scope = options?.scope ?? 'shared';
      const exportName = options?.export ?? '.';

      // Determine where the dependency itself is stored
      const parentLocalDepsDir = scope === 'local'
        ? joinPath(parentDataDir, RFS_LOCAL_DEPS_DIRNAME)
        : null;

      const { space: depSpace, dataDir: depDataDir } = await ensureInternal(
        kind,
        input as TDepInput,
        parentLocalDepsDir,
        undefined,
        options?.extraRuntime,
      );

      // Resolve the export path
      let targetPath: string;
      if (exportName === '*') {
        targetPath = joinPath(depDataDir, RFS_SPACE_DIRNAME);
      } else {
        const exportRel = depSpace.manifest.exports[exportName];
        if (exportRel === undefined) {
          throw new Error(
            `dep: export "${exportName}" not found in kind "${kind.kind}". ` +
            `Available exports: ${Object.keys(depSpace.manifest.exports).join(', ')}`,
          );
        }
        const depSpaceDir = joinPath(depDataDir, RFS_SPACE_DIRNAME);
        targetPath = exportRel === '.' ? depSpaceDir : joinPath(depSpaceDir, exportRel);
      }

      // Create symlink at space/{mountPath} using relative path
      const linkPath = joinPath(spaceDir, mountPath);
      const relativeTarget = computeRelativePath(linkPath, targetPath);
      await adapter.symlink(relativeTarget, linkPath);

      // Record dependency
      deps.push({
        mountPath,
        origin: depSpace.manifest.origin,
        scope,
        export: exportName === '.' ? undefined : exportName,
      });

      return targetPath;
    },
  };
}

function createCommandSpaceApi<TRuntime>(
  adapter: RfsAdapter,
  spaceDir: string,
  localDir: string,
  runtime: TRuntime,
): RfsCommandSpaceApi<TRuntime> {
  return {
    get path() { return spaceDir; },
    get runtime() { return runtime; },
    get local() { return createLocalApi(adapter, localDir); },
    ...createFullFileOps(adapter, spaceDir),
  };
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

function applyLineOptions(text: string, options?: RfsReadFileOptions): string {
  if (!options || (!options.startLine && !options.maxLines)) return text;

  const lines = text.split('\n');
  const start = Math.max(0, (options.startLine ?? 1) - 1);
  const end = options.maxLines !== undefined ? start + options.maxLines : lines.length;
  return lines.slice(start, end).join('\n');
}

async function readDirRecursive(
  adapter: RfsAdapter,
  dir: string,
  options?: RfsReadDirOptions,
): Promise<string[]> {
  if (!options?.recursive) {
    const entries = await adapter.readDir(dir);
    if (options?.maxResults) return entries.slice(0, options.maxResults);
    return entries;
  }

  const results: string[] = [];
  const maxResults = options.maxResults ?? Infinity;

  async function walk(base: string, prefix: string): Promise<void> {
    if (results.length >= maxResults) return;
    const items = await adapter.readDir(base);
    for (const item of items) {
      if (results.length >= maxResults) return;
      const fullPath = joinPath(base, item);
      const relPath = prefix ? prefix + '/' + item : item;
      results.push(relPath);
      try {
        const stat = await adapter.stat(fullPath);
        if (stat.isDirectory) {
          await walk(fullPath, relPath);
        }
      } catch {
        // Skip entries we can't stat
      }
    }
  }

  await walk(dir, '');
  return results;
}

// ---------------------------------------------------------------------------
// createStore
// ---------------------------------------------------------------------------

/**
 * Create a Store instance
 *
 * @param options - Store configuration (root, adapter, runtime, locker)
 * @returns A Store that manages spaces on disk
 *
 * @example
 * ```typescript
 * import { createStore } from '@radium-fs/core';
 * import { nodeAdapter } from '@radium-fs/node';
 *
 * const store = createStore({
 *   root: '/project',
 *   adapter: nodeAdapter(),
 * });
 * ```
 */
export function createStore(options: RfsStoreOptions): RfsStore {
  const { adapter, locker } = options;
  const root = options.root;
  const globalRuntime = options.runtime ?? {};

  // Event system
  const globalListeners = new Set<(event: RfsEvent) => void>();

  // Per-space command/custom listeners (keyed by dataId)
  const commandListeners = new Map<string, Map<string, Set<(e: unknown) => void>>>();
  const customListeners = new Map<string, Set<(payload: unknown) => void>>();

  function emitGlobal(event: RfsEvent): void {
    for (const handler of globalListeners) {
      try { handler(event); } catch { /* listener errors should not break the engine */ }
    }
  }

  function emitCommand(dataId: string, eventType: string, event: unknown): void {
    const map = commandListeners.get(dataId);
    if (map) {
      const handlers = map.get(eventType);
      if (handlers) {
        for (const handler of handlers) {
          try { handler(event); } catch { /* */ }
        }
      }
    }
  }

  function emitCustom(dataId: string, payload: unknown): void {
    const handlers = customListeners.get(dataId);
    if (handlers) {
      for (const handler of handlers) {
        try { handler(payload); } catch { /* */ }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Internal ensure (used by both public ensure and dep())
  // -------------------------------------------------------------------------

  async function ensureInternal<TInput, TCommand, TRuntime>(
    kind: RfsKind<TInput, TCommand, TRuntime>,
    input: TInput,
    localDepsDir: string | null,
    ensureOptions?: RfsEnsureOptions,
    extraRuntime?: Record<string, unknown>,
  ): Promise<{ space: RfsSpaceBase; dataDir: string }> {
    const inputRecord = (input ?? {}) as Record<string, unknown>;
    const dataId = await computeDataId(adapter, kind.kind, inputRecord, kind.cacheKey as ((input: unknown) => Record<string, unknown>) | undefined);

    // Determine the data directory (shared vs local-scoped)
    const dataDir = localDepsDir
      ? joinPath(localDepsDir, kind.kind, getShard(dataId), dataId)
      : buildDataDir(root, kind.kind, dataId);

    const signal = ensureOptions?.signal;
    const useCache = ensureOptions?.cache !== false;

    let lockHandle: RfsLockHandle | undefined;

    try {
      // Acquire lock if locker is provided
      if (locker) {
        lockHandle = await locker.acquire(dataId, signal);
      }

      // Check abort
      if (signal?.aborted) {
        throw new Error('Operation aborted');
      }

      // Cache check
      const exists = await spaceExists(adapter, dataDir);

      if (exists && useCache) {
        const manifest = await readManifest(adapter, dataDir);
        const spaceDir = joinPath(dataDir, RFS_SPACE_DIRNAME);
        const space = buildRfsSpaceBase(dataDir, spaceDir, manifest, kind.kind, dataId);

        // Emit cached event
        const cachedCtx = { kind: kind.kind, dataId, input: inputRecord, path: spaceDir };
        emitGlobal({ type: 'init:cached', ...cachedCtx });
        ensureOptions?.onCached?.(cachedCtx);

        return { space, dataDir };
      }

      // cache: false — remove old space before rebuild
      if (exists && !useCache) {
        await adapter.remove(dataDir, { recursive: true });
      }

      // Cache miss — build
      const startCtx = { kind: kind.kind, dataId, input: inputRecord };
      emitGlobal({ type: 'init:start', ...startCtx });
      ensureOptions?.onStart?.(startCtx);

      // Create temp directory
      const tempDir = localDepsDir
        ? joinPath(localDepsDir, kind.kind, getShard(dataId), RFS_TEMP_PREFIX + dataId + '-' + Math.random().toString(36).slice(2, 10))
        : buildTempDir(root, kind.kind, dataId);

      const tempSpaceDir = joinPath(tempDir, RFS_SPACE_DIRNAME);
      const tempLocalDir = joinPath(tempDir, RFS_LOCAL_DIRNAME);

      await adapter.mkdir(tempSpaceDir);
      await adapter.mkdir(tempLocalDir);

      try {
        // Build the space API for onInit
        const deps: RfsDependency[] = [];
        const mergedRuntime = extraRuntime
          ? { ...globalRuntime, ...extraRuntime }
          : globalRuntime;

        const spaceApi = createSpaceApi<TRuntime>({
          adapter,
          spaceDir: tempSpaceDir,
          localDir: tempLocalDir,
          runtime: mergedRuntime as Record<string, unknown>,
          ensureInternal: (depKind, depInput, parentLocalDepsDir, depEnsureOpts, depExtraRuntime) =>
            ensureInternal(depKind, depInput, parentLocalDepsDir, depEnsureOpts, depExtraRuntime),
          parentDataDir: tempDir,
          deps,
        });

        // Build onInit context
        const initContext: RfsOnInitContext<TInput, TRuntime> = {
          input: input as TInput,
          space: spaceApi,
          signal: signal ?? new AbortController().signal,
          emit: (payload: unknown) => {
            const event = { type: 'custom' as const, kind: kind.kind, dataId, payload };
            emitGlobal(event);
            emitCustom(dataId, payload);
          },
        };

        // Execute onInit
        const result = await kind.onInit(initContext);

        // Normalize exports
        const exportsMap = normalizeExports(result?.exports);
        const metadata = result?.metadata ?? {};

        // Build manifest
        const now = new Date().toISOString();
        const origin: RfsOrigin = {
          kind: kind.kind,
          input: inputRecord,
          ...(kind.cacheKey ? { cacheKey: kind.cacheKey(input as TInput) as Record<string, unknown> } : {}),
        };

        const manifest: RfsManifest = {
          version: RFS_MANIFEST_VERSION,
          origin,
          exports: exportsMap,
          dependencies: deps.length > 0 ? deps : undefined,
          metadata,
          createdAt: now,
          updatedAt: now,
        };

        // Write manifest
        await writeManifest(adapter, tempDir, manifest);

        // Atomic rename temp → final
        try {
          await adapter.rename(tempDir, dataDir);
        } catch {
          // Rename failed — check if another concurrent build completed
          if (await spaceExists(adapter, dataDir)) {
            // Another build won; clean our temp and use existing
            await adapter.remove(tempDir, { recursive: true });
          } else {
            // Genuine failure
            await adapter.remove(tempDir, { recursive: true });
            throw new Error(`Failed to finalize space at ${dataDir}`);
          }
        }

        // Read the final manifest (might be ours or the concurrent winner's)
        const finalManifest = await readManifest(adapter, dataDir);
        const finalSpaceDir = joinPath(dataDir, RFS_SPACE_DIRNAME);
        const space = buildRfsSpaceBase(dataDir, finalSpaceDir, finalManifest, kind.kind, dataId);

        // Emit done event
        const doneCtx = {
          kind: kind.kind,
          dataId,
          input: inputRecord,
          path: finalSpaceDir,
          exports: resolveAbsoluteExports(finalSpaceDir, finalManifest.exports),
          metadata: finalManifest.metadata,
        };
        emitGlobal({ type: 'init:done', ...doneCtx });
        ensureOptions?.onDone?.(doneCtx);

        return { space, dataDir };
      } catch (err) {
        // Clean up temp on error
        try {
          await adapter.remove(tempDir, { recursive: true });
        } catch { /* best effort */ }

        // Emit error event
        const error = err instanceof Error ? err : new Error(String(err));
        const errorCtx = { kind: kind.kind, dataId, input: inputRecord, error };
        emitGlobal({ type: 'init:error', ...errorCtx });
        ensureOptions?.onError?.(errorCtx);

        throw err;
      }
    } finally {
      if (lockHandle) {
        await lockHandle.release();
      }
    }
  }

  // -------------------------------------------------------------------------
  // Build RfsSpaceBase from persisted data
  // -------------------------------------------------------------------------

  function buildRfsSpaceBase(
    dataDir: string,
    spaceDir: string,
    manifest: RfsManifest,
    kindName: string,
    dataId: string,
  ): RfsSpaceBase {
    return {
      dataId,
      kind: kindName,
      origin: manifest.origin,
      path: spaceDir,
      exports: resolveAbsoluteExports(spaceDir, manifest.exports),
      manifest,
    };
  }

  // -------------------------------------------------------------------------
  // Build RfsSpace with optional command support
  // -------------------------------------------------------------------------

  function buildRfsSpace<TCommand>(
    dataDir: string,
    spaceDir: string,
    manifest: RfsManifest,
    kind: RfsKind<unknown, TCommand, unknown>,
    dataId: string,
  ): RfsSpace<TCommand> {
    const base = buildRfsSpaceBase(dataDir, spaceDir, manifest, kind.kind, dataId);

    if (!kind.onCommand) {
      return base as RfsSpace<TCommand>;
    }

    // Add command capabilities
    const commands: RfsSpaceWithCommands<TCommand> = {
      async send(command: TCommand): Promise<{ exports: Record<string, string>; metadata: Record<string, unknown> }> {
        // Emit command:start
        const startEvent = { type: 'command:start' as const, kind: kind.kind, dataId, command };
        emitGlobal(startEvent);
        emitCommand(dataId, 'command:start', startEvent);

        try {
          // Read current manifest
          const currentManifest = await readManifest(adapter, dataDir);
          const localDir = joinPath(dataDir, RFS_LOCAL_DIRNAME);

          // Build onCommand context
          const commandSpaceApi = createCommandSpaceApi<unknown>(
            adapter,
            spaceDir,
            localDir,
            globalRuntime,
          );

          const commandContext: RfsOnCommandContext<TCommand, unknown> = {
            command: command as TCommand,
            current: {
              exports: currentManifest.exports,
              metadata: currentManifest.metadata,
            },
            space: commandSpaceApi,
            signal: new AbortController().signal,
            emit: (payload: unknown) => {
              const event = { type: 'custom' as const, kind: kind.kind, dataId, payload };
              emitGlobal(event);
              emitCustom(dataId, payload);
            },
          };

          const result: RfsCommandResult = await kind.onCommand!(commandContext);

          // Update manifest
          const newExports = result?.exports
            ? normalizeExports(result.exports)
            : currentManifest.exports;
          const newMetadata = result?.metadata ?? currentManifest.metadata;

          const commandRecord: RfsCommandRecord = {
            command,
            executedAt: new Date().toISOString(),
            result: result ? { exports: newExports, metadata: newMetadata } : undefined,
          };

          currentManifest.exports = newExports;
          currentManifest.metadata = newMetadata;
          currentManifest.commands = [...(currentManifest.commands ?? []), commandRecord];
          currentManifest.updatedAt = new Date().toISOString();

          await writeManifest(adapter, dataDir, currentManifest);

          const resolvedExports = resolveAbsoluteExports(spaceDir, newExports);

          // Emit command:done
          const doneEvent = {
            type: 'command:done' as const,
            kind: kind.kind,
            dataId,
            command,
            exports: resolvedExports,
            metadata: newMetadata,
          };
          emitGlobal(doneEvent);
          emitCommand(dataId, 'command:done', doneEvent);

          return { exports: resolvedExports, metadata: newMetadata };
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          const errorEvent = {
            type: 'command:error' as const,
            kind: kind.kind,
            dataId,
            command,
            error,
          };
          emitGlobal(errorEvent);
          emitCommand(dataId, 'command:error', errorEvent);
          throw err;
        }
      },

      on<K extends keyof RfsCommandEventMap>(
        event: K,
        handler: (e: RfsCommandEventMap[K]) => void,
      ): RfsUnsubscribe {
        if (!commandListeners.has(dataId)) {
          commandListeners.set(dataId, new Map());
        }
        const map = commandListeners.get(dataId)!;
        if (!map.has(event)) {
          map.set(event, new Set());
        }
        const handlers = map.get(event)!;
        handlers.add(handler as (e: unknown) => void);
        return () => handlers.delete(handler as (e: unknown) => void);
      },

      onCustom<T = unknown>(handler: (payload: T) => void): RfsUnsubscribe {
        if (!customListeners.has(dataId)) {
          customListeners.set(dataId, new Set());
        }
        const handlers = customListeners.get(dataId)!;
        const wrapped = handler as (payload: unknown) => void;
        handlers.add(wrapped);
        return () => handlers.delete(wrapped);
      },
    };

    return Object.assign({}, base, commands) as RfsSpace<TCommand>;
  }

  // -------------------------------------------------------------------------
  // Public store API
  // -------------------------------------------------------------------------

  const store: RfsStore = {
    get root() { return root; },
    get adapter() { return adapter; },

    async ensure<TInput, TCommand, TRuntime>(
      kind: RfsKind<TInput, TCommand, TRuntime>,
      input: TInput,
      options?: RfsEnsureOptions,
    ): Promise<RfsSpace<TCommand>> {
      const { space, dataDir } = await ensureInternal(kind, input, null, options);
      return buildRfsSpace(dataDir, space.path, space.manifest, kind as RfsKind<unknown, TCommand, unknown>, space.dataId);
    },

    on(handler: (event: RfsEvent) => void): RfsUnsubscribe {
      globalListeners.add(handler);
      return () => globalListeners.delete(handler);
    },

    async find(origin: RfsOrigin): Promise<RfsSpaceBase | null> {
      const inputRecord = origin.input;
      const cacheKeyFn = origin.cacheKey ? () => origin.cacheKey! : undefined;
      const dataId = await computeDataId(adapter, origin.kind, inputRecord, cacheKeyFn);
      const dataDir = buildDataDir(root, origin.kind, dataId);

      if (!(await spaceExists(adapter, dataDir))) return null;

      const manifest = await readManifest(adapter, dataDir);
      const spaceDir = joinPath(dataDir, RFS_SPACE_DIRNAME);
      return buildRfsSpaceBase(dataDir, spaceDir, manifest, origin.kind, dataId);
    },

    async has(origin: RfsOrigin): Promise<boolean> {
      const inputRecord = origin.input;
      const cacheKeyFn = origin.cacheKey ? () => origin.cacheKey! : undefined;
      const dataId = await computeDataId(adapter, origin.kind, inputRecord, cacheKeyFn);
      const dataDir = buildDataDir(root, origin.kind, dataId);
      return spaceExists(adapter, dataDir);
    },

    async remove(origin: RfsOrigin): Promise<void> {
      const inputRecord = origin.input;
      const cacheKeyFn = origin.cacheKey ? () => origin.cacheKey! : undefined;
      const dataId = await computeDataId(adapter, origin.kind, inputRecord, cacheKeyFn);
      const dataDir = buildDataDir(root, origin.kind, dataId);
      await adapter.remove(dataDir, { recursive: true });

      // Clean up per-space listener maps to prevent memory leaks
      commandListeners.delete(dataId);
      customListeners.delete(dataId);
    },

    async list(kind?: string): Promise<RfsSpaceBase[]> {
      const results: RfsSpaceBase[] = [];
      const dataRoot = joinPath(root, RFS_DATA_DIRNAME);

      // Get kind directories to scan
      let kindDirs: string[];
      if (kind) {
        kindDirs = [kind];
      } else {
        try {
          kindDirs = await adapter.readDir(dataRoot);
        } catch {
          return [];
        }
      }

      for (const kindDir of kindDirs) {
        const kindPath = joinPath(dataRoot, kindDir);

        // Iterate shard directories
        let shardDirs: string[];
        try {
          shardDirs = await adapter.readDir(kindPath);
        } catch {
          continue;
        }

        for (const shardDir of shardDirs) {
          const shardPath = joinPath(kindPath, shardDir);

          // Iterate data directories
          let dataDirs: string[];
          try {
            dataDirs = await adapter.readDir(shardPath);
          } catch {
            continue;
          }

          for (const dataId of dataDirs) {
            // Skip temp directories
            if (dataId.startsWith(RFS_TEMP_PREFIX)) continue;

            const dataDir = joinPath(shardPath, dataId);
            try {
              const manifest = await readManifest(adapter, dataDir);
              const spaceDir = joinPath(dataDir, RFS_SPACE_DIRNAME);
              results.push(buildRfsSpaceBase(dataDir, spaceDir, manifest, kindDir, dataId));
            } catch {
              // Skip entries with invalid/missing manifests
            }
          }
        }
      }

      return results;
    },
  };

  return store;
}
