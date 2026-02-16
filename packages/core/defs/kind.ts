/**
 * radium-fs Kind type definitions
 *
 * A Kind is the "recipe" for a space, registered via defineKind().
 * It contains onInit (initialization) and an optional onCommand (command handling) lifecycle hook.
 */

import type { ZodType } from 'zod';

// ---------------------------------------------------------------------------
// File Operation Types
// ---------------------------------------------------------------------------

/** Options for readFile */
export interface RfsReadFileOptions {
  offset?: number;
  limit?: number;
}

/** Options for readDir */
export interface RfsReadDirOptions {
  recursive?: boolean;
  maxResults?: number;
}

/** Return value of stat */
export interface RfsStatResult {
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  mtime: Date;
}

/** Options for remove */
export interface RfsRemoveOptions {
  recursive?: boolean;
}

/** Options for glob */
export interface RfsGlobOptions {
  ignore?: string[];
  maxResults?: number;
}

/** Options for grep */
export interface RfsGrepOptions {
  include?: string[];
  maxResults?: number;
}

// ---------------------------------------------------------------------------
// space.local API
// ---------------------------------------------------------------------------

/**
 * Private storage API
 *
 * Physically isolated in the `local/` directory. Not visible to
 * space-level readDir/glob scans. Used for private state data
 * such as caches, counters, internal queues, etc.
 */
export interface RfsLocalApi {
  /** Absolute path to the local directory */
  readonly path: string;

  writeFile(path: string, content: string | Buffer): Promise<void>;
  readFile(path: string, options?: RfsReadFileOptions): Promise<string>;
  mkdir(path: string): Promise<void>;
  readDir(path: string, options?: RfsReadDirOptions): Promise<string[]>;
  stat(path: string): Promise<RfsStatResult>;
  remove(path: string, options?: RfsRemoveOptions): Promise<void>;
}

// ---------------------------------------------------------------------------
// space.dep Options
// ---------------------------------------------------------------------------

/**
 * Dependency mount options
 */
export interface RfsDepOptions {
  /**
   * Dependency scope
   * - `'shared'` (default): stored in the global radium-fs-data/ directory, reusable by any space
   * - `'local'`: stored in the parent space's .radium-fs-deps/ directory, deleted with the parent
   */
  scope?: 'shared' | 'local';

  /**
   * Which export to select from the dependency
   * - omitted or `'.'`: default export
   * - `'./xxx'`: named export
   * - `'*'`: entire space directory (bypasses exports)
   */
  export?: string;

  /**
   * Supplemental runtime context (shallow-merged into parent runtime, does not affect parent)
   *
   * Child runtime = `{ ...parentRuntime, ...extraRuntime }`
   */
  extraRuntime?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// space API (onInit)
// ---------------------------------------------------------------------------

/**
 * The `space` object available in onInit
 *
 * Provides file operations on the public space directory, dependency mounting,
 * runtime context access, and private storage.
 */
export interface RfsSpaceApi<TRuntime = Record<string, unknown>> {
  /** Absolute path to the space directory */
  readonly path: string;

  /** Runtime context (merged from store runtime + extraRuntime) */
  readonly runtime: TRuntime;

  /** Private storage (physically isolated local/ directory) */
  readonly local: RfsLocalApi;

  // -- File Operations --
  writeFile(path: string, content: string | Buffer): Promise<void>;
  readFile(path: string, options?: RfsReadFileOptions): Promise<string>;
  mkdir(path: string): Promise<void>;
  readDir(path: string, options?: RfsReadDirOptions): Promise<string[]>;
  stat(path: string): Promise<RfsStatResult>;
  copy(src: string, dest: string): Promise<void>;
  move(src: string, dest: string): Promise<void>;
  remove(path: string, options?: RfsRemoveOptions): Promise<void>;
  glob(pattern: string, options?: RfsGlobOptions): Promise<string[]>;
  grep(pattern: string, options?: RfsGrepOptions): Promise<string[]>;

  // -- Dependency --
  /**
   * Mount a dependency at space/deps/{mountPath}
   *
   * @param mountPath - Mount name (directory name under space/deps/)
   * @param kind - The dependency's Kind definition
   * @param input - Input for the dependency
   * @param options - Optional mount options
   * @returns Absolute path to the dependency's exported directory
   */
  dep<TDepInput>(
    mountPath: string,
    kind: RfsKind<TDepInput, any, any>,
    input: TDepInput,
    options?: RfsDepOptions,
  ): Promise<string>;
}

// ---------------------------------------------------------------------------
// space API (onCommand) — same as onInit but without dep
// ---------------------------------------------------------------------------

/**
 * The `space` object available in onCommand
 *
 * Same as the onInit space, but **without dep()**.
 * Dependencies can only be mounted during the onInit phase.
 */
export type RfsCommandSpaceApi<TRuntime = Record<string, unknown>> =
  Omit<RfsSpaceApi<TRuntime>, 'dep'>;

// ---------------------------------------------------------------------------
// Init / Command Return Types
// ---------------------------------------------------------------------------

/**
 * Return value of onInit
 *
 * exports can be a string shorthand (equivalent to `{ '.': value }`) or a full map.
 */
export interface RfsInitResult {
  /**
   * Exports mapping
   * - string shorthand: `'dist'` is equivalent to `{ '.': 'dist' }`
   * - full map: `{ '.': 'dist', './src': 'src' }`
   * - omitted: defaults to `{ '.': '.' }`
   */
  exports?: string | Record<string, string>;

