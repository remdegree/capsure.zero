import "fake-indexeddb/auto";

import {
  describe,
  expect,
  it,
} from "vitest";

import { IndexedDBCache } from "../src";

describe("TTL", () => {
  it("returns cached value before TTL expires", async () => {
    const cache = new IndexedDBCache({
      dbName: `ttl-${Date.now()}`,
    });

    await cache.set(
      "tests",
      ["PSA", "CBC"],
      {
        ttl: 1000,
      }
    );

    const result = await cache.get("tests");

    expect(result).toEqual(["PSA", "CBC"]);
  });

  it("returns undefined after TTL expires", async () => {
    const cache = new IndexedDBCache({
      dbName: `ttl-${Date.now()}`,
    });

    await cache.set(
      "tests",
      ["PSA"],
      {
        ttl: 20,
      }
    );

    await new Promise((resolve) =>
      setTimeout(resolve, 30)
    );

    const result = await cache.get("tests");

    expect(result).toBeUndefined();
  });

  it("uses the default TTL", async () => {
    const cache = new IndexedDBCache({
      dbName: `default-ttl-${Date.now()}`,
      defaultTtl: 20,
    });

    await cache.set("tests", ["PSA"]);

    await new Promise((resolve) =>
      setTimeout(resolve, 30)
    );

    expect(await cache.get("tests")).toBeUndefined();
  });

  it("allows a per-entry TTL to override default TTL", async () => {
    const cache = new IndexedDBCache({
      dbName: `override-${Date.now()}`,
      defaultTtl: 20,
    });

    await cache.set(
      "tests",
      ["PSA"],
      {
        ttl: 1000,
      }
    );

    await new Promise((resolve) =>
      setTimeout(resolve, 30)
    );

    expect(await cache.get("tests")).toEqual(["PSA"]);
  });
});