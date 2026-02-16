/**
 * radium-fs filesystem adapter interface
 *
 * The adapter abstracts all low-level filesystem operations, making the core
 * runtime-agnostic. Implement this interface to support different platforms
 * (Node.js, memfs, Deno, browser OPFS, etc.).
 */

import type { RfsStatResult, RfsRemoveOptions, RfsGlobOptions, RfsGrepOptions } from './fs-types';

/**
 * Filesystem adapter
 *
 * Provides the primitive I/O operations that radium-fs needs internally.
 * Implementations must handle path resolution and ensure atomic behavior
 * where noted (e.g. rename).
 */
export interface RfsFsAdapter {
  /** Read a file as raw bytes */
  readFile(path: string): Promise<Uint8Array>;

  /** Write content to a file (creates parent directories if needed) */
  writeFile(path: string, content: string | Uint8Array): Promise<void>;

  /** Create a directory (always recursive) */
  mkdir(path: string): Promise<void>;

  /** List entries in a directory */
  readDir(path: string): Promise<string[]>;

  /** Get file/directory metadata */
  stat(path: string): Promise<RfsStatResult>;

  /** Check whether a path exists */
  exists(path: string): Promise<boolean>;

  /** Remove a file or directory */
  remove(path: string, options?: RfsRemoveOptions): Promise<void>;

  /**
   * Atomically rename/move a file or directory
   *
   * Used for atomic finalization of temp directories during space init.
   */
  rename(src: string, dest: string): Promise<void>;

  /**
   * Create a symbolic link
   *
   * Used for mounting dependencies at space/{mountPath}.
   */
  symlink(target: string, linkPath: string): Promise<void>;

  /**
   * Find files matching a glob pattern
   *
   * @param root - Directory to search from
   * @param pattern - Glob pattern (e.g. "*.ts", "src/**")
   * @returns Matching file paths relative to root
   */
  glob(root: string, pattern: string, options?: RfsGlobOptions): Promise<string[]>;

  /**
   * Search file contents for a pattern
   *
   * @param root - Directory to search from
   * @param pattern - Search pattern (string or regex)
   * @returns Matching lines with file path and line content
   */
  grep(root: string, pattern: string, options?: RfsGrepOptions): Promise<string[]>;
}
