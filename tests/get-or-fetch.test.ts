import "fake-indexeddb/auto";

import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { IndexedDBCache } from "../src";

describe("getOrFetch", () => {
  it("calls fetcher on cache miss", async () => {
    const cache = new IndexedDBCache({
      dbName: `fetch-${Date.now()}`,
    });

    const fetcher = vi.fn(async () => ({
      tests: ["PSA"],
    }));

    const result = await cache.getOrFetch(
      "tests",
      fetcher
    );

    expect(result).toEqual({
      tests: ["PSA"],
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not call fetcher on cache hit", async () => {
    const cache = new IndexedDBCache({
      dbName: `hit-${Date.now()}`,
    });

    await cache.set("tests", {
      tests: ["PSA"],
    });

    const fetcher = vi.fn(async () => ({
      tests: ["CBC"],
    }));

    const result = await cache.getOrFetch(
      "tests",
      fetcher
    );

    expect(result).toEqual({
      tests: ["PSA"],
    });

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("supports force refresh", async () => {
    const cache = new IndexedDBCache({
      dbName: `force-${Date.now()}`,
    });

    await cache.set("tests", ["PSA"]);

    const fetcher = vi.fn(async () => ["CBC"]);

    const result = await cache.getOrFetch(
      "tests",
      fetcher,
      {
        force: true,
      }
    );

    expect(result).toEqual(["CBC"]);
    expect(fetcher).toHaveBeenCalledTimes(1);

    expect(await cache.get("tests")).toEqual([
      "CBC",
    ]);
  });

  it("caches the fetched result", async () => {
    const cache = new IndexedDBCache({
      dbName: `store-${Date.now()}`,
    });

    const fetcher = vi.fn(async () => ({
      value: "from-api",
    }));

    await cache.getOrFetch("data", fetcher);

    expect(await cache.get("data")).toEqual({
      value: "from-api",
    });
  });
  
  it("deduplicates concurrent requests for the same key", async () => {
    const cache = new IndexedDBCache({
      dbName: `dedupe-${Date.now()}`,
    });
  
    let resolveRequest!: (value: string) => void;
  
    const fetcher = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveRequest = resolve;
        })
    );
  
    const request1 = cache.getOrFetch(
      "tests",
      fetcher
    );
  
    const request2 = cache.getOrFetch(
      "tests",
      fetcher
    );
  
    const request3 = cache.getOrFetch(
      "tests",
      fetcher
    );
  
    // Allow the async cache lookups to complete
    // and getOrFetch() to reach fetcher().
    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  
    resolveRequest("PSA");
  
    const results = await Promise.all([
      request1,
      request2,
      request3,
    ]);
  
    expect(results).toEqual([
      "PSA",
      "PSA",
      "PSA",
    ]);
  
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
