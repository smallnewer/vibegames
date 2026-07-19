import type { SaveRepository } from "../../save/SaveRepository";

export class MemorySaveRepository implements SaveRepository {
  private payload?: string;
  private readonly corruptPayloads = new Map<string, unknown>();
  failNextSave = false;

  async load(): Promise<unknown | undefined> {
    return this.payload;
  }

  async save(encoded: string): Promise<void> {
    if (this.failNextSave) {
      this.failNextSave = false;
      throw new Error("injected save failure");
    }
    this.payload = encoded;
  }

  async preserveCorrupt(payload: unknown, timestamp: number): Promise<void> {
    this.corruptPayloads.set(`corrupt:${timestamp}`, payload);
  }

  corruptEntries(): ReadonlyMap<string, unknown> {
    return new Map(this.corruptPayloads);
  }
}
