import type { IndexedDBCache } from "../core/cache";
import type { PreloadItem } from "../core/type";

export async function preload(
  cache: IndexedDBCache,
  items: PreloadItem[]
): Promise<void> {
  await Promise.all(
    items.map((item) =>
      cache.getOrFetch(
        item.key,
        item.fetcher,
        {
          ttl: item.ttl
        }
      )
    )
  );
}