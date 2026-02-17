/**
 * @radium-fs/node — Node.js platform adapter
 *
 * Implements RfsAdapter using Node.js built-in modules (node:fs, node:crypto).
 * Requires Node.js >= 22 for built-in fs.glob support.
 */

import { createHash } from 'node:crypto';
import {
  readFile as fsReadFile,
  writeFile as fsWriteFile,
  mkdir as fsMkdir,
  readdir as fsReaddir,
  stat as fsStat,
  access as fsAccess,
  rm as fsRm,
  rename as fsRename,
  symlink as fsSymlink,
  glob as fsGlob,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import type {
  RfsAdapter,
  RfsStatResult,
  RfsRemoveOptions,
  RfsGlobOptions,
  RfsGrepOptions,
} from '@radium-fs/core';

/**
 * Create a Node.js platform adapter
 *
 * @returns A frozen RfsAdapter implementation using Node.js built-in APIs
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
export function nodeAdapter(): RfsAdapter {
  const adapter: RfsAdapter = {
    // -- Crypto --

    async hash(data: Uint8Array): Promise<string> {
      return createHash('sha256').update(data).digest('hex');
    },

    // -- Filesystem --

    async readFile(path: string): Promise<Uint8Array> {
      return fsReadFile(path);
    },

    async writeFile(path: string, content: string | Uint8Array): Promise<void> {
      await fsMkdir(dirname(path), { recursive: true });
      await fsWriteFile(path, content);
    },

    async mkdir(path: string): Promise<void> {
      await fsMkdir(path, { recursive: true });
    },

    async readDir(path: string): Promise<string[]> {
      return fsReaddir(path);
    },

    async stat(path: string): Promise<RfsStatResult> {
      const stats = await fsStat(path);
      return {
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        mtime: stats.mtime,
      };
    },

    async exists(path: string): Promise<boolean> {
      try {
        await fsAccess(path);
        return true;
      } catch {
        return false;
      }
    },

    async remove(path: string, options?: RfsRemoveOptions): Promise<void> {
      await fsRm(path, {
        recursive: options?.recursive ?? false,
        force: true,
      });
    },

    async rename(src: string, dest: string): Promise<void> {
      await fsMkdir(dirname(dest), { recursive: true });
      await fsRename(src, dest);
    },

    async symlink(target: string, linkPath: string): Promise<void> {
      await fsMkdir(dirname(linkPath), { recursive: true });
      await fsSymlink(target, linkPath);
    },

    async glob(
      root: string,
      pattern: string,
      options?: RfsGlobOptions,
    ): Promise<string[]> {
      const results: string[] = [];
      const maxResults = options?.maxResults ?? Infinity;

      for await (const entry of fsGlob(pattern, {
        cwd: root,
        exclude: options?.ignore,
      })) {
        results.push(entry);
        if (results.length >= maxResults) break;
      }

      return results;
    },

    async grep(
      root: string,
      pattern: string,
      options?: RfsGrepOptions,
    ): Promise<string[]> {
      const regex = new RegExp(pattern);
      const results: string[] = [];
      const maxResults = options?.maxResults ?? Infinity;

      // Find files to search (deduplicate across patterns)
      const includePattern = options?.include ?? ['**/*'];
      const fileSet = new Set<string>();
      for (const pat of includePattern) {
        for await (const entry of fsGlob(pat, { cwd: root })) {
          fileSet.add(entry);
        }
      }
      const files = [...fileSet];

      // Search each file line by line
      for (const file of files) {
        if (results.length >= maxResults) break;

        try {
          const rl = createInterface({
            input: createReadStream(join(root, file)),
            crlfDelay: Infinity,
          });

          let lineNumber = 0;
          for await (const line of rl) {
            lineNumber++;
            if (regex.test(line)) {
              results.push(`${file}:${lineNumber}:${line}`);
              if (results.length >= maxResults) {
                rl.close();
                break;
              }
            }
          }
        } catch {
          // Skip unreadable entries (directories, permission denied, deleted mid-scan, etc.)
        }
      }

      return results;
    },
  };

  return Object.freeze(adapter);
}
