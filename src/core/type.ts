export type CacheKey = string;

export interface CacheEntry<T = unknown> {
    key: CacheKey;
    value: T;
    createdAt: number;
    expiresAt: number | null;
}

export interface SetOptions {
    ttl?: number;
}

export interface GetOptions {
    allowStale?: number;
}

export interface CacheOptions {
    dbName?: string;
    storeName?: string;
    version?: number;
    defaultTtl?: number;
}

export interface FetchOptions {
    ttl?: number;
    force?: boolean;
}

export interface PreloadItem<T = unknown> {
    key: CacheKey;
    fetcher: (signal?: AbortSignal) => Promise<T>;
    ttl?: number;
}

export interface PollOptions<T> {
    key: CacheKey;
    fetcher: () => Promise<T>;
    interval: number;
    ttl?: number;
    immediate?: boolean;
    onUpdate?: (value: T) => void;
    onError?: (error: unknown) => void;
}

export interface BulkPreloadOptions {
    concurrency?: number;
    ttl?: number;
    signal?: AbortSignal;
    onProgress?: (progress: BulkPreloadProgress) => void;
}

export interface BulkPreloadProgress {
    total: number;
    completed: number;
    succeeded: number;
    failed: number;
    cached: number;
    aborted: number;
}

export interface BulkPreloadFailure {
    key: string;
    error: unknown;
}

export interface BulkPreloadResult extends BulkPreloadProgress {
    failures: BulkPreloadFailure[];
    complete: boolean;
}