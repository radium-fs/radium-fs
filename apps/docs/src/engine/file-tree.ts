import type { RfsAdapter } from '@radium-fs/core';
import type { FileTreeNode } from './types';

const decoder = new TextDecoder();

export async function buildFileTree(
  adapter: RfsAdapter,
  rootPath: string,
): Promise<FileTreeNode> {
  const rootName = rootPath.split('/').filter(Boolean).pop() ?? '/';
  return walk(adapter, rootPath, rootName);
}

async function walk(
  adapter: RfsAdapter,
  path: string,
  name: string,
): Promise<FileTreeNode> {
  const stat = await adapter.stat(path);

  if (stat.isFile) {
    let content: string | undefined;
    try {
      const data = await adapter.readFile(path);
      content = decoder.decode(data);
    } catch {
      content = undefined;
    }
    return { name, type: 'file', content };
  }

  const entries = await adapter.readDir(path);
  const children: FileTreeNode[] = [];

  for (const entry of entries) {
    try {
      const child = await walk(adapter, `${path}/${entry}`, entry);
      children.push(child);
    } catch {
      // skip inaccessible entries
    }
  }

  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { name, type: 'dir', children };
}
