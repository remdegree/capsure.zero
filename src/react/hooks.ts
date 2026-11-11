import {
  useCallback,
  useEffect,
  useState
} from "react";

import type { IndexedDBCache } from "../core/cache";

export interface UseCachedQueryOptions {
  enabled?: boolean;
  ttl?: number;
}

export function useCachedQuery<T>(
  cache: IndexedDBCache,
  key: string,
  fetcher: () => Promise<T>,
  options: UseCachedQueryOptions = {}
) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(
    options.enabled !== false
  );
  const [error, setError] = useState<unknown>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const value = await cache.getOrFetch(
        key,
        fetcher,
        {
          ttl: options.ttl
        }
      );

      setData(value);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [
    cache,
    key,
    fetcher,
    options.ttl
  ]);

  useEffect(() => {
    if (options.enabled === false) {
      return;
    }

    void load();
  }, [load, options.enabled]);

  return {
    data,
    loading,
    error,
    refetch: load
  };
}