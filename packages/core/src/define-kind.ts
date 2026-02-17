/**
 * defineKind — Kind factory
 *
 * Validates and freezes a kind definition into an RfsKind object
 * that can be passed to store.ensure().
 */

import type { RfsKindDef, RfsKind } from './defs';

/**
 * Define a Kind (recipe for a space)
 *
 * @param def - Kind definition including kind name, onInit, and optionally onCommand
 * @returns A frozen RfsKind object
 *
 * @example
 * ```typescript
 * const myKind = defineKind<{ name: string }>({
 *   kind: 'my-kind',
 *   async onInit({ input, space }) {
 *     await space.writeFile('index.js', `export const name = "${input.name}";`);
 *   },
 * });
 * ```
 */
export function defineKind<
  TInput = unknown,
  TCommand = never,
  TRuntime = Record<string, unknown>,
>(def: RfsKindDef<TInput, TCommand, TRuntime>): RfsKind<TInput, TCommand, TRuntime> {
  if (!def.kind || typeof def.kind !== 'string') {
    throw new Error('defineKind: kind must be a non-empty string');
  }

  if (typeof def.onInit !== 'function') {
    throw new Error('defineKind: onInit must be a function');
  }

  return Object.freeze({
    kind: def.kind,
    cacheKey: def.cacheKey,
    onInit: def.onInit,
    onCommand: def.onCommand,
  }) as RfsKind<TInput, TCommand, TRuntime>;
}
