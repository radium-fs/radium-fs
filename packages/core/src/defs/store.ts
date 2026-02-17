/**
 * radium-fs Store and Space type definitions
 *
 * The Store is the central entry point of radium-fs, managing the root directory
 * and the lifecycle of all spaces.
 * A Space is the object returned by store.ensure(), representing a ready-to-use space instance.
 */

import type { RfsAdapter } from './adapter';
import type { RfsManifest, RfsOrigin } from './manifest';
import type { RfsKind } from './kind';
import type {
  RfsEvent,
  RfsCommandEventMap,
  RfsUnsubscribe,
  RfsInitStartEvent,
  RfsInitCachedEvent,
  RfsInitDoneEvent,
  RfsInitErrorEvent,
} from './events';

// ---------------------------------------------------------------------------
// RfsSpace — base properties (all kinds)
// ---------------------------------------------------------------------------

/** Base Space properties (present on all kinds) */
export interface RfsSpaceBase {
  /** Deterministic unique identifier (computed from kind + cacheKey/input) */
  readonly dataId: string;

  /** Kind identifier */
  readonly kind: string;

  /** Origin information */
  readonly origin: RfsOrigin;

  /** Absolute path to the space directory */
  readonly path: string;

  /**
   * Exports mapping (absolute paths)
   *
   * The manifest stores relative paths; these are automatically resolved to absolute paths.
   */
  readonly exports: Record<string, string>;

  /** Read-only manifest snapshot */
  readonly manifest: RfsManifest;
}

// ---------------------------------------------------------------------------
// RfsSpace — command capability (only for kinds with onCommand)
// ---------------------------------------------------------------------------

/** Command capability for Space (present when kind has an onCommand hook) */
export interface RfsSpaceWithCommands<TCommand> {
  /**
   * Send a command
   *
   * The command is passed to the onCommand hook.
   *
   * @returns Updated exports and metadata
   */
  send(command: TCommand): Promise<{
    exports: Record<string, string>;
    metadata: Record<string, unknown>;
  }>;

  /**
   * Listen to command-related events
   *
   * @returns Unsubscribe function
   */
  on<K extends keyof RfsCommandEventMap>(
    event: K,
    handler: (e: RfsCommandEventMap[K]) => void,
  ): RfsUnsubscribe;

  /**
   * Listen to custom events (emitted via emit() in onCommand)
   *
   * @returns Unsubscribe function
   */
  onCustom<T = unknown>(
    handler: (payload: T) => void,
  ): RfsUnsubscribe;
}

// ---------------------------------------------------------------------------
// RfsSpace — conditional type (command capability based on TCommand)
// ---------------------------------------------------------------------------

/**
 * Space object
 *
 * Returned by `store.ensure()`.
 * - If the Kind has no onCommand (TCommand = never): base properties only
 * - If the Kind has onCommand: includes send() / on() / onCustom()
 */
export type RfsSpace<TCommand = never> = [TCommand] extends [never]
  ? RfsSpaceBase
  : RfsSpaceBase & RfsSpaceWithCommands<TCommand>;

// ---------------------------------------------------------------------------
// Locker — optional distributed lock provider
// ---------------------------------------------------------------------------

/**
 * Handle for an acquired lock
 *
 * Returned by `RfsLocker.acquire()`. The caller must call `release()` when
 * the critical section is complete.
 */
export interface RfsLockHandle {
  /** Release the lock */
  release(): Promise<void>;
}

/**
 * Distributed lock provider
 *
 * When provided via `createStore({ locker })`, the store acquires a lock
 * on the dataId before checking cache and building a space. This prevents
 * redundant builds when multiple processes or machines share the same store.
 *
 * radium-fs is already safe without a locker (atomic rename ensures no
 * corrupt spaces), but concurrent builds of the same space waste resources.
 * The locker eliminates this redundancy.
 *
 * Implementations can use any backend: file locks, Redis, Zookeeper, etc.
 */
