import { describe, expect, it } from "vitest";
import { IndexedDbSaveRepository } from "../../../game/adapters/browser/IndexedDbSaveRepository";
import { MemorySaveRepository } from "../../../game/adapters/browser/MemorySaveRepository";

class FakeIndexedDb {
  readonly stores = new Map<string, Map<IDBValidKey, unknown>>();
  failNextPut = false;
  private corruptKey = 0;

  readonly factory = {
    open: () => {
      const request: Record<string, unknown> = {};
      const database = {
        objectStoreNames: { contains: (name: string) => this.stores.has(name) },
        createObjectStore: (name: string) => {
          this.stores.set(name, new Map());
          return {};
        },
        transaction: (name: string) => this.transaction(name),
      };
      request.result = database;
      queueMicrotask(() => {
        (request.onupgradeneeded as (() => void) | undefined)?.();
        (request.onsuccess as (() => void) | undefined)?.();
      });
      return request;
    },
  } as unknown as IDBFactory;

  private transaction(name: string): IDBTransaction {
    const transaction: Record<string, unknown> = {
      error: null,
      objectStore: () => ({
        get: (key: IDBValidKey) => this.request(() => this.stores.get(name)?.get(key), transaction),
        put: (value: unknown, key: IDBValidKey) => this.request(() => {
          if (this.failNextPut) {
            this.failNextPut = false;
            throw new Error("injected transaction failure");
          }
          this.stores.get(name)!.set(key, value);
          return key;
        }, transaction),
        add: (value: unknown) => this.request(() => {
          const key = ++this.corruptKey;
          this.stores.get(name)!.set(key, value);
          return key;
        }, transaction),
      }),
    };
    return transaction as unknown as IDBTransaction;
  }

  private request<T>(operation: () => T, transaction: Record<string, unknown>): IDBRequest<T> {
    const request: Record<string, unknown> = { error: null };
    queueMicrotask(() => {
      try {
        request.result = operation();
        (request.onsuccess as (() => void) | undefined)?.();
        queueMicrotask(() => (transaction.oncomplete as (() => void) | undefined)?.());
      } catch (error) {
        request.error = error;
        transaction.error = error;
        (request.onerror as (() => void) | undefined)?.();
        queueMicrotask(() => (transaction.onabort as (() => void) | undefined)?.());
      }
    });
    return request as unknown as IDBRequest<T>;
  }
}

describe("save repositories", () => {
  it("has identical missing and put/get semantics in memory", async () => {
    const repository = new MemorySaveRepository();
    await expect(repository.load()).resolves.toBeUndefined();
    await repository.save("first");
    await expect(repository.load()).resolves.toBe("first");
    await repository.preserveCorrupt("broken", 10);
    expect(repository.corruptEntries().get("corrupt:10")).toBe("broken");
  });

  it("creates stores, atomically replaces local and preserves corrupt payloads", async () => {
    const fake = new FakeIndexedDb();
    const repository = new IndexedDbSaveRepository(fake.factory);
    await expect(repository.load()).resolves.toBeUndefined();
    await repository.save("first");
    await repository.save("second");
    await expect(repository.load()).resolves.toBe("second");
    await repository.preserveCorrupt("broken", 22);
    expect([...fake.stores.get("corrupt")!.values()]).toContainEqual({
      payload: "broken",
      preservedAt: 22,
    });
  });

  it("leaves the old save readable when a replacement transaction fails", async () => {
    const fake = new FakeIndexedDb();
    const repository = new IndexedDbSaveRepository(fake.factory);
    await repository.save("old");
    fake.failNextPut = true;
    await expect(repository.save("new")).rejects.toThrow(/transaction|injected/i);
    await expect(repository.load()).resolves.toBe("old");
  });
});
