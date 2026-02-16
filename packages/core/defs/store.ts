/**
 * radium-fs Store and Space type definitions
 *
 * The Store is the central entry point of radium-fs, managing the root directory
 * and the lifecycle of all spaces.
 * A Space is the object returned by store.ensure(), representing a ready-to-use space instance.
 */

import type { RfsFsAdapter } from './adapter';
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
// RfsSpace — command capability (only for kinds with commandSchema)
// ---------------------------------------------------------------------------

/** Command capability for Space (present when kind has a commandSchema) */
export interface RfsSpaceWithCommands<TCommand> {
  /**
   * Send a command
   *
   * The command is validated against commandSchema then passed to onCommand.
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
 * - If the Kind has no commandSchema (TCommand = never): base properties only
 * - If the Kind has a commandSchema: includes send() / on() / onCustom()
 */
export type RfsSpace<TCommand = never> = [TCommand] extends [never]
  ? RfsSpaceBase
  : RfsSpaceBase & RfsSpaceWithCommands<TCommand>;

// ---------------------------------------------------------------------------
// Store Options
// ---------------------------------------------------------------------------

/** Options for createStore */
export interface RfsStoreOptions {
  /** Data root directory (radium-fs-data/ will be created under this path) */
  root: string;

  /** Filesystem adapter (platform-specific I/O implementation) */
  adapter: RfsFsAdapter;

  /** Global runtime context (passed to all spaces via space.runtime) */
  runtime?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Ensure Options
// ---------------------------------------------------------------------------

/** Options for store.ensure */
export interface RfsEnsureOptions {
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

  /** Filesystem adapter in use */
  readonly adapter: RfsFsAdapter;

  /**
   * Get or create a space
   *
   * Returns an existing space on cache hit; executes onInit on cache miss.
   * The returned RfsSpace type is automatically inferred from the Kind's generics:
   * - No commandSchema: RfsSpaceBase
   * - Has commandSchema: RfsSpaceBase & RfsSpaceWithCommands<TCommand>
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
