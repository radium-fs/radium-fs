/**
 * radium-fs event types
 *
 * Events are delivered through three channels:
 * 1. Store-level `store.on()` — global listener for all events
 * 2. Ensure-level options callbacks — `onStart`, `onCached`, etc.
 * 3. Space-level `.on()` / `.onCustom()` — command lifecycle events and custom events
 *
 * Note: Custom events emitted via emit() during onInit can only be captured
 * by store.on(), since the RfsSpace object has not yet been returned to the
 * caller at that point.
 */

// ---------------------------------------------------------------------------
// Init Events
// ---------------------------------------------------------------------------

/** Fired when init begins (cache miss, about to execute onInit) */
export interface RfsInitStartEvent {
  type: 'init:start';
  kind: string;
  dataId: string;
  input: unknown;
}

/** Fired on cache hit (onInit skipped) */
export interface RfsInitCachedEvent {
  type: 'init:cached';
  kind: string;
  dataId: string;
  input: unknown;
  path: string;
}

/** Fired when init completes successfully */
export interface RfsInitDoneEvent {
  type: 'init:done';
  kind: string;
  dataId: string;
  input: unknown;
  path: string;
  exports: Record<string, string>;
  metadata: Record<string, unknown>;
}

/** Fired when init fails */
export interface RfsInitErrorEvent {
  type: 'init:error';
  kind: string;
  dataId: string;
  input: unknown;
  error: Error;
}

// ---------------------------------------------------------------------------
// Command Events
// ---------------------------------------------------------------------------

/** Fired when command execution begins */
export interface RfsCommandStartEvent {
  type: 'command:start';
  kind: string;
  dataId: string;
  command: unknown;
}

/** Fired when command execution completes */
export interface RfsCommandDoneEvent {
  type: 'command:done';
  kind: string;
  dataId: string;
  command: unknown;
  exports: Record<string, string>;
  metadata: Record<string, unknown>;
}

/** Fired when command execution fails */
export interface RfsCommandErrorEvent {
  type: 'command:error';
  kind: string;
  dataId: string;
  command: unknown;
  error: Error;
}

// ---------------------------------------------------------------------------
// Custom Event
// ---------------------------------------------------------------------------

/** Custom event (emitted via emit() in onInit/onCommand) */
export interface RfsCustomEvent<T = unknown> {
  type: 'custom';
  kind: string;
  dataId: string;
  payload: T;
}

// ---------------------------------------------------------------------------
// Union
// ---------------------------------------------------------------------------

/** Union of all event types (received by store.on()) */
export type RfsEvent =
  | RfsInitStartEvent
  | RfsInitCachedEvent
  | RfsInitDoneEvent
  | RfsInitErrorEvent
  | RfsCommandStartEvent
  | RfsCommandDoneEvent
  | RfsCommandErrorEvent
  | RfsCustomEvent;

/** Event type discriminator */
export type RfsEventType = RfsEvent['type'];

/** Command-related events (subscribable via space.on()) */
export type RfsCommandEventMap = {
  'command:start': RfsCommandStartEvent;
  'command:done': RfsCommandDoneEvent;
  'command:error': RfsCommandErrorEvent;
};

/** Unsubscribe function */
export type RfsUnsubscribe = () => void;
