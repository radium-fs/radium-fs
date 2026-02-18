import { describe, it, expect } from 'vitest';
import { defineKind } from '@radium-fs/core';

describe('defineKind', () => {
  it('returns a frozen object with all fields', () => {
    const kind = defineKind({
      kind: 'test',
      async onInit() {},
      async onCommand() {},
      cacheKey: (input: unknown) => input as Record<string, unknown>,
    });

    expect(kind.kind).toBe('test');
    expect(typeof kind.onInit).toBe('function');
    expect(typeof kind.onCommand).toBe('function');
    expect(typeof kind.cacheKey).toBe('function');
    expect(Object.isFrozen(kind)).toBe(true);
  });

  it('allows omitting optional fields', () => {
    const kind = defineKind({
      kind: 'minimal',
      async onInit() {},
    });

    expect(kind.kind).toBe('minimal');
    expect(kind.onCommand).toBeUndefined();
    expect(kind.cacheKey).toBeUndefined();
  });

  it('throws if kind is empty string', () => {
    expect(() =>
      defineKind({ kind: '', async onInit() {} }),
    ).toThrow('kind must be a non-empty string');
  });

  it('throws if kind is not a string', () => {
    expect(() =>
      defineKind({ kind: 123 as unknown as string, async onInit() {} }),
    ).toThrow('kind must be a non-empty string');
  });

  it('throws if onInit is not a function', () => {
    expect(() =>
      defineKind({ kind: 'bad', onInit: 'not a function' as never }),
    ).toThrow('onInit must be a function');
  });

  it('throws if onInit is missing', () => {
    expect(() =>
      defineKind({ kind: 'bad' } as never),
    ).toThrow('onInit must be a function');
  });
});
