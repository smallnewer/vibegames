export interface SaveRepository {
  load(): Promise<unknown | undefined>;
  save(encoded: string): Promise<void>;
  preserveCorrupt(payload: unknown, timestamp: number): Promise<void>;
}
