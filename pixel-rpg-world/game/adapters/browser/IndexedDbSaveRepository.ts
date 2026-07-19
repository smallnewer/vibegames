import type { SaveRepository } from "../../save/SaveRepository";

export const SAVE_DATABASE_NAME = "pixel-rpg-world";
export const SAVE_DATABASE_VERSION = 1;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export class IndexedDbSaveRepository implements SaveRepository {
  private databasePromise?: Promise<IDBDatabase>;

  constructor(private readonly factory: IDBFactory = indexedDB) {}

  async load(): Promise<unknown | undefined> {
    const database = await this.database();
    const transaction = database.transaction("saves", "readonly");
    const complete = transactionComplete(transaction);
    const value = await requestResult(transaction.objectStore("saves").get("local"));
    await complete;
    return value;
  }

  async save(encoded: string): Promise<void> {
    const database = await this.database();
    const transaction = database.transaction("saves", "readwrite");
    const complete = transactionComplete(transaction);
    transaction.objectStore("saves").put(encoded, "local");
    await complete;
  }

  async preserveCorrupt(payload: unknown, timestamp: number): Promise<void> {
    const database = await this.database();
    const transaction = database.transaction("corrupt", "readwrite");
    const complete = transactionComplete(transaction);
    transaction.objectStore("corrupt").add({ payload, preservedAt: timestamp });
    await complete;
  }

  private database(): Promise<IDBDatabase> {
    if (!this.databasePromise) {
      this.databasePromise = new Promise((resolve, reject) => {
        const request = this.factory.open(SAVE_DATABASE_NAME, SAVE_DATABASE_VERSION);
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains("saves")) database.createObjectStore("saves");
          if (!database.objectStoreNames.contains("corrupt")) {
            database.createObjectStore("corrupt", { autoIncrement: true });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Could not open save database"));
        request.onblocked = () => reject(new Error("Save database upgrade is blocked"));
      }).catch((error) => {
        this.databasePromise = undefined;
        throw error;
      });
    }
    return this.databasePromise;
  }
}
