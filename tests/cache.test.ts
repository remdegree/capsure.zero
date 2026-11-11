import "fake-indexeddb/auto";

import {
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { IndexedDBCache } from "../src";

describe("IndexedDBCache", () => {
  let cache: IndexedDBCache;

  beforeEach(() => {
    cache = new IndexedDBCache({
      dbName: `cache-test-${Date.now()}-${Math.random()}`,
      storeName: "entries",
    });
  });

  it("stores and retrieves a value", async () => {
    const value = {
      testCode: "PSA",
      name: "Prostate Specific Antigen",
    };

    await cache.set("test:PSA", value);

    const result = await cache.get<typeof value>("test:PSA");

    expect(result).toEqual(value);
  });

  it("returns undefined for a missing key", async () => {
    const result = await cache.get("missing");

    expect(result).toBeUndefined();
  });

  it("checks whether a key exists", async () => {
    await cache.set("test:PSA", {
      testCode: "PSA",
    });

    expect(await cache.has("test:PSA")).toBe(true);
    expect(await cache.has("test:XYZ")).toBe(false);
  });

  it("removes a cached value", async () => {
    await cache.set("test:PSA", {
      testCode: "PSA",
    });

    await cache.remove("test:PSA");

    expect(await cache.get("test:PSA")).toBeUndefined();
  });

  it("clears the cache", async () => {
    await cache.set("test:PSA", { testCode: "PSA" });
    await cache.set("test:CBC", { testCode: "CBC" });

    await cache.clear();

    expect(await cache.get("test:PSA")).toBeUndefined();
    expect(await cache.get("test:CBC")).toBeUndefined();
  });
});