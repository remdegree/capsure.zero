import "fake-indexeddb/auto";

import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  IndexedDBCache,
  preload,
} from "../src";

describe("preload", () => {
  it("preloads multiple cache entries", async () => {
    const cache = new IndexedDBCache({
      dbName: `preload-${Date.now()}`,
    });

    const testsFetcher = vi.fn(async () => [
      "PSA",
      "CBC",
    ]);

    const locationsFetcher = vi.fn(async () => [
      "50",
      "51",
    ]);

    await preload(cache, [
      {
        key: "tests",
        fetcher: testsFetcher,
      },
      {
        key: "locations",
        fetcher: locationsFetcher,
      },
    ]);

    expect(await cache.get("tests")).toEqual([
      "PSA",
      "CBC",
    ]);

    expect(await cache.get("locations")).toEqual([
      "50",
      "51",
    ]);

    expect(testsFetcher).toHaveBeenCalledTimes(1);
    expect(locationsFetcher).toHaveBeenCalledTimes(1);
  });

  it("does not refetch already cached entries", async () => {
    const cache = new IndexedDBCache({
      dbName: `preload-hit-${Date.now()}`,
    });

    await cache.set("tests", ["PSA"]);

    const fetcher = vi.fn(async () => [
      "CBC",
    ]);

    await preload(cache, [
      {
        key: "tests",
        fetcher,
      },
    ]);

    expect(fetcher).not.toHaveBeenCalled();

    expect(await cache.get("tests")).toEqual([
      "PSA",
    ]);
  });
});