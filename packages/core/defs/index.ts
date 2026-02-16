/**
 * @radium-fs/core — Type definition entry point
 *
 * Unified export of all public types, constants, and interfaces.
 */

// Constants
export {
  RFS_MANIFEST_FILENAME,
  RFS_SPACE_DIRNAME,
  RFS_LOCAL_DIRNAME,
  RFS_LOCAL_DEPS_DIRNAME,
  RFS_DATA_DIRNAME,
  RFS_TEMP_PREFIX,
  RFS_MANIFEST_VERSION,
} from './constants';

// Shared filesystem types
export type {
  RfsReadFileOptions,
  RfsReadDirOptions,
  RfsStatResult,
  RfsRemoveOptions,
  RfsGlobOptions,
  RfsGrepOptions,
} from './fs-types';

// Adapter
export type { RfsFsAdapter } from './adapter';

// Manifest & Origin types
export type {
  RfsOrigin,
  RfsDependency,
  RfsCommandRecord,
  RfsManifest,
} from './manifest';

// Event types
export type {
  RfsInitStartEvent,
  RfsInitCachedEvent,
  RfsInitDoneEvent,
  RfsInitErrorEvent,
  RfsCommandStartEvent,
  RfsCommandDoneEvent,
  RfsCommandErrorEvent,
  RfsCustomEvent,
  RfsEvent,
  RfsEventType,
  RfsCommandEventMap,
  RfsUnsubscribe,
} from './events';

// Kind types
export type {
  RfsLocalApi,
  RfsDepOptions,
  RfsSpaceApi,
  RfsCommandSpaceApi,
  RfsInitResult,
  RfsCommandResult,
  RfsOnInitContext,
  RfsOnCommandContext,
  RfsKindDef,
  RfsKind,
} from './kind';

// Store & Space types
export type {
  RfsSpaceBase,
  RfsSpaceWithCommands,
  RfsSpace,
  RfsStoreOptions,
  RfsEnsureOptions,
  RfsStore,
} from './store';
