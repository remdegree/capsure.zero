import type { IndexedDBCache } from "../core/cache";
import type { BulkPreloadOptions, BulkPreloadResult, PreloadItem } from "../core/type";

export async function preloadMany(
    cache: IndexedDBCache,
    items: PreloadItem[],
    options: BulkPreloadOptions = {}
): Promise<BulkPreloadResult> {
    const concurrency = options.concurrency ?? 5;

    if (!Number.isInteger(concurrency) || concurrency < 1){
        throw new RangeError("Concurrency must be a positive integer.");
    }

    const total = items.length;
    const failures: BulkPreloadResult["failures"] = [];

    let nextIndex = 0;
    let completed = 0;
    let succeeded = 0;
    let failed = 0;
    let cached = 0;
    let aborted = 0;

    const reportProgress = () => {
        options.onProgress?.({
            total,
            completed,
            succeeded,
            failed,
            cached,
            aborted
        });
    };

    const workers = Array.from(
        {length: Math.min(concurrency, total)},
        async () => {
            while(true) {
                if(options.signal?.aborted){
                    break;
                }
                
                const index = nextIndex++;
                if (index >= total) {
                    break;
                }
                
                const item = items[index];
                
                try {
                // Check whether the value is already cached.
                const existing = await cache.get(item.key);

                if (existing !== undefined) {
                    cached++;
                    succeeded++;
                    reportProgress();
                    continue;
                }

                // Don't start a fetch if cancellation occurred
                // while checking the cache.
                if (options.signal?.aborted) {
                    aborted++;
                    reportProgress();
                    continue;
                }

                await cache.getOrFetch(
                    item.key,
                    () => item.fetcher(options.signal),
                    { ttl: item.ttl ?? options.ttl }
                );

                succeeded++;
                } catch (error) {
                failed++;

                failures.push({
                    key: item.key,
                    error,
                });
                } finally {
                // Increment exactly once for every started job.
                completed++;
                reportProgress();
                }
            }
        }
    );

    await Promise.all(workers);

    // Account for jobs that were never started after cancellation.
    if (options.signal?.aborted) {
        aborted += total - completed;
        completed = total;
        reportProgress();
    }

    return {
        total,
        completed,
        succeeded,
        failed,
        cached,
        aborted,
        failures,
        complete:
        failed === 0 &&
        aborted === 0 &&
        completed === total,
    };
}