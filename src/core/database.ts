import type { CacheEntry, CacheOptions } from "./type";

export class CacheDatabase {
  private db?: IDBDatabase;

  private openingPromise?: Promise<IDBDatabase>;

  private readonly dbName: string;
  private readonly storeName: string;

  constructor(options: CacheOptions = {}) {
    this.dbName = options.dbName ?? "sp-ao-cache";
    this.storeName = options.storeName ?? "test-data";
  }

  private createStore(db: IDBDatabase) {
    if (!db.objectStoreNames.contains(this.storeName)) {
      db.createObjectStore(this.storeName, {
        keyPath: "key",
      });
    }
  }

  private openDatabase(
    version?: number
  ): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request =
        version === undefined
          ? indexedDB.open(this.dbName)
          : indexedDB.open(this.dbName, version);

      request.onupgradeneeded = () => {
        const db = request.result;

        this.createStore(db);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private async open(): Promise<IDBDatabase> {
    if (this.db) {
      if (
        this.db.objectStoreNames.contains(this.storeName)
      ) {
        return this.db;
      }

      // Existing connection does not have our store.
      this.db.close();
      this.db = undefined;
    }

    if (this.openingPromise) {
      return this.openingPromise;
    }

    this.openingPromise = this.initializeDatabase();

    try {
      this.db = await this.openingPromise;
      return this.db;
    } finally {
      this.openingPromise = undefined;
    }
  }

  private async initializeDatabase(): Promise<IDBDatabase> {
    let db: IDBDatabase;

    try {
      /*
       * Open without specifying a version first.
       *
       * This allows us to inspect an existing database
       * regardless of what version it currently has.
       */
      db = await this.openDatabase();
    } catch (error) {
      throw error;
    }

    /*
     * Store already exists.
     */
    if (
      db.objectStoreNames.contains(this.storeName)
    ) {
      this.attachVersionChangeHandler(db);
      return db;
    }

    /*
     * Database exists but our object store is missing.
     *
     * We need to upgrade the database version so
     * onupgradeneeded runs.
     */
    const nextVersion = db.version + 1;

    db.close();

    const upgradedDb =
      await this.openDatabase(nextVersion);

    /*
     * Defensive check.
     */
    if (
      !upgradedDb.objectStoreNames.contains(
        this.storeName
      )
    ) {
      upgradedDb.close();

      throw new Error(
        `Failed to create IndexedDB object store "${this.storeName}".`
      );
    }

    this.attachVersionChangeHandler(upgradedDb);

    return upgradedDb;
  }

  private attachVersionChangeHandler(
    db: IDBDatabase
  ) {
    db.onversionchange = () => {
      db.close();

      if (this.db === db) {
        this.db = undefined;
      }
    };
  }

  async get<T>(
    key: string
  ): Promise<CacheEntry<T> | undefined> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        this.storeName,
        "readonly"
      );

      const store =
        transaction.objectStore(this.storeName);

      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async set<T>(
    entry: CacheEntry<T>
  ): Promise<void> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        this.storeName,
        "readwrite"
      );

      transaction
        .objectStore(this.storeName)
        .put(entry);

      transaction.oncomplete = () => resolve();

      transaction.onerror = () =>
        reject(transaction.error);

      transaction.onabort = () => {
        console.error(
          "[IDB SET ABORT]",
          {
            key: entry.key,
            error: transaction.error,
          }
        );

        reject(transaction.error);
      };
    });
  }

  async delete(key: string): Promise<void> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        this.storeName,
        "readwrite"
      );

      transaction
        .objectStore(this.storeName)
        .delete(key);

      transaction.oncomplete = () => resolve();

      transaction.onerror = () =>
        reject(transaction.error);

      transaction.onabort = () =>
        reject(transaction.error);
    });
  }

  async deleteByPrefix(
    prefix: string
  ): Promise<void> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        this.storeName,
        "readwrite"
      );

      const range = IDBKeyRange.bound(
        prefix,
        prefix + "\uffff",
        false,
        false
      );

      transaction
        .objectStore(this.storeName)
        .delete(range);

      transaction.oncomplete = () => resolve();

      transaction.onerror = () =>
        reject(transaction.error);

      transaction.onabort = () =>
        reject(transaction.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        this.storeName,
        "readwrite"
      );

      transaction
        .objectStore(this.storeName)
        .clear();

      transaction.oncomplete = () => resolve();

      transaction.onerror = () =>
        reject(transaction.error);

      transaction.onabort = () =>
        reject(transaction.error);
    });
  }
}