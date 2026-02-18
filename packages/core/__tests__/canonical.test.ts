import { describe, it, expect } from 'vitest';
import { canonicalStringify } from '@radium-fs/core';

describe('canonicalStringify', () => {
  it('sorts object keys alphabetically', () => {
    expect(canonicalStringify({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it('sorts nested object keys recursively', () => {
    expect(canonicalStringify({ a: { z: 1, y: 2 } })).toBe('{"a":{"y":2,"z":1}}');
  });

  it('preserves array order', () => {
    expect(canonicalStringify([3, 1, 2])).toBe('[3,1,2]');
  });

  it('omits undefined properties', () => {
    expect(canonicalStringify({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it('serializes NaN as null', () => {
    expect(canonicalStringify(NaN)).toBe('null');
  });

  it('serializes Infinity as null', () => {
    expect(canonicalStringify(Infinity)).toBe('null');
    expect(canonicalStringify(-Infinity)).toBe('null');
  });

  it('serializes null as null', () => {
    expect(canonicalStringify(null)).toBe('null');
  });

  it('serializes undefined as null', () => {
    expect(canonicalStringify(undefined)).toBe('null');
  });

  it('serializes booleans', () => {
    expect(canonicalStringify(true)).toBe('true');
    expect(canonicalStringify(false)).toBe('false');
  });

  it('serializes strings with escaping', () => {
    expect(canonicalStringify('hello "world"')).toBe('"hello \\"world\\""');
    expect(canonicalStringify('back\\slash')).toBe('"back\\\\slash"');
  });

  it('handles empty objects and arrays', () => {
    expect(canonicalStringify({})).toBe('{}');
    expect(canonicalStringify([])).toBe('[]');
  });

  it('produces identical output regardless of key insertion order', () => {
    const a = { x: 1, y: 2, z: 3 };
    const b = { z: 3, x: 1, y: 2 };
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
  });

  it('handles deeply nested structures', () => {
    const val = { c: [{ b: 2, a: 1 }], a: true };
    expect(canonicalStringify(val)).toBe('{"a":true,"c":[{"a":1,"b":2}]}');
  });
});
