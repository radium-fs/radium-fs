import { describe, it, expect } from 'vitest';
import { memoryAdapter } from '@radium-fs/memory';

const decode = (buf: Uint8Array) => new TextDecoder().decode(buf);
const encode = (str: string) => new TextEncoder().encode(str);

function create() {
  return memoryAdapter();
}

describe('hash', () => {
  it('returns a 64-char lowercase hex SHA-256 digest', async () => {
    const adapter = create();
    const hash = await adapter.hash(encode('hello'));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('same input produces same hash', async () => {
    const adapter = create();
    const h1 = await adapter.hash(encode('test'));
    const h2 = await adapter.hash(encode('test'));
    expect(h1).toBe(h2);
  });

  it('different input produces different hash', async () => {
    const adapter = create();
    const h1 = await adapter.hash(encode('a'));
    const h2 = await adapter.hash(encode('b'));
    expect(h1).not.toBe(h2);
  });
});

describe('writeFile + readFile', () => {
  it('roundtrip with string content', async () => {
    const adapter = create();
    await adapter.writeFile('/file.txt', 'hello world');
    const content = decode(await adapter.readFile('/file.txt'));
    expect(content).toBe('hello world');
  });

  it('roundtrip with Uint8Array content', async () => {
    const adapter = create();
    const data = new Uint8Array([1, 2, 3, 4]);
    await adapter.writeFile('/bin', data);
    const result = await adapter.readFile('/bin');
    expect([...result]).toEqual([1, 2, 3, 4]);
  });

  it('auto-creates parent directories', async () => {
    const adapter = create();
    await adapter.writeFile('/a/b/c/deep.txt', 'deep');
    expect(await adapter.exists('/a')).toBe(true);
    expect(await adapter.exists('/a/b')).toBe(true);
    expect(await adapter.exists('/a/b/c')).toBe(true);
  });

  it('readFile returns a copy (mutation-safe)', async () => {
    const adapter = create();
    await adapter.writeFile('/safe.txt', 'original');
    const buf = await adapter.readFile('/safe.txt');
    buf[0] = 0xff;
    const fresh = await adapter.readFile('/safe.txt');
    expect(decode(fresh)).toBe('original');
  });

  it('writeFile stores a copy (mutation-safe)', async () => {
    const adapter = create();
    const data = encode('mutable');
    await adapter.writeFile('/mut.txt', data);
    data[0] = 0xff;
    const stored = decode(await adapter.readFile('/mut.txt'));
    expect(stored).toBe('mutable');
  });

  it('readFile on nonexistent path throws', async () => {
    const adapter = create();
    await expect(adapter.readFile('/nope')).rejects.toThrow('ENOENT');
  });
});

describe('mkdir', () => {
  it('creates nested directories', async () => {
    const adapter = create();
    await adapter.mkdir('/x/y/z');
    expect(await adapter.exists('/x')).toBe(true);
    expect(await adapter.exists('/x/y')).toBe(true);
    expect(await adapter.exists('/x/y/z')).toBe(true);
  });

  it('no-op if directory already exists', async () => {
    const adapter = create();
    await adapter.mkdir('/dup');
    await adapter.mkdir('/dup');
    const stat = await adapter.stat('/dup');
    expect(stat.isDirectory).toBe(true);
  });
});

describe('readDir', () => {
  it('returns direct children names', async () => {
    const adapter = create();
    await adapter.writeFile('/dir/a.txt', 'a');
    await adapter.writeFile('/dir/b.txt', 'b');
    await adapter.writeFile('/dir/sub/c.txt', 'c');

    const entries = await adapter.readDir('/dir');
    expect(entries).toContain('a.txt');
    expect(entries).toContain('b.txt');
    expect(entries).toContain('sub');
    expect(entries).not.toContain('c.txt');
  });

  it('returns sorted names', async () => {
    const adapter = create();
    await adapter.writeFile('/sort/z.txt', '');
    await adapter.writeFile('/sort/a.txt', '');
    await adapter.writeFile('/sort/m.txt', '');

    const entries = await adapter.readDir('/sort');
    expect(entries).toEqual(['a.txt', 'm.txt', 'z.txt']);
  });

  it('resolves symlinks in path', async () => {
    const adapter = create();
    await adapter.writeFile('/real/file.txt', 'content');
    await adapter.symlink('/real', '/link');

    const entries = await adapter.readDir('/link');
    expect(entries).toContain('file.txt');
  });
});

describe('stat', () => {
  it('returns correct info for files', async () => {
    const adapter = create();
    await adapter.writeFile('/f.txt', 'hello');
    const s = await adapter.stat('/f.txt');
    expect(s.isFile).toBe(true);
    expect(s.isDirectory).toBe(false);
    expect(s.size).toBe(5);
    expect(s.mtime).toBeInstanceOf(Date);
  });

  it('returns correct info for directories', async () => {
    const adapter = create();
    await adapter.mkdir('/d');
    const s = await adapter.stat('/d');
    expect(s.isFile).toBe(false);
    expect(s.isDirectory).toBe(true);
    expect(s.size).toBe(0);
  });

  it('follows symlinks', async () => {
    const adapter = create();
    await adapter.writeFile('/target.txt', 'data');
    await adapter.symlink('/target.txt', '/link.txt');
    const s = await adapter.stat('/link.txt');
    expect(s.isFile).toBe(true);
    expect(s.size).toBe(4);
  });

  it('throws on nonexistent path', async () => {
    const adapter = create();
    await expect(adapter.stat('/ghost')).rejects.toThrow('ENOENT');
  });
});

describe('exists', () => {
  it('returns true for existing entries', async () => {
    const adapter = create();
    await adapter.writeFile('/e.txt', '');
    expect(await adapter.exists('/e.txt')).toBe(true);
  });

  it('returns false for nonexistent entries', async () => {
    const adapter = create();
    expect(await adapter.exists('/no')).toBe(false);
  });

  it('returns false on symlink loop (no crash)', async () => {
    const adapter = create();
    await adapter.symlink('/loop-b', '/loop-a');
    await adapter.symlink('/loop-a', '/loop-b');
    expect(await adapter.exists('/loop-a')).toBe(false);
  });
});

describe('remove', () => {
  it('removes a single file', async () => {
    const adapter = create();
    await adapter.writeFile('/rm.txt', 'x');
    await adapter.remove('/rm.txt');
    expect(await adapter.exists('/rm.txt')).toBe(false);
  });

  it('recursive removes directory and all contents', async () => {
    const adapter = create();
    await adapter.writeFile('/rmdir/a.txt', '');
    await adapter.writeFile('/rmdir/sub/b.txt', '');
    await adapter.remove('/rmdir', { recursive: true });
    expect(await adapter.exists('/rmdir')).toBe(false);
    expect(await adapter.exists('/rmdir/a.txt')).toBe(false);
    expect(await adapter.exists('/rmdir/sub/b.txt')).toBe(false);
  });
});

describe('rename', () => {
  it('renames a single file', async () => {
    const adapter = create();
    await adapter.writeFile('/old.txt', 'data');
    await adapter.rename('/old.txt', '/new.txt');
    expect(await adapter.exists('/old.txt')).toBe(false);
    expect(decode(await adapter.readFile('/new.txt'))).toBe('data');
  });

  it('renames a directory with all children', async () => {
    const adapter = create();
    await adapter.writeFile('/src/a.txt', 'a');
    await adapter.writeFile('/src/sub/b.txt', 'b');
    await adapter.rename('/src', '/dest');

    expect(await adapter.exists('/src')).toBe(false);
    expect(decode(await adapter.readFile('/dest/a.txt'))).toBe('a');
    expect(decode(await adapter.readFile('/dest/sub/b.txt'))).toBe('b');
  });

  it('auto-creates parent directories for dest', async () => {
    const adapter = create();
    await adapter.writeFile('/mv.txt', 'x');
    await adapter.rename('/mv.txt', '/deep/nested/mv.txt');
    expect(decode(await adapter.readFile('/deep/nested/mv.txt'))).toBe('x');
  });
});

describe('symlink', () => {
  it('creates a symlink resolvable by readFile', async () => {
    const adapter = create();
    await adapter.writeFile('/target/file.txt', 'linked');
    await adapter.symlink('/target', '/link');
    const content = decode(await adapter.readFile('/link/file.txt'));
    expect(content).toBe('linked');
  });

  it('relative symlink resolution', async () => {
    const adapter = create();
    await adapter.writeFile('/a/b/real.txt', 'rel');
    await adapter.symlink('b', '/a/link');
    const content = decode(await adapter.readFile('/a/link/real.txt'));
    expect(content).toBe('rel');
  });

  it('chained symlinks', async () => {
    const adapter = create();
    await adapter.writeFile('/chain-target.txt', 'end');
    await adapter.symlink('/chain-target.txt', '/chain-mid');
    await adapter.symlink('/chain-mid', '/chain-start');
    const content = decode(await adapter.readFile('/chain-start'));
    expect(content).toBe('end');
  });

  it('symlink loop throws on readFile', async () => {
    const adapter = create();
    await adapter.symlink('/loop2', '/loop1');
    await adapter.symlink('/loop1', '/loop2');
    await expect(adapter.readFile('/loop1')).rejects.toThrow('Symlink loop');
  });
});

describe('glob', () => {
  it('matches files by pattern', async () => {
    const adapter = create();
    await adapter.writeFile('/root/a.ts', '');
    await adapter.writeFile('/root/b.js', '');
    await adapter.writeFile('/root/c.ts', '');

    const results = await adapter.glob('/root', '**/*.ts');
    expect(results).toContain('a.ts');
    expect(results).toContain('c.ts');
    expect(results).not.toContain('b.js');
  });

  it('respects ignore option', async () => {
    const adapter = create();
    await adapter.writeFile('/root/keep.ts', '');
    await adapter.writeFile('/root/skip.ts', '');

    const results = await adapter.glob('/root', '**/*.ts', { ignore: ['skip*'] });
    expect(results).toContain('keep.ts');
    expect(results).not.toContain('skip.ts');
  });

  it('respects maxResults', async () => {
    const adapter = create();
    await adapter.writeFile('/root/1.txt', '');
    await adapter.writeFile('/root/2.txt', '');
    await adapter.writeFile('/root/3.txt', '');

    const results = await adapter.glob('/root', '**/*.txt', { maxResults: 2 });
    expect(results.length).toBe(2);
  });
});

describe('grep', () => {
  it('searches file contents with regex', async () => {
    const adapter = create();
    await adapter.writeFile('/search/code.ts', 'const x = 1;\nlet y = 2;\nconst z = 3;');

    const results = await adapter.grep('/search', 'const');
    expect(results.length).toBe(2);
    expect(results[0]).toContain('code.ts:1:const x');
    expect(results[1]).toContain('code.ts:3:const z');
  });

  it('respects include filter', async () => {
    const adapter = create();
    await adapter.writeFile('/search/a.ts', 'match');
    await adapter.writeFile('/search/b.js', 'match');

    const results = await adapter.grep('/search', 'match', { include: ['**/*.ts'] });
    expect(results.length).toBe(1);
    expect(results[0]).toContain('a.ts');
  });

  it('respects maxResults', async () => {
    const adapter = create();
    await adapter.writeFile('/search/big.txt', 'line1\nline2\nline3\nline4\nline5');

    const results = await adapter.grep('/search', 'line', { maxResults: 3 });
    expect(results.length).toBe(3);
  });
});

describe('normalizePath', () => {
  it('handles various path formats via writeFile/readFile', async () => {
    const adapter = create();

    await adapter.writeFile('/a/./b/../c/file.txt', 'normalized');
    const content = decode(await adapter.readFile('/a/c/file.txt'));
    expect(content).toBe('normalized');
  });

  it('handles multiple slashes', async () => {
    const adapter = create();
    await adapter.writeFile('///a///b///c.txt', 'ok');
    const content = decode(await adapter.readFile('/a/b/c.txt'));
    expect(content).toBe('ok');
  });
});
