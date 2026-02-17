/**
 * Canonical JSON serialization
 *
 * Produces a deterministic string representation of any JSON-compatible value.
 * Used for dataId generation: identical inputs always produce identical strings,
 * regardless of property insertion order or runtime.
 *
 * Rules:
 * - Object keys are sorted recursively in lexicographic (Unicode code-point) order
 * - Compact output (no whitespace)
 * - `undefined` properties are omitted
 * - `NaN` and `Infinity` are serialized as `null`
 * - Arrays preserve insertion order (they are ordered data structures)
 */

/**
 * Serialize a value to a canonical JSON string
 *
 * @example
 * ```typescript
 * canonicalStringify({ b: 2, a: 1 }); // '{"a":1,"b":2}'
 * canonicalStringify({ a: { z: 1, y: 2 } }); // '{"a":{"y":2,"z":1}}'
 * ```
 */
export function canonicalStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';

    case 'number':
      if (!Number.isFinite(value)) return 'null';
      return JSON.stringify(value);

    case 'string':
      return JSON.stringify(value);

    case 'object':
      break;

    default:
      return 'null';
  }

  // Array — preserve order
  if (Array.isArray(value)) {
    const items = value.map(canonicalStringify);
    return '[' + items.join(',') + ']';
  }

  // Object — sort keys recursively
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const pairs: string[] = [];

  for (const key of keys) {
    const v = obj[key];
    if (v === undefined) continue;
    pairs.push(JSON.stringify(key) + ':' + canonicalStringify(v));
  }

  return '{' + pairs.join(',') + '}';
}
