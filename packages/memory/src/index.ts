/**
 * @radium-fs/memory — In-memory platform adapter
 *
 * Implements RfsAdapter using a plain Map<string, Entry> as the backing store.
 * Runtime-agnostic: works in browsers, Node.js, Deno, and Bun.
 * Uses the Web Crypto API for SHA-256 hashing and picomatch for glob matching.
 */

import picomatch from 'picomatch';
import type {
  RfsAdapter,
  RfsStatResult,
  RfsRemoveOptions,
  RfsGlobOptions,
  RfsGrepOptions,
} from '@radium-fs/core';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type FileEntry = { type: 'file'; content: Uint8Array; mtime: Date };
type DirEntry = { type: 'dir'; mtime: Date };
type SymlinkEntry = { type: 'symlink'; target: string; mtime: Date };
type Entry = FileEntry | DirEntry | SymlinkEntry;

// ---------------------------------------------------------------------------
// Path utilities
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function normalizePath(p: string): string {
  const parts = p.split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }
  return '/' + resolved.join('/');
}

function parentDir(p: string): string {
  const idx = p.lastIndexOf('/');
  return idx <= 0 ? '/' : p.slice(0, idx);
}

const MAX_SYMLINK_DEPTH = 32;

// ---------------------------------------------------------------------------
// memoryAdapter
// ---------------------------------------------------------------------------

/**
 * Create an in-memory platform adapter
 *
 * @returns A frozen RfsAdapter backed by an in-memory Map
 *
 * @example
 * ```typescript
 * import { createStore } from '@radium-fs/core';
 * import { memoryAdapter } from '@radium-fs/memory';
 *
 * const store = createStore({
 *   root: '/project',
 *   adapter: memoryAdapter(),
 * });
 * ```
 */