export interface RfsLocker {
  /**
   * Acquire an exclusive lock for the given key
   *
   * The implementation should block (or retry) until the lock is acquired.
   * The key is typically a dataId.
   *
   * @param key - Lock identifier (e.g. dataId)
   * @param signal - Optional abort signal to cancel the acquisition attempt
   * @returns A handle that must be used to release the lock
   */
  acquire(key: string, signal?: AbortSignal): Promise<RfsLockHandle>;
}

// ---------------------------------------------------------------------------
// Store Options
// ---------------------------------------------------------------------------

/** Options for createStore */
export interface RfsStoreOptions {
  /** Data root directory (.radium-fs-data/ will be created under this path) */
  root: string;

  /** Platform adapter (filesystem I/O + crypto, platform-specific implementation) */
  adapter: RfsAdapter;

  /** Global runtime context (passed to all spaces via space.runtime) */
  runtime?: Record<string, unknown>;

  /**
   * Optional distributed lock provider
   *
   * When provided, the store acquires an exclusive lock on the dataId before
   * the cache-check + build sequence in `ensure()`, preventing redundant
   * builds across multiple processes or machines.
   *
   * Not needed for single-process usage.
   */
  locker?: RfsLocker;
}

// ---------------------------------------------------------------------------
// Ensure Options
// ---------------------------------------------------------------------------

/** Options for store.ensure */
export interface RfsEnsureOptions {
  /**
   * Abort signal to cancel the ensure operation
   *
   * Propagated to locker.acquire() and onInit context.signal.
   * When aborted, the build is interrupted and the Promise rejects.
   */
  signal?: AbortSignal;

  /**
   * Whether to use the cache
   *
   * - `true` (default): returns immediately if the space already exists
   * - `false`: forces re-execution of onInit
   */
  cache?: boolean;

  /** Called when init begins (cache miss) */
  onStart?: (ctx: Omit<RfsInitStartEvent, 'type'>) => void;

  /** Called on cache hit */
  onCached?: (ctx: Omit<RfsInitCachedEvent, 'type'>) => void;

  /** Called when init completes successfully */
  onDone?: (ctx: Omit<RfsInitDoneEvent, 'type'>) => void;

  /** Called when init fails (the Promise also rejects) */
  onError?: (ctx: Omit<RfsInitErrorEvent, 'type'>) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * Store object
 *
 * Returned by `createStore()`. The central entry point of radium-fs.
 */
export interface RfsStore {
  /** Data root directory */
  readonly root: string;

  /** Platform adapter in use */
  readonly adapter: RfsAdapter;

  /**
   * Get or create a space
   *
   * Returns an existing space on cache hit; executes onInit on cache miss.
   * The returned RfsSpace type is automatically inferred from the Kind's generics:
   * - No onCommand: RfsSpaceBase
   * - Has onCommand: RfsSpaceBase & RfsSpaceWithCommands<TCommand>
   */
  ensure<TInput, TCommand, TRuntime>(
    kind: RfsKind<TInput, TCommand, TRuntime>,
    input: TInput,
    options?: RfsEnsureOptions,
  ): Promise<RfsSpace<TCommand>>;

  /**
   * Subscribe to lifecycle events (init, command, custom)
   *
   * @returns Unsubscribe function
   */
  on(handler: (event: RfsEvent) => void): RfsUnsubscribe;

  /**
   * Find an existing space by origin
   *
   * @returns The matching space, or null if not found
   */
  find(origin: RfsOrigin): Promise<RfsSpaceBase | null>;

  /**
   * Check whether a space exists
   */
  has(origin: RfsOrigin): Promise<boolean>;

  /**
   * Remove a space (including its local-scope child dependencies)
   */
  remove(origin: RfsOrigin): Promise<void>;

  /**
   * List all spaces, optionally filtered by kind
   */
  list(kind?: string): Promise<RfsSpaceBase[]>;
}
