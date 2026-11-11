import type { IndexedDBCache } from "../core/cache";
import type { PollOptions } from "../core/type";

export function startPolling<T>(
  cache: IndexedDBCache,
  options: PollOptions<T>
): () => void {
  let stopped = false;
  let executing = false;

  const execute = async () => {
    if (stopped || executing) {
      return;
    }

    executing = true;

    try {
      const value = await cache.getOrFetch(
        options.key,
        options.fetcher,
        {
          ttl: options.ttl,
          force: true,
        }
      );

      options.onUpdate?.(value);
    } catch (error) {
      options.onError?.(error);
    } finally {
      executing = false;
    }
  };

  if (options.immediate !== false) {
    void execute();
  }

  const timer = setInterval(() => {
    void execute();
  }, options.interval);

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}