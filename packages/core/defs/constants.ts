/**
 * radium-fs filesystem constants
 *
 * All disk path and filename conventions are defined here.
 */

/** Manifest filename */
export const RFS_MANIFEST_FILENAME = '.radium-fs-manifest.json' as const;

/** Space directory name (public content area) */
export const RFS_SPACE_DIRNAME = 'space' as const;

/** Local directory name (private storage, physically isolated) */
export const RFS_LOCAL_DIRNAME = 'local' as const;

/** Local-scope dependency storage directory name */
export const RFS_DEPS_DIRNAME = '.radium-fs-deps' as const;

/** Top-level data storage directory name */
export const RFS_DATA_DIRNAME = 'radium-fs-data' as const;

/** Temporary directory prefix (used during build, atomically renamed on completion) */
export const RFS_TEMP_PREFIX = '.tmp-' as const;

/** Current manifest version number */
export const RFS_MANIFEST_VERSION = 1 as const;
