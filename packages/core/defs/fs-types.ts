/**
 * radium-fs shared filesystem types
 *
 * Generic filesystem operation types used by both the adapter layer
 * and the higher-level space API. Kept in a neutral module to avoid
 * circular or inverted dependencies.
 */

// ---------------------------------------------------------------------------
// Read / Write Options
// ---------------------------------------------------------------------------

/** Options for readFile (space-level, line-based partial reading) */
export interface RfsReadFileOptions {
  /** 1-based starting line number */
  startLine?: number;
  /** Maximum number of lines to read */
  maxLines?: number;
}

/** Options for readDir */
export interface RfsReadDirOptions {
  recursive?: boolean;
  maxResults?: number;
}

// ---------------------------------------------------------------------------
// Stat
// ---------------------------------------------------------------------------

/** Return value of stat */
export interface RfsStatResult {
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  mtime: Date;
}

// ---------------------------------------------------------------------------
// Remove
// ---------------------------------------------------------------------------

/** Options for remove */
export interface RfsRemoveOptions {
  recursive?: boolean;
}

// ---------------------------------------------------------------------------
// Glob / Grep
// ---------------------------------------------------------------------------

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