  /** User-defined metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Return value of onCommand
 *
 * Returning void means no update to exports or metadata.
 */
export type RfsCommandResult = {
  exports?: string | Record<string, string>;
  metadata?: Record<string, unknown>;
} | void;

// ---------------------------------------------------------------------------
// onInit / onCommand Context
// ---------------------------------------------------------------------------

/** Context passed to onInit */
export interface RfsOnInitContext<
  TInput = unknown,
  TRuntime = Record<string, unknown>,
> {
  /** Validated input */
  input: TInput;

  /** Space operations (file I/O, dependencies, runtime, private storage) */
  space: RfsSpaceApi<TRuntime>;

  /** Abort signal */
  signal: AbortSignal;

  /** Emit a custom event (captured by store.onEvent) */
  emit: (payload: unknown) => void;
}

/** Context passed to onCommand */
export interface RfsOnCommandContext<
  TCommand = unknown,
  TRuntime = Record<string, unknown>,
> {
  /** Validated command */
  command: TCommand;

  /** Current state (result of the last init/command) */
  current: {
    exports: Record<string, string>;
    metadata: Record<string, unknown>;
  };

  /** Space operations (file I/O, runtime, private storage — no dep) */
  space: RfsCommandSpaceApi<TRuntime>;

  /** Abort signal */
  signal: AbortSignal;

  /** Emit a custom event */
  emit: (payload: unknown) => void;
}

// ---------------------------------------------------------------------------
// Kind Definition — commandSchema and onCommand must appear together
// ---------------------------------------------------------------------------

/** Base Kind fields (shared by all Kinds) */
interface RfsKindDefBase<TInput, TRuntime> {
  /** Unique Kind identifier */
  kind: string;

  /** Input validation schema (optional) */
  inputSchema?: ZodType<TInput>;

  /**
   * Custom cache key derivation function
   *
   * By default the full input is used to compute the dataId.
   * Provide this function to ignore input fields that don't affect the output.
   */
  cacheKey?: (input: TInput) => Record<string, unknown>;

  /** Initialization hook */
  onInit: (ctx: RfsOnInitContext<TInput, TRuntime>) => Promise<RfsInitResult>;
}

/** Kind definition without command capability */
interface RfsKindDefWithoutCommand<TInput, TRuntime>
  extends RfsKindDefBase<TInput, TRuntime> {
  commandSchema?: undefined;
  onCommand?: undefined;
}

/** Kind definition with command capability (commandSchema + onCommand must both be present) */
interface RfsKindDefWithCommand<TInput, TCommand, TRuntime>
  extends RfsKindDefBase<TInput, TRuntime> {
  /** Command validation schema */
  commandSchema: ZodType<TCommand>;

  /** Command handler hook */
  onCommand: (
    ctx: RfsOnCommandContext<TCommand, TRuntime>,
  ) => Promise<RfsCommandResult>;
}

/** Full parameter type for defineKind (discriminated union, enforces pairing) */
export type RfsKindDef<
  TInput = unknown,
  TCommand = never,
  TRuntime = Record<string, unknown>,
> =
  | RfsKindDefWithoutCommand<TInput, TRuntime>
  | RfsKindDefWithCommand<TInput, TCommand, TRuntime>;

// ---------------------------------------------------------------------------
// Kind (return value of defineKind)
// ---------------------------------------------------------------------------

/**
 * Kind object
 *
 * Returned by defineKind(), passed as the first argument to store.ensure().
 * Carries generic type information so that store.ensure can infer the correct RfsSpace type.
 */
export interface RfsKind<
  TInput = unknown,
  TCommand = never,
  TRuntime = Record<string, unknown>,
> {
  /** Unique Kind identifier */
  readonly kind: string;

  /** Input schema (for runtime validation) */
  readonly inputSchema?: ZodType<TInput>;

  /** Command schema (for runtime validation) */
  readonly commandSchema?: ZodType<TCommand>;

  /** Cache key derivation function */
  readonly cacheKey?: (input: TInput) => Record<string, unknown>;

  /** Initialization hook */
  readonly onInit: (
    ctx: RfsOnInitContext<TInput, TRuntime>,
  ) => Promise<RfsInitResult>;

  /** Command handler hook */
  readonly onCommand?: (
    ctx: RfsOnCommandContext<TCommand, TRuntime>,
  ) => Promise<RfsCommandResult>;

  /**
   * Type brand (not used at runtime)
   *
   * Allows TypeScript to infer TInput, TCommand, and TRuntime from an RfsKind instance.
   */
  readonly __types?: {
    input: TInput;
    command: TCommand;
    runtime: TRuntime;
  };
}
