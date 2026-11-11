export { IndexedDBCache } from "./core/cache";

export type {
  CacheEntry,
  CacheKey,
  CacheOptions,
  FetchOptions,
  GetOptions,
  SetOptions,
  PreloadItem,
  PollOptions
} from "./core/type";

export { preload } from "./features/preload";
export { startPolling } from "./features/polling";

export {
  PreloadProvider,
  usePreloadStatus,
} from "./react/preloadProvider";

export type {
  PreloadProviderProps,
  PreloadStatus,
} from "./react/types";

export { preloadMany } from "./features/bulk-preload";
export type {
  BulkPreloadOptions,
  BulkPreloadProgress,
  BulkPreloadFailure,
  BulkPreloadResult
} from "./core/type";