export function memoryAdapter(): RfsAdapter {
  const store = new Map<string, Entry>();

  // Ensure root exists
  store.set('/', { type: 'dir', mtime: new Date() });

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  function ensureParentDirs(path: string): void {
    const parts = path.split('/').filter(Boolean);
    let current = '';
    // Walk all path components except the last one (the file/dir itself)
    for (let i = 0; i < parts.length - 1; i++) {
      current += '/' + parts[i];
      if (!store.has(current)) {
        store.set(current, { type: 'dir', mtime: new Date() });
      }
    }
  }

  /**
   * Resolve a single symlink entry. Returns the absolute target path.
   */
  function resolveSymlinkEntry(path: string, depth = 0): string {
    if (depth > MAX_SYMLINK_DEPTH) {
      throw new Error(`Symlink loop detected at ${path}`);
    }
    const entry = store.get(path);
    if (!entry || entry.type !== 'symlink') return path;

    const target = entry.target.startsWith('/')
      ? entry.target
      : parentDir(path) + '/' + entry.target;

    return resolveSymlinkEntry(normalizePath(target), depth + 1);
  }

  /**
   * Resolve a full path by walking each component and following symlinks
   * at intermediate directories, similar to real filesystem behavior.
   */
  function resolvePath(path: string): string {
    const parts = path.split('/').filter(Boolean);
    let current = '';

    for (const part of parts) {
      current += '/' + part;
      const entry = store.get(current);
      if (entry?.type === 'symlink') {
        const target = entry.target.startsWith('/')
          ? entry.target
          : parentDir(current) + '/' + entry.target;
        current = normalizePath(target);
        // The resolved target could itself be a symlink chain
        current = resolveSymlinkEntry(current);
      }
    }

    return current || '/';
  }

  // -------------------------------------------------------------------------
  // RfsAdapter implementation
  // -------------------------------------------------------------------------

  const adapter: RfsAdapter = {
    // -- Crypto --

    async hash(data: Uint8Array): Promise<string> {
      const buf = await globalThis.crypto.subtle.digest('SHA-256', data as Uint8Array<ArrayBuffer>);
      const bytes = new Uint8Array(buf);
      let hex = '';
      for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
      }
      return hex;
    },

    // -- Filesystem --

    async readFile(path: string): Promise<Uint8Array> {
      const resolved = resolvePath(normalizePath(path));
      const entry = store.get(resolved);
      if (!entry || entry.type !== 'file') {
        throw new Error(`ENOENT: no such file: ${path}`);
      }
      return entry.content.slice();
    },

    async writeFile(path: string, content: string | Uint8Array): Promise<void> {
      const norm = normalizePath(path);
      ensureParentDirs(norm);
      const data = typeof content === 'string' ? encoder.encode(content) : content.slice();
      store.set(norm, { type: 'file', content: data, mtime: new Date() });
    },

    async mkdir(path: string): Promise<void> {
      const norm = normalizePath(path);
      const parts = norm.split('/').filter(Boolean);
      let current = '';
      for (const part of parts) {
        current += '/' + part;
        if (!store.has(current)) {
          store.set(current, { type: 'dir', mtime: new Date() });
        }
      }
    },

    async readDir(path: string): Promise<string[]> {
      const resolved = resolvePath(normalizePath(path));
      const prefix = resolved === '/' ? '/' : resolved + '/';
      const names = new Set<string>();

      for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
          // Extract the direct child name
          const rest = key.slice(prefix.length);
          const slashIdx = rest.indexOf('/');
          const name = slashIdx === -1 ? rest : rest.slice(0, slashIdx);
          if (name) names.add(name);
        }
      }

      return [...names].sort();
    },

    async stat(path: string): Promise<RfsStatResult> {
      const resolved = resolvePath(normalizePath(path));
      const entry = store.get(resolved);
      if (!entry) {
        throw new Error(`ENOENT: no such file or directory: ${path}`);
      }
      return {
        isFile: entry.type === 'file',
        isDirectory: entry.type === 'dir',
        size: entry.type === 'file' ? entry.content.length : 0,
        mtime: entry.mtime,
      };
    },

    async exists(path: string): Promise<boolean> {
      try {
        const resolved = resolvePath(normalizePath(path));
        return store.has(resolved);
      } catch {
        return false;
      }
    },

    async remove(path: string, options?: RfsRemoveOptions): Promise<void> {
      const norm = normalizePath(path);
      if (options?.recursive) {
        const prefix = norm + '/';
        for (const key of [...store.keys()]) {
          if (key === norm || key.startsWith(prefix)) {
            store.delete(key);
          }
        }
      } else {
        store.delete(norm);
      }
    },

    async rename(src: string, dest: string): Promise<void> {
      const srcNorm = normalizePath(src);
      const destNorm = normalizePath(dest);
      ensureParentDirs(destNorm);

      const srcPrefix = srcNorm + '/';
      const toMove: [string, Entry][] = [];

      for (const [key, entry] of store) {
        if (key === srcNorm || key.startsWith(srcPrefix)) {
          toMove.push([key, entry]);
        }
      }

      for (const [key] of toMove) {
        store.delete(key);
      }

      for (const [key, entry] of toMove) {
        const newKey = key === srcNorm
          ? destNorm
          : destNorm + key.slice(srcNorm.length);
        store.set(newKey, entry);
      }
    },

    async symlink(target: string, linkPath: string): Promise<void> {
      const norm = normalizePath(linkPath);
      ensureParentDirs(norm);
      store.set(norm, { type: 'symlink', target, mtime: new Date() });
    },

    async glob(
      root: string,
      pattern: string,
      options?: RfsGlobOptions,
    ): Promise<string[]> {
      const rootNorm = normalizePath(root);
      const prefix = rootNorm === '/' ? '/' : rootNorm + '/';

      const isMatch = picomatch(pattern);
      const ignoreMatchers = options?.ignore?.map(p => picomatch(p)) ?? [];
      const maxResults = options?.maxResults ?? Infinity;
      const results: string[] = [];

      for (const [key, entry] of store) {
        if (results.length >= maxResults) break;
        if (entry.type !== 'file') continue;
        if (!key.startsWith(prefix)) continue;

        const rel = key.slice(prefix.length);
        if (!isMatch(rel)) continue;
        if (ignoreMatchers.some(m => m(rel))) continue;

        results.push(rel);
      }

      return results;
    },

    async grep(
      root: string,
      pattern: string,
      options?: RfsGrepOptions,
    ): Promise<string[]> {
      const rootNorm = normalizePath(root);
      const prefix = rootNorm === '/' ? '/' : rootNorm + '/';
      const regex = new RegExp(pattern);
      const maxResults = options?.maxResults ?? Infinity;

      const includeMatchers = options?.include?.map(p => picomatch(p));

      const results: string[] = [];

      for (const [key, entry] of store) {
        if (results.length >= maxResults) break;
        if (entry.type !== 'file') continue;
        if (!key.startsWith(prefix)) continue;

        const rel = key.slice(prefix.length);

        if (includeMatchers && !includeMatchers.some(m => m(rel))) continue;

        const text = decoder.decode(entry.content);
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (results.length >= maxResults) break;
          if (regex.test(lines[i])) {
            results.push(`${rel}:${i + 1}:${lines[i]}`);
          }
        }
      }

      return results;
    },
  };

  return Object.freeze(adapter);
}
