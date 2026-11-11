
import "fake-indexeddb/auto";

import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { IndexedDBCache } from "../src/core/cache";
import { preloadMany } from "../src/features/bulk-preload";
import type { PreloadItem } from "../src/core/type";

let dbCounter = 0;
let cache: IndexedDBCache;

function createCache(): IndexedDBCache {
  dbCounter += 1;

  return new IndexedDBCache({
    dbName: `bulk-preload-test-${dbCounter}`,
    storeName: "test-data",
    version: 1,
  });
}

function createItems(
  count: number,
): PreloadItem[] {
  return Array.from({ length: count }, (_, index) => ({
    key: `test-${index + 1}`,
    fetcher: async () => ({
      id: index + 1,
      name: `Test ${index + 1}`,
    }),
  }));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeEach(() => {
  cache = createCache();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("preloadMany", () => {
  it("returns a complete result for empty input", async () => {
    const result = await preloadMany(cache, []);

    expect(result).toMatchObject({
      total: 0,
      completed: 0,
      succeeded: 0,
      failed: 0,
      cached: 0,
      aborted: 0,
      complete: true,
    });

    expect(result.failures).toEqual([]);
  });

  it("fetches and caches every item", async () => {
    const items = createItems(10);

    const result = await preloadMany(cache, items, {
      concurrency: 3,
    });

    expect(result.total).toBe(10);
    expect(result.completed).toBe(10);
    expect(result.succeeded).toBe(10);
    expect(result.failed).toBe(0);
    expect(result.cached).toBe(0);
    expect(result.complete).toBe(true);

    for (let index = 1; index <= 10; index += 1) {
      await expect(cache.get(`test-${index}`)).resolves.toEqual({
        id: index,
        name: `Test ${index}`,
      });
    }
  });

  it("does not fetch items already present in the cache", async () => {
    await cache.set("existing-1", { value: 1 });
    await cache.set("existing-2", { value: 2 });

    const fetcher = vi.fn(async () => ({ value: 999 }));

    const result = await preloadMany(
      cache,
      [
        { key: "existing-1", fetcher },
        { key: "existing-2", fetcher },
      ],
    );

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.cached).toBe(2);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.complete).toBe(true);

    await expect(cache.get("existing-1")).resolves.toEqual({
      value: 1,
    });
  });

  it("never exceeds the configured concurrency", async () => {
    let active = 0;
    let maximumActive = 0;

    const items: PreloadItem[] = Array.from(
      { length: 12 },
      (_, index) => ({
        key: `concurrency-${index}`,
        fetcher: async () => {
          active += 1;
          maximumActive = Math.max(maximumActive, active);

          try {
            await delay(10);
            return { index };
          } finally {
            active -= 1;
          }
        },
      }),
    );

    const result = await preloadMany(cache, items, {
      concurrency: 3,
    });

    expect(result.complete).toBe(true);
    expect(maximumActive).toBeLessThanOrEqual(3);
    expect(maximumActive).toBe(3);
  });

  it("continues processing when an individual fetch fails", async () => {
    const items: PreloadItem[] = [
      {
        key: "success-1",
        fetcher: async () => ({ value: 1 }),
      },
      {
        key: "failure",
        fetcher: async () => {
          throw new Error("API request failed");
        },
      },
      {
        key: "success-2",
        fetcher: async () => ({ value: 2 }),
      },
    ];

    const result = await preloadMany(cache, items, {
      concurrency: 2,
    });

    expect(result.total).toBe(3);
    expect(result.completed).toBe(3);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.complete).toBe(false);

    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].key).toBe("failure");

    await expect(cache.get("success-1")).resolves.toEqual({
      value: 1,
    });

    await expect(cache.get("success-2")).resolves.toEqual({
      value: 2,
    });

    await expect(cache.get("failure")).resolves.toBeUndefined();
  });

  it("collects every failure when all fetches fail", async () => {
    const items: PreloadItem[] = Array.from(
      { length: 4 },
      (_, index) => ({
        key: `failure-${index}`,
        fetcher: async () => {
          throw new Error(`Failure ${index}`);
        },
      }),
    );

    const result = await preloadMany(cache, items, {
      concurrency: 2,
    });

    expect(result.total).toBe(4);
    expect(result.completed).toBe(4);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(4);
    expect(result.failures).toHaveLength(4);
    expect(result.complete).toBe(false);
  });

  it("reports progress as jobs finish", async () => {
    const onProgress = vi.fn();

    const result = await preloadMany(
      cache,
      createItems(4),
      {
        concurrency: 2,
        onProgress,
      },
    );

    expect(onProgress).toHaveBeenCalled();

    const progressUpdates = onProgress.mock.calls.map(
      ([progress]) => progress,
    );

    for (const progress of progressUpdates) {
      expect(progress.completed).toBeGreaterThanOrEqual(0);
      expect(progress.completed).toBeLessThanOrEqual(4);
    }

    const lastProgress =
      progressUpdates[progressUpdates.length - 1];

    expect(lastProgress).toMatchObject({
      total: 4,
      completed: 4,
      succeeded: 4,
      failed: 0,
      cached: 0,
      aborted: 0,
    });

    expect(result.complete).toBe(true);
  });

  it.each([0, -1, 1.5, NaN])(
    "rejects invalid concurrency: %s",
    async (concurrency) => {
      await expect(
        preloadMany(cache, createItems(2), {
          concurrency,
        }),
      ).rejects.toThrow();
    },
  );

  it("does not start fetches when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const fetcher = vi.fn(async () => ({ value: 1 }));

    const result = await preloadMany(
      cache,
      [
        { key: "abort-1", fetcher },
        { key: "abort-2", fetcher },
      ],
      {
        concurrency: 2,
        signal: controller.signal,
      },
    );

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.aborted).toBe(2);
    expect(result.completed).toBe(2);
    expect(result.succeeded).toBe(0);
    expect(result.complete).toBe(false);
  });

  it("uses an item's TTL instead of the default TTL", async () => {
    let now = 1_000;

    vi.spyOn(Date, "now").mockImplementation(() => now);

    const result = await preloadMany(
      cache,
      [
        {
          key: "short-lived",
          fetcher: async () => ({ value: 1 }),
          ttl: 30,
        },
      ],
      {
        ttl: 60_000,
      },
    );

    expect(result.complete).toBe(true);

    // The value exists before its item-specific TTL expires.
    await expect(cache.get("short-lived")).resolves.toEqual({
      value: 1,
    });

    // Advance beyond the item's TTL, but not the default TTL.
    now = 1_031;

    await expect(cache.get("short-lived")).resolves.toBeUndefined();
  });

  it("processes all 78 jobs even when job 51 fails", async () => {
    let started = 0;

    const items: PreloadItem[] = Array.from(
      { length: 78 },
      (_, index) => ({
        key: `large-batch-${index + 1}`,
        fetcher: async () => {
          started += 1;

          if (index === 50) {
            throw new Error("Job 51 failed");
          }

          return { id: index + 1 };
        },
      }),
    );

    const result = await preloadMany(cache, items, {
      concurrency: 5,
    });

    expect(started).toBe(78);
    expect(result.total).toBe(78);
    expect(result.completed).toBe(78);
    expect(result.succeeded).toBe(77);
    expect(result.failed).toBe(1);
    expect(result.failures[0].key).toBe("large-batch-51");
    expect(result.complete).toBe(false);

    // Jobs after the failed item must still be processed.
    await expect(cache.get("large-batch-52")).resolves.toEqual({
      id: 52,
    });

    await expect(cache.get("large-batch-78")).resolves.toEqual({
      id: 78,
    });

    await expect(cache.get("large-batch-51")).resolves.toBeUndefined();
  });

  it("reports a cache-write failure and continues with later items", async () => {
    const originalSet = cache.set.bind(cache);
    const setSpy = vi
      .spyOn(cache, "set")
      .mockRejectedValueOnce(new Error("Storage write failed"));

    // Let subsequent writes work normally.
    setSpy.mockImplementation((...args) => originalSet(...args));

    const result = await preloadMany(
      cache,
      [
        {
          key: "write-failure",
          fetcher: async () => ({ value: 1 }),
        },
        {
          key: "write-success",
          fetcher: async () => ({ value: 2 }),
        },
      ],
      {
        concurrency: 1,
      },
    );

    expect(result.total).toBe(2);
    expect(result.completed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failures[0].key).toBe("write-failure");

    await expect(cache.get("write-success")).resolves.toEqual({
      value: 2,
    });
  });
});
