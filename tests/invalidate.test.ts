import "fake-indexeddb/auto";

import {
  describe,
  expect,
  it,
} from "vitest";

import { IndexedDBCache } from "../src";

describe("invalidation", () => {
  it("removes entries by prefix", async () => {
    const cache = new IndexedDBCache({
      dbName: `invalidate-${Date.now()}`,
    });

    await cache.set(
      "test:PSA:location:50",
      { test: "PSA", location: "50" }
    );

    await cache.set(
      "test:PSA:location:51",
      { test: "PSA", location: "51" }
    );

    await cache.set(
      "test:CBC:location:50",
      { test: "CBC", location: "50" }
    );

    await cache.removeByPrefix("test:PSA:");

    expect(
      await cache.get("test:PSA:location:50")
    ).toBeUndefined();

    expect(
      await cache.get("test:PSA:location:51")
    ).toBeUndefined();

    expect(
      await cache.get("test:CBC:location:50")
    ).toEqual({
      test: "CBC",
      location: "50",
    });
  });
});

it("invalidates all locations for a changed test", async () => {
  const cache = new IndexedDBCache({
    dbName: `aoe-invalidation-${Date.now()}`,
  });

  const locations = ["50", "51", "52"];

  for (const location of locations) {
    await cache.set(
      `test:PSA:location:${location}`,
      {
        test: "PSA",
        location,
      }
    );
  }

  await cache.set(
    "test:CBC:location:50",
    {
      test: "CBC",
      location: "50",
    }
  );

  await cache.removeByPrefix("test:PSA:");

  for (const location of locations) {
    expect(
      await cache.get(
        `test:PSA:location:${location}`
      )
    ).toBeUndefined();
  }

  expect(
    await cache.get("test:CBC:location:50")
  ).toEqual({
    test: "CBC",
    location: "50",
  });
});

describe("removeByPrefix", () => {
  it("removes only matching keys", async () => {
    const cache = new IndexedDBCache({
      dbName: `prefix-${Date.now()}`,
    });

    await cache.set(
      "test:PSA:location:50",
      {
        test: "PSA",
        location: "50",
      }
    );

    await cache.set(
      "test:PSA:location:51",
      {
        test: "PSA",
        location: "51",
      }
    );

    await cache.set(
      "test:CBC:location:50",
      {
        test: "CBC",
        location: "50",
      }
    );

    await cache.removeByPrefix("test:PSA:");

    expect(
      await cache.get(
        "test:PSA:location:50"
      )
    ).toBeUndefined();

    expect(
      await cache.get(
        "test:PSA:location:51"
      )
    ).toBeUndefined();

    expect(
      await cache.get(
        "test:CBC:location:50"
      )
    ).toEqual({
      test: "CBC",
      location: "50",
    });
  });
});