import { CacheDatabase } from "./database";
import type {
  CacheOptions,
  FetchOptions,
  GetOptions,
  SetOptions
} from "./type";

export class IndexedDBCache {
  private readonly db: CacheDatabase;
  private readonly defaultTtl?: number;

  private readonly pendingRequests = new Map<
    string,
    Promise<unknown>
  >();

  constructor(options: CacheOptions = {}) {
    this.db = new CacheDatabase(options);
    this.defaultTtl = options.defaultTtl;
  }

  async get<T>(
    key: string,
    options: GetOptions = {}
  ): Promise<T | undefined> {
    const entry = await this.db.get<T>(key);

    if (!entry) {
      return undefined;
    }

    const expired =
      entry.expiresAt !== null &&
      Date.now() >= entry.expiresAt;

    if (expired && !options.allowStale) {
      await this.db.delete(key);
      return undefined;
    }

    return entry.value;
  }

  async set<T>(
    key: string,
    value: T,
    options: SetOptions = {}
  ): Promise<void> {
    const ttl = options.ttl ?? this.defaultTtl;

    const now = Date.now();

    await this.db.set({
      key,
      value,
      createdAt: now,
      expiresAt:
        ttl === undefined || ttl === Infinity
          ? null
          : now + ttl
    });
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== undefined;
  }

  async remove(key: string): Promise<void> {
    await this.db.delete(key);
  }

  async removeByPrefix(prefix: string): Promise<void> {
    await this.db.deleteByPrefix(prefix);
  }

  async clear(): Promise<void> {
    await this.db.clear();
  }

  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: FetchOptions = {}
  ): Promise<T> {
    if (!options.force) {
      const cached = await this.get<T>(key);

      if (cached !== undefined) {
        return cached;
      }
    }

    const existingRequest = this.pendingRequests.get(key);

    if (existingRequest) {
      return existingRequest as Promise<T>;
    }

    const request = fetcher()
      .then(async (value) => {
        await this.set(key, value, {
          ttl: options.ttl
        });

        return value;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, request);

    return request;
  }

}