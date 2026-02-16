/**
 * radium-fs Manifest and related types
 *
 * These types describe the metadata structure persisted to disk (.radium-fs-manifest.json).
 */

import type { RFS_MANIFEST_VERSION } from './constants';

// ---------------------------------------------------------------------------
// Origin
// ---------------------------------------------------------------------------

/**
 * Origin definition
 *
 * Describes how a space was produced. Used for lookup and regeneration.
 * The dataId is deterministically computed from `kind + (cacheKey ?? input)`.
 */
export interface RfsOrigin {
  /** Kind identifier */
  kind: string;

  /** Runtime input (full parameters) */
  input: Record<string, unknown>;

  /** Cache key (optional, defaults to input) */
  cacheKey?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Dependency
// ---------------------------------------------------------------------------

/**
 * Dependency record
 *
 * Records a dependency relationship from one space to another.
 * Dependencies are mounted via symlink at `space/deps/{mountPath}`.
 */
export interface RfsDependency {
  /** Mount path (relative to space/deps/) */
  mountPath: string;

  /** Origin of the dependency target */
  origin: RfsOrigin;

  /**
   * Dependency scope
   * - `shared` (default): stored in the global radium-fs-data/ directory, reusable by any space
   * - `local`: stored in the parent space's .radium-fs-deps/ directory, deleted with the parent
   */
  scope: 'shared' | 'local';

  /**
   * Which export to select from the dependency
   * - omitted or `'.'`: default export
   * - `'./xxx'`: named export
   * - `'*'`: entire space directory (bypasses exports)
   */
  export?: string;
}

// ---------------------------------------------------------------------------
// Command Record
// ---------------------------------------------------------------------------

/**
 * Command history record
 *
 * Records commands sent to onCommand via `space.send()` and their results.
 */
export interface RfsCommandRecord {
  /** Command data (validated by commandSchema) */
  command: unknown;

  /** Execution timestamp (ISO 8601) */
  executedAt: string;

  /** Execution result (absent when onCommand returns void) */
  result?: {
    /** Updated exports mapping */
    exports?: Record<string, string>;
    /** Updated metadata */
    metadata?: Record<string, unknown>;
  };
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

/**
 * Space metadata (Manifest)
 *
 * Stored as `.radium-fs-manifest.json` in each space's root directory.
 * Contains the complete lifecycle information of a space.
 */
export interface RfsManifest {
  /** Protocol version */
  version: typeof RFS_MANIFEST_VERSION;

  /** Origin (how the space was produced) */
  origin: RfsOrigin;

  /**
   * Exports mapping
   *
   * Keys are export names (`'.'` for the default export), values are paths
   * relative to the space directory.
   * Default: `{ '.': '.' }`
   */
  exports: Record<string, string>;

  /** Dependency list */
  dependencies?: RfsDependency[];

  /** Command history */
  commands?: RfsCommandRecord[];

  /** User-defined metadata */
  metadata: Record<string, unknown>;

  /** Creation timestamp (ISO 8601) */
  createdAt: string;

  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
}
