import "fake-indexeddb/auto";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { CacheDatabase } from "../src/core/database";

const DB_NAME = "idb-cache-database-test";

const STORE_NAME = "test-data";

function deleteDatabase(
  name: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);

    request.onsuccess = () => resolve();

    request.onerror = () => {
      reject(request.error);
    };
  });
}

function openRawDatabase(
  name: string,
  version?: number
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request =
      version === undefined
        ? indexedDB.open(name)
        : indexedDB.open(name, version);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

function createDatabaseWithoutStore(
  name: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);

    request.onupgradeneeded = () => {
      // Intentionally do NOT create test-data.
    };

    request.onsuccess = () => {
      request.result.close();
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

function createDatabaseWithStore(
  name: string,
  storeName: string,
  version = 1
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, {
          keyPath: "key",
        });
      }
    };

    request.onsuccess = () => {
      request.result.close();
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

describe("CacheDatabase", () => {
  beforeEach(async () => {
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    await deleteDatabase(DB_NAME);
  });

    it("creates a new database and object store", async () => {
        const db = new CacheDatabase({
        dbName: DB_NAME,
        storeName: STORE_NAME,
        version: 1,
        });

        await db.set({
        key: "test-1",
        value: {
            name: "Test",
        },
        createdAt: Date.now(),
        expiresAt: null,
        });

        const result = await db.get("test-1");

        expect(result).toEqual(
        expect.objectContaining({
            key: "test-1",
            value: {
            name: "Test",
            },
        })
        );

        const rawDb = await openRawDatabase(DB_NAME);

        expect(
        rawDb.objectStoreNames.contains(STORE_NAME)
        ).toBe(true);

        rawDb.close();
    });

    it("works when database and store already exist", async () => {
        await createDatabaseWithStore(
        DB_NAME,
        STORE_NAME
        );

        const db = new CacheDatabase({
        dbName: DB_NAME,
        storeName: STORE_NAME,
        version: 1,
        });

        await db.set({
        key: "existing",
        value: "hello",
        createdAt: Date.now(),
        expiresAt: null,
        });

        const result = await db.get("existing");

        expect(result?.value).toBe("hello");
    });

    it("creates the missing object store when database already exists", async () => {
        await createDatabaseWithoutStore(DB_NAME);

        const db = new CacheDatabase({
        dbName: DB_NAME,
        storeName: STORE_NAME,
        version: 1,
        });

        await db.set({
        key: "recovered",
        value: "works",
        createdAt: Date.now(),
        expiresAt: null,
        });

        const result = await db.get("recovered");

        expect(result?.value).toBe("works");

        const rawDb = await openRawDatabase(DB_NAME);

        expect(
        rawDb.objectStoreNames.contains(STORE_NAME)
        ).toBe(true);

        expect(rawDb.version).toBe(2);

        rawDb.close();
    });

    it("works when the existing database has a higher version", async () => {
        await createDatabaseWithStore(
        DB_NAME,
        STORE_NAME,
        3
        );

        const oldApplicationDb = new CacheDatabase({
        dbName: DB_NAME,
        storeName: STORE_NAME,
        version: 1,
        });

        await oldApplicationDb.set({
        key: "old-app",
        value: "still works",
        createdAt: Date.now(),
        expiresAt: null,
        });

        const result =
        await oldApplicationDb.get("old-app");

        expect(result?.value).toBe("still works");
    });

    it("handles concurrent first access", async () => {
        const db = new CacheDatabase({
        dbName: DB_NAME,
        storeName: STORE_NAME,
        version: 1,
        });

        const now = Date.now();

        await Promise.all([
        db.set({
            key: "1",
            value: "one",
            createdAt: now,
            expiresAt: null,
        }),

        db.set({
            key: "2",
            value: "two",
            createdAt: now,
            expiresAt: null,
        }),

        db.set({
            key: "3",
            value: "three",
            createdAt: now,
            expiresAt: null,
        }),

        db.set({
            key: "4",
            value: "four",
            createdAt: now,
            expiresAt: null,
        }),

        db.set({
            key: "5",
            value: "five",
            createdAt: now,
            expiresAt: null,
        }),
        ]);

        const results = await Promise.all([
        db.get("1"),
        db.get("2"),
        db.get("3"),
        db.get("4"),
        db.get("5"),
        ]);

        expect(results.map((x) => x?.value)).toEqual([
        "one",
        "two",
        "three",
        "four",
        "five",
        ]);
    });

    it("supports get, set and delete", async () => {
        const db = new CacheDatabase({
        dbName: DB_NAME,
        storeName: STORE_NAME,
        version: 1,
        });

        await db.set({
        key: "delete-me",
        value: "hello",
        createdAt: Date.now(),
        expiresAt: null,
        });

        expect(
        await db.get("delete-me")
        ).toEqual(
        expect.objectContaining({
            value: "hello",
        })
        );

        await db.delete("delete-me");

        expect(
        await db.get("delete-me")
        ).toBeUndefined();
    });

    it("deletes entries by prefix", async () => {
        const db = new CacheDatabase({
        dbName: DB_NAME,
        storeName: STORE_NAME,
        version: 1,
        });

        const now = Date.now();

        await Promise.all([
        db.set({
            key: "test:A",
            value: "A",
            createdAt: now,
            expiresAt: null,
        }),

        db.set({
            key: "test:B",
            value: "B",
            createdAt: now,
            expiresAt: null,
        }),

        db.set({
            key: "other:C",
            value: "C",
            createdAt: now,
            expiresAt: null,
        }),
        ]);

        await db.deleteByPrefix("test:");

        expect(
        await db.get("test:A")
        ).toBeUndefined();

        expect(
        await db.get("test:B")
        ).toBeUndefined();

        expect(
        await db.get("other:C")
        ).toEqual(
        expect.objectContaining({
            value: "C",
        })
        );
    });

    it("clears the object store", async () => {
        const db = new CacheDatabase({
        dbName: DB_NAME,
        storeName: STORE_NAME,
        version: 1,
        });

        const now = Date.now();

        await db.set({
        key: "A",
        value: "A",
        createdAt: now,
        expiresAt: null,
        });

        await db.set({
        key: "B",
        value: "B",
        createdAt: now,
        expiresAt: null,
        });

        await db.clear();

        expect(
        await db.get("A")
        ).toBeUndefined();

        expect(
        await db.get("B")
        ).toBeUndefined();
    });

    it("recovers after the database is deleted externally", async () => {
        const db = new CacheDatabase({
        dbName: DB_NAME,
        storeName: STORE_NAME,
        version: 1,
        });

        await db.set({
        key: "before-delete",
        value: "old",
        createdAt: Date.now(),
        expiresAt: null,
        });

        expect(
        await db.get("before-delete")
        ).toBeDefined();

        /*
        * Delete the database externally.
        *
        * CacheDatabase's onversionchange handler
        * should close its existing connection.
        */
        await deleteDatabase(DB_NAME);

        /*
        * The next operation should recreate the DB
        * and object store automatically.
        */
        await db.set({
        key: "after-delete",
        value: "new",
        createdAt: Date.now(),
        expiresAt: null,
        });

        const result =
        await db.get("after-delete");

        expect(result?.value).toBe("new");
    });

    it("supports multiple CacheDatabase instances using the same database", async () => {
        const db1 = new CacheDatabase({
        dbName: DB_NAME,
        storeName: STORE_NAME,
        version: 1,
        });

        const db2 = new CacheDatabase({
        dbName: DB_NAME,
        storeName: STORE_NAME,
        version: 1,
        });

        await db1.set({
        key: "shared",
        value: "hello",
        createdAt: Date.now(),
        expiresAt: null,
        });

        const result = await db2.get("shared");

        expect(result?.value).toBe("hello");
    });

    it("supports different object stores in the same database", async () => {
        const testDb = new CacheDatabase({
        dbName: DB_NAME,
        storeName: "test-data",
        version: 1,
        });

        await testDb.set({
        key: "test",
        value: "test-value",
        createdAt: Date.now(),
        expiresAt: null,
        });

        const metadataDb = new CacheDatabase({
        dbName: DB_NAME,
        storeName: "metadata",
        version: 2,
        });

        await metadataDb.set({
        key: "meta",
        value: "meta-value",
        createdAt: Date.now(),
        expiresAt: null,
        });

        expect(
        await testDb.get("test")
        ).toEqual(
        expect.objectContaining({
            value: "test-value",
        })
        );

        expect(
        await metadataDb.get("meta")
        ).toEqual(
        expect.objectContaining({
            value: "meta-value",
        })
        );
    });

    it("recovers a missing store under concurrent access", async () => {
    await createDatabaseWithoutStore(DB_NAME);

    const db = new CacheDatabase({
        dbName: DB_NAME,
        storeName: STORE_NAME,
        version: 1,
    });

    const now = Date.now();

    await Promise.all([
        db.set({
        key: "1",
        value: "one",
        createdAt: now,
        expiresAt: null,
        }),

        db.set({
        key: "2",
        value: "two",
        createdAt: now,
        expiresAt: null,
        }),

        db.set({
        key: "3",
        value: "three",
        createdAt: now,
        expiresAt: null,
        }),

        db.set({
        key: "4",
        value: "four",
        createdAt: now,
        expiresAt: null,
        }),

        db.set({
        key: "5",
        value: "five",
        createdAt: now,
        expiresAt: null,
        }),
    ]);

    const values = await Promise.all([
        db.get("1"),
        db.get("2"),
        db.get("3"),
        db.get("4"),
        db.get("5"),
    ]);

    expect(values.map((x) => x?.value)).toEqual([
        "one",
        "two",
        "three",
        "four",
        "five",
    ]);
    });
});