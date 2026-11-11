import "fake-indexeddb/auto";

import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  IndexedDBCache,
  startPolling,
} from "../src";

describe("polling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches immediately when configured", async () => {
  const cache = new IndexedDBCache({
    dbName: `poll-immediate-${Date.now()}-${Math.random()}`,
  });

  const fetcher = vi.fn(async () => ({
    version: 1,
  }));

  const onUpdate = vi.fn();

  const stop = startPolling(cache, {
    key: "tests",
    fetcher,
    interval: 1000,
    immediate: true,
    onUpdate,
  });

  await vi.waitFor(
    () => {
      expect(onUpdate).toHaveBeenCalledWith({
        version: 1,
      });
    },
    {
      timeout: 1000,
      interval: 10,
    }
  );

  expect(fetcher).toHaveBeenCalledTimes(1);

  expect(await cache.get("tests")).toEqual({
    version: 1,
  });

  stop();
});

  it("stops polling", async () => {
    const cache = new IndexedDBCache({
      dbName: `poll-stop-${Date.now()}-${Math.random()}`,
    });

    const fetcher = vi.fn(async () => ({
      version: 1,
    }));

    const stop = startPolling(cache, {
      key: "tests",
      fetcher,
      interval: 20,
      immediate: false,
    });

    await vi.waitFor(
      () => {
        expect(fetcher).toHaveBeenCalled();
      },
      {
        timeout: 1000,
        interval: 5,
      }
    );

    stop();

    const callsAfterStop = fetcher.mock.calls.length;

    await new Promise((resolve) =>
      setTimeout(resolve, 60)
    );

    expect(fetcher).toHaveBeenCalledTimes(
      callsAfterStop
    );
  });

  it("does not start overlapping polling requests", async () => {
    const cache = new IndexedDBCache({
      dbName: `poll-overlap-${Date.now()}-${Math.random()}`,
    });

    let resolveRequest!: (
      value: string
    ) => void;

    const fetcher = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveRequest = resolve;
        })
    );

    const stop = startPolling(cache, {
      key: "tests",
      fetcher,
      interval: 20,
      immediate: true,
    });

    await vi.waitFor(
      () => {
        expect(fetcher).toHaveBeenCalledTimes(1);
      },
      {
        timeout: 1000,
        interval: 5,
      }
    );

    // Let several polling intervals pass while
    // the first request is still unresolved.
    await new Promise((resolve) =>
      setTimeout(resolve, 80)
    );

    expect(fetcher).toHaveBeenCalledTimes(1);

    resolveRequest("PSA");

    await vi.waitFor(
      async () => {
        expect(
          await cache.get("tests")
        ).toBe("PSA");
      },
      {
        timeout: 1000,
        interval: 5,
      }
    );

    stop();
  });
});