# Capsure.Zero

### Persistent caching. Zero unnecessary requests.

Capsure.Zero is a lightweight, TypeScript-first persistent caching library built on IndexedDB for modern JavaScript applications.

It provides a simple and reusable API for storing, retrieving, managing, and preloading browser-side data without repeatedly dealing with low-level IndexedDB operations.

With cache-first fetching, TTL-based expiration, request deduplication, and database lifecycle management, Capsure.Zero helps developers build applications with efficient and reliable client-side data caching.

---

## Features

- **Persistent Storage:** Store application data using browser IndexedDB.
- **Simple Cache API:** Get, set, check, remove, and clear cached entries.
- **TTL-Based Expiration:** Configure how long cached entries remain valid.
- **Cache-First Fetching:** Retrieve cached data or fetch and store it when unavailable.
- **Request Deduplication:** Prevent duplicate concurrent fetches for the same cache key.
- **Data Preloading:** Preload multiple resources into the cache.
- **Prefix-Based Invalidation:** Remove related cache entries using key prefixes.
- **Configurable Storage:** Configure database names, object store names, and database versions.
- **Database Lifecycle Management:** Handle concurrent database initialization, missing object stores, and version-change events.
- **React Integration:** Dedicated React entry point for framework integration.
- **TypeScript Support:** Type definitions for a better developer experience.

## Installation

```bash
npm install capsure-zero
```

## Quick Start

### 1. Initialize the cache

```typescript
import { IndexedDBCache } from "capsure-zero";

const cache = new IndexedDBCache({
  dbName: "my-app-cache",
  storeName: "api-data",
  version: 1,
});
```

### 2. Store data

```typescript
await cache.set("user:101", {
  id: 101,
  name: "John",
  email: "john@example.com",
});
```

### 3. Retrieve data

```typescript
const user = await cache.get("user:101");

console.log(user);
```

### 4. Check cached data

```typescript
const exists = await cache.has("user:101");

console.log(exists);
```

## API Reference

### IndexedDBCache

Creates an IndexedDB-backed cache instance.

```typescript
const cache = new IndexedDBCache({
  dbName: "my-app-cache",
  storeName: "api-data",
  version: 1,
});
```

| Option | Type | Description |
|---|---|---|
| `dbName` | `string` | IndexedDB database name |
| `storeName` | `string` | Object store name |
| `version` | `number` | Database version |

### Cache Operations

#### `get(key)`

Retrieves a cached value. Expired or unavailable entries are treated as cache misses.

```typescript
const data = await cache.get("products");
```

#### `set(key, value, options?)`

Stores a value in IndexedDB.

```typescript
await cache.set("products", productList, {
  ttl: 60000,
});
```

TTL is specified in milliseconds.

#### `has(key)`

Checks whether a valid cached entry exists.

```typescript
const exists = await cache.has("products");
```

#### `remove(key)`

Removes a specific cache entry.

```typescript
await cache.remove("products");
```

#### `removeByPrefix(prefix)`

Removes cache entries matching a specified key prefix.

```typescript
await cache.removeByPrefix("user:");
```

Useful for managing related cache entries without manually removing each key.

#### `clear()`

Clears entries from the configured object store.

```typescript
await cache.clear();
```

## Cache-First Fetching

### `getOrFetch(key, fetcher, options?)`

Retrieves data from IndexedDB when a valid cached entry exists. Otherwise, executes the provided fetcher and stores the successfully fetched result.

```typescript
const products = await cache.getOrFetch(
  "products",
  async () => {
    const response = await fetch("/api/products");

    if (!response.ok) {
      throw new Error("Failed to fetch products");
    }

    return response.json();
  },
  {
    ttl: 5 * 60 * 1000,
  }
);
```

**Why use `getOrFetch()`?**

- Avoid unnecessary API requests when valid cached data exists.
- Automatically store successfully fetched results.
- Deduplicate concurrent requests for the same cache key.
- Propagate fetch errors to the caller.

## Data Preloading

Capsure.Zero provides a preload utility for fetching and caching multiple resources.

```typescript
import {
  IndexedDBCache,
  preload,
} from "capsure-zero";

const cache = new IndexedDBCache({
  dbName: "my-app-cache",
  storeName: "reference-data",
  version: 1,
});

const items = [
  {
    key: "test:101",
    fetcher: () => fetchTestData("101"),
    ttl: 60000,
  },
  {
    key: "test:102",
    fetcher: () => fetchTestData("102"),
    ttl: 60000,
  },
];

await preload(cache, items);
```

Preloading is useful when applications need frequently accessed resources or reference data available before users navigate to specific screens.

## React Integration

Capsure.Zero provides a separate React entry point.

```typescript
import { PreloadProvider } from "capsure-zero/react";
```

The React adapter provides integration with React applications for preload-related workflows.

The core caching functionality can be used independently without importing the React adapter.

Refer to the exported React adapter types and implementation for the supported configuration and usage requirements.

## Cache Key Conventions

Using predictable cache keys makes cache management easier.

| Data | Suggested Key |
|---|---|
| User details | `user:101` |
| Product details | `product:101` |
| Product list | `products:list` |
| Test details | `test:101` |
| Location-specific data | `test:101:location:BLR` |
| Application settings | `settings:application` |

For applications supporting multiple users, tenants, or locations, include the appropriate context in cache keys to prevent unintended data reuse.

## Error Handling

Cache and fetch operations are asynchronous. Use `try/catch` to handle errors.

```typescript
try {
  const data = await cache.getOrFetch(
    "products",
    fetchProducts
  );

  console.log(data);
} catch (error) {
  console.error("Unable to retrieve products:", error);
}
```

A failed fetch should be handled by the consuming application. Do not assume a failed network request has produced a valid cached result.

## Testing

Capsure.Zero uses:

- **Vitest** for unit testing.
- **fake-indexeddb** for simulating IndexedDB in tests.

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Build the package:

```bash
npm run build
```

## Browser Compatibility

Capsure.Zero uses the browser's IndexedDB API and is intended for modern browsers that support IndexedDB.

Storage availability, capacity, and persistence are subject to browser policies and storage eviction.

## Contributing

Contributions, bug reports, and feature suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Implement your changes.
4. Add or update tests.
5. Run the test suite.
6. Submit a pull request.

Please include relevant tests when introducing new functionality.

## License

See the [LICENSE](LICENSE) file for licensing information.

---

### Capsure.Zero

**Persistent caching. Zero unnecessary requests.**